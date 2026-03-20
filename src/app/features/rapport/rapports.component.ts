// rapports.component.ts
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { DividerModule } from 'primeng/divider';
import { SelectModule } from 'primeng/select';
import { SkeletonModule } from 'primeng/skeleton';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';

import { AlerteStockResponse, ConsommationMateriauResponse, RapportConsommationResponse, ReportControllerService } from '@/app/modules/openapi';

interface ValeurStockReportResponse {
    valeurTotale: number;
    materiauSansCout: number;
    totalMateriaux: number;
}

interface MouvementExportResponse {
    id: number;
    materiauNom: string;
    materiauUnite: string;
    typeMouvement: string;
    quantite: number;
    quantiteRestante: number;
    coutUnitaireSnapshot: number | null;
    referenceType: string;
    referenceId: string;
    createdAt: string;
}

@Component({
    selector: 'app-rapports',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, FormsModule, TableModule, ButtonModule, TagModule, TooltipModule, ToastModule, SkeletonModule, DatePickerModule, SelectModule, DividerModule],
    providers: [MessageService],
    templateUrl: './rapports.component.html'
})
export class RapportsComponent implements OnInit {
    dateDebut: Date = this.defaultDebut();
    dateFin: Date = new Date();

    periodeOptions = [
        { label: '7 derniers jours', value: 7 },
        { label: '30 derniers jours', value: 30 },
        { label: '3 derniers mois', value: 90 },
        { label: 'Mois en cours', value: 0 }
    ];
    periodeSelectionnee = 30;

    loadingValeur = false;
    loadingConso = false;
    loadingMouvements = false;
    loadingAlertes = false;

    valeurStock: ValeurStockReportResponse | null = null;
    consommation: RapportConsommationResponse | null = null;
    mouvements: MouvementExportResponse[] = [];
    alertes: AlerteStockResponse[] = [];

    constructor(
        private reportService: ReportControllerService,
        private messageService: MessageService,
        private cdr: ChangeDetectorRef
    ) {}

    ngOnInit(): void {
        this.loadAll();
    }

    // ─── Période ───────────────────────────────────────────────

    onPeriodeChange(): void {
        const now = new Date();
        if (this.periodeSelectionnee === 0) {
            this.dateDebut = new Date(now.getFullYear(), now.getMonth(), 1);
        } else {
            this.dateDebut = new Date(now);
            this.dateDebut.setDate(now.getDate() - this.periodeSelectionnee);
        }
        this.dateFin = now;
        this.loadAll();
    }

    onDatesChange(): void {
        if (this.dateDebut && this.dateFin) this.loadAll();
    }

    private defaultDebut(): Date {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        return d;
    }

    // ─── Chargements ───────────────────────────────────────────

    loadAll(): void {
        this.loadValeurStock();
        this.loadConsommation();
        this.loadMouvements();
        this.loadAlertes();
    }

    loadValeurStock(): void {
        this.loadingValeur = true;
        this.reportService.valeurStock().subscribe({
            next: (d: any) => {
                this.valeurStock = d;
                this.loadingValeur = false;
                this.cdr.markForCheck();
            },
            error: () => {
                this.loadingValeur = false;
                this.cdr.markForCheck();
            }
        });
    }

    loadConsommation(): void {
        this.loadingConso = true;
        this.reportService.consommation(this.dateDebut.toISOString() as any, this.dateFin.toISOString() as any).subscribe({
            next: (d) => {
                this.consommation = d;
                this.loadingConso = false;
                this.cdr.markForCheck();
            },
            error: () => {
                this.loadingConso = false;
                this.cdr.markForCheck();
            }
        });
    }

    loadMouvements(): void {
        this.loadingMouvements = true;
        this.reportService.mouvements(this.dateDebut.toISOString() as any, this.dateFin.toISOString() as any).subscribe({
            next: (d: any) => {
                this.mouvements = d;
                this.loadingMouvements = false;
                this.cdr.markForCheck();
            },
            error: () => {
                this.loadingMouvements = false;
                this.cdr.markForCheck();
            }
        });
    }

    loadAlertes(): void {
        this.loadingAlertes = true;
        this.reportService.alertesAlerteStockResponse().subscribe({
            next: (d) => {
                this.alertes = d;
                this.loadingAlertes = false;
                this.cdr.markForCheck();
            },
            error: () => {
                this.loadingAlertes = false;
                this.cdr.markForCheck();
            }
        });
    }

    // ─── Getters valeur stock ──────────────────────────────────

    get valeurTotale(): number {
        return Number(this.valeurStock?.valeurTotale ?? 0);
    }

    get totalMateriaux(): number {
        return this.valeurStock?.totalMateriaux ?? 0;
    }

    get materiauSansCout(): number {
        return this.valeurStock?.materiauSansCout ?? 0;
    }

    // ─── Getters consommation ──────────────────────────────────

    get consoItems(): ConsommationMateriauResponse[] {
        return this.consommation?.materiaux ?? [];
    }

    get coutTotalConso(): number {
        return Number(this.consommation?.coutTotalPeriode ?? 0);
    }

    // ─── Getters mouvements ────────────────────────────────────

    get totalEntrees(): number {
        return this.mouvements.filter((m) => !this.isSortie(m.typeMouvement)).reduce((s, m) => s + Number(m.quantite ?? 0), 0);
    }

    get totalSorties(): number {
        return this.mouvements.filter((m) => this.isSortie(m.typeMouvement)).reduce((s, m) => s + Number(m.quantite ?? 0), 0);
    }

    get soldeNet(): number {
        return this.totalEntrees - this.totalSorties;
    }

    private isSortie(type: string): boolean {
        const t = type?.toLowerCase() ?? '';
        return t.includes('sortie') || t.includes('negatif') || t.includes('production');
    }

    // ─── Getters alertes ───────────────────────────────────────

    get nbAlertes(): number {
        return this.alertes.length;
    }

    get nbAlertesCritiques(): number {
        return this.alertes.filter((a) => Number(a.manqueMax ?? 0) > 5).length;
    }

    get totalManque(): number {
        return this.alertes.reduce((s, a) => s + Number(a.manqueMax ?? 0), 0);
    }

    // ─── Helpers affichage ─────────────────────────────────────

    getTypeMouvSeverity(type: string): 'success' | 'danger' | 'warn' | 'info' | 'secondary' {
        const t = type?.toLowerCase() ?? '';
        if (t.includes('entree') || t.includes('positif')) return 'success';
        if (t.includes('sortie') || t.includes('negatif')) return 'danger';
        if (t.includes('production')) return 'warn';
        return 'secondary';
    }

    getTypeMouvLabel(type: string): string {
        const labels: Record<string, string> = {
            entree_achat: 'Entrée achat',
            entree_ajustement: 'Ajust. +',
            sortie_production: 'Production',
            sortie_ajustement: 'Ajust. -',
            sortie_perte: 'Perte'
        };
        return labels[type] ?? type;
    }

    exportCsv(type: string): void {
        this.messageService.add({
            severity: 'info',
            summary: 'Export',
            detail: `Export ${type} en cours de développement`
        });
    }
}
