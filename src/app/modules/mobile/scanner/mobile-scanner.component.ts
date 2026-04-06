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

// QR code format: makerstockmaterial:{materiauId}
const QR_PREFIX = 'makerstockmaterial:';

/**
 * Stratégie de scan :
 *  1. Natif Android/iOS → @capacitor-mlkit/barcode-scanning (importé dynamiquement)
 *  2. Web Chrome/Edge   → BarcodeDetector natif (API expérimentale)
 *  3. Fallback universel→ saisie manuelle de l'ID
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
    manualId = '';
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
        // Détecte si on est dans Capacitor (Android/iOS)
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

            // Demande de permission
            const { camera } = await BarcodeScanner.requestPermissions();
            if (camera !== 'granted' && camera !== 'limited') {
                this.cameraError = 'Permission caméra refusée.';
                this.scanning = false;
                this.cdr.markForCheck();
                return;
            }

            const { barcodes } = await BarcodeScanner.scan({ formats: [BarcodeFormat.QrCode] });

            this.scanning = false;
            this.cdr.markForCheck();

            if (barcodes.length > 0) {
                this.handleRawValue(barcodes[0].rawValue);
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

            this.barcodeDetector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });

            this.scanInterval = setInterval(async () => {
                if (!this.videoEl || !this.scanning) return;
                try {
                    const barcodes = await this.barcodeDetector.detect(this.videoEl);
                    if (barcodes.length > 0) {
                        this.stopWebCamera();
                        this.handleRawValue(barcodes[0].rawValue ?? '');
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
            // Le scan natif est modal, rien à arrêter manuellement
            this.scanning = false;
            this.cdr.markForCheck();
        } else {
            this.stopWebCamera();
        }
    }

    // ─── Traitement commun ───────────────────────────────────────────────────

    handleRawValue(raw: string): void {
        if (!raw.startsWith(QR_PREFIX)) {
            this.messageService.add({ severity: 'warn', summary: 'QR invalide', detail: `Format attendu : ${QR_PREFIX}{id}` });
            this.cdr.markForCheck();
            return;
        }
        const id = parseInt(raw.replace(QR_PREFIX, ''), 10);
        if (isNaN(id)) {
            this.messageService.add({ severity: 'error', summary: 'QR invalide', detail: 'ID matière non reconnu' });
            this.cdr.markForCheck();
            return;
        }
        this.fetchMateriau(id);
    }

    submitManualId(): void {
        const id = parseInt(this.manualId, 10);
        if (isNaN(id) || id <= 0) {
            this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'ID invalide' });
            return;
        }
        this.showManualInput = false;
        this.fetchMateriau(id);
    }

    private fetchMateriau(id: number): void {
        this.loadingMateriau = true;
        this.cdr.markForCheck();
        this.materiauService.detailMateriau(id).subscribe({
            next: (m) => {
                this.scannedMateriau = m;
                this.showResult = true;
                this.loadingMateriau = false;
                this.cdr.markForCheck();
            },
            error: () => {
                this.messageService.add({ severity: 'error', summary: 'Erreur', detail: `Matière #${id} introuvable` });
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
