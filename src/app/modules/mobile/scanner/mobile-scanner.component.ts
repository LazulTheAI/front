import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { MateriauControllerService, MateriauResponse } from '@/app/modules/openapi';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { DividerModule } from 'primeng/divider';
import { InputTextModule } from 'primeng/inputtext';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';

// Formats codes-barres natifs (Capacitor MLKit)
const NATIVE_BARCODE_FORMATS = ['Code128', 'Code39', 'Code93', 'Ean13', 'Ean8', 'UpcA', 'UpcE', 'Itf', 'Codabar'];

// Formats codes-barres web (BarcodeDetector API)
const WEB_BARCODE_FORMATS = ['code-128', 'code-39', 'ean-13', 'ean-8', 'upc-a', 'upc-e', 'itf', 'codabar'];

/**
 * Stratégie de scan :
 *  1. Natif Android/iOS → @capacitor-mlkit/barcode-scanning (importé dynamiquement)
 *  2. Web Chrome/Edge   → BarcodeDetector natif (API expérimentale)
 *  3. Fallback universel→ saisie manuelle du SKU
 *
 * La valeur scannée est traitée comme un SKU : on recherche la matière correspondante.
 */
@Component({
    selector: 'app-mobile-scanner',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, FormsModule, ButtonModule, InputTextModule, DialogModule, TagModule, DividerModule, ProgressSpinnerModule, ToastModule],
    providers: [MessageService],
    templateUrl: './mobile-scanner.component.html',
    styleUrl: './mobile-scanner.component.scss'
})
export class MobileScannerComponent implements OnInit, OnDestroy {
    isNative = false;           // Capacitor Android/iOS
    isBarcodeDetector = false;  // Chrome web API
    scanning = false;
    loadingMateriau = false;
    showManualInput = false;
    manualSku = '';
    cameraError = '';

    scannedMateriau: MateriauResponse | null = null;
    showResult = false;

    // Web camera refs (non-native only)
    private videoEl: HTMLVideoElement | null = null;
    private stream: MediaStream | null = null;
    private barcodeDetector: any = null;
    private scanInterval: any = null;

    constructor(
        private materiauService: MateriauControllerService,
        private messageService: MessageService,
        private router: Router,
        private cdr: ChangeDetectorRef
    ) {}

    ngOnInit(): void {
        this.detectCapabilities();
    }

    ngOnDestroy(): void {
        this.stopWebCamera();
    }

    private async detectCapabilities(): Promise<void> {
        try {
            const { Capacitor } = await import('@capacitor/core');
            this.isNative = Capacitor.isNativePlatform();
        } catch {
            this.isNative = false;
        }

        if (!this.isNative) {
            this.isBarcodeDetector = typeof (window as any).BarcodeDetector !== 'undefined';
        }

        this.cdr.markForCheck();
    }

    get canScan(): boolean {
        return this.isNative || this.isBarcodeDetector;
    }

    // ─── Scan natif (Capacitor MLKit) ────────────────────────────────────────

    async startNativeScan(): Promise<void> {
        this.cameraError = '';
        this.scanning = true;
        this.cdr.markForCheck();

        try {
            const { BarcodeScanner, BarcodeFormat } = await import('@capacitor-mlkit/barcode-scanning');

            const { camera } = await BarcodeScanner.requestPermissions();
            if (camera !== 'granted' && camera !== 'limited') {
                this.cameraError = 'Permission caméra refusée.';
                this.scanning = false;
                this.cdr.markForCheck();
                return;
            }

            // Scan tous les formats codes-barres standard (pas QR)
            const formats = NATIVE_BARCODE_FORMATS
                .map((f) => (BarcodeFormat as any)[f])
                .filter(Boolean);

            const { barcodes } = await BarcodeScanner.scan({ formats });

            this.scanning = false;
            this.cdr.markForCheck();

            if (barcodes.length > 0) {
                this.handleScannedSku(barcodes[0].rawValue);
            }
        } catch (err: any) {
            this.cameraError = err?.message ?? 'Erreur lors du scan.';
            this.scanning = false;
            this.cdr.markForCheck();
        }
    }

    // ─── Scan web (BarcodeDetector) ──────────────────────────────────────────

    async startWebScan(): Promise<void> {
        this.cameraError = '';
        this.scanning = true;
        this.cdr.markForCheck();

        try {
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
            });

            this.videoEl = document.createElement('video');
            this.videoEl.srcObject = this.stream;
            this.videoEl.setAttribute('playsinline', 'true');
            this.videoEl.muted = true;
            await this.videoEl.play();

            this.barcodeDetector = new (window as any).BarcodeDetector({ formats: WEB_BARCODE_FORMATS });

            this.scanInterval = setInterval(async () => {
                if (!this.videoEl || !this.scanning) return;
                try {
                    const barcodes = await this.barcodeDetector.detect(this.videoEl);
                    if (barcodes.length > 0) {
                        this.stopWebCamera();
                        this.handleScannedSku(barcodes[0].rawValue ?? '');
                    }
                } catch { /* frame error, ignore */ }
            }, 300);
        } catch {
            this.cameraError = 'Impossible d\'accéder à la caméra. Vérifiez les permissions.';
            this.scanning = false;
            this.cdr.markForCheck();
        }
    }

    stopWebCamera(): void {
        if (this.scanInterval) { clearInterval(this.scanInterval); this.scanInterval = null; }
        if (this.stream) { this.stream.getTracks().forEach((t) => t.stop()); this.stream = null; }
        if (this.videoEl) { this.videoEl.srcObject = null; this.videoEl = null; }
        this.scanning = false;
        this.cdr.markForCheck();
    }

    startScan(): void {
        if (this.isNative) {
            this.startNativeScan();
        } else {
            this.startWebScan();
        }
    }

    stopScan(): void {
        if (this.isNative) {
            this.scanning = false;
            this.cdr.markForCheck();
        } else {
            this.stopWebCamera();
        }
    }

    // ─── Traitement commun ───────────────────────────────────────────────────

    handleScannedSku(sku: string): void {
        const cleaned = sku.trim();
        if (!cleaned) {
            this.messageService.add({ severity: 'warn', summary: 'Code-barre vide', detail: 'Aucune valeur lue' });
            this.cdr.markForCheck();
            return;
        }
        this.fetchMateriauBySku(cleaned);
    }

    submitManualSku(): void {
        const sku = this.manualSku.trim();
        if (!sku) {
            this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'SKU invalide' });
            return;
        }
        this.showManualInput = false;
        this.fetchMateriauBySku(sku);
    }

    private fetchMateriauBySku(sku: string): void {
        this.loadingMateriau = true;
        this.cdr.markForCheck();

        // Recherche par SKU exact : on filtre le premier résultat dont le sku correspond
        this.materiauService.listerMateriau(false, 0, 50, undefined, undefined, sku).subscribe({
            next: (data: any) => {
                const results: MateriauResponse[] = data.content ?? [];
                const found = results.find((m) => m.sku === sku) ?? results[0];
                if (found) {
                    this.scannedMateriau = found;
                    this.showResult = true;
                } else {
                    this.messageService.add({ severity: 'warn', summary: 'Introuvable', detail: `Aucune matière avec le SKU « ${sku} »` });
                }
                this.loadingMateriau = false;
                this.cdr.markForCheck();
            },
            error: () => {
                this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de rechercher la matière' });
                this.loadingMateriau = false;
                this.cdr.markForCheck();
            }
        });
    }

    goAjustement(): void {
        this.showResult = false;
        this.router.navigate(['/mobile/ajustement'], { queryParams: { materiauId: this.scannedMateriau?.id } });
    }

    goReception(): void {
        this.showResult = false;
        this.router.navigate(['/mobile/reception'], { queryParams: { materiauId: this.scannedMateriau?.id } });
    }

    goFabrication(): void {
        this.showResult = false;
        this.router.navigate(['/mobile/fabrication']);
    }

    closeResult(): void {
        this.showResult = false;
        this.scannedMateriau = null;
        this.cdr.markForCheck();
    }

    getStatut(m: MateriauResponse): 'OK' | 'ALERTE' | 'RUPTURE' {
        if ((m.stockTotal ?? 0) <= 0) return 'RUPTURE';
        if (m.enAlerte) return 'ALERTE';
        return 'OK';
    }

    getSeverity(m: MateriauResponse): 'success' | 'warn' | 'danger' {
        const s = this.getStatut(m);
        if (s === 'RUPTURE') return 'danger';
        if (s === 'ALERTE') return 'warn';
        return 'success';
    }
}
