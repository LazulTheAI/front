import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, WritableSignal } from '@angular/core';
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

import { APP_CURRENCY } from '@/app/core/currency.config';
import { LayoutConfig } from '@/app/layout/service/layout.service';
import { AlerteControllerService, AlerteResponse, ConsommationMateriauResponse, RapportConsommationResponse, ReportControllerService } from '@/app/modules/openapi';
import { UpgradeBannerComponent } from '@/app/shared/plan-gating.components';
import { RequiresFeatureDirective } from '@/app/shared/requires-plan.directive';
import { environment } from '@/environments/environment';
import { HttpClient } from '@angular/common/http';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { ChartModule } from 'primeng/chart';
import { ToolbarModule } from 'primeng/toolbar';

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
    imports: [
        CommonModule,
        ChartModule,
        FormsModule,
        TableModule,
        ButtonModule,
        TagModule,
        ToolbarModule,
        TooltipModule,
        ToastModule,
        SkeletonModule,
        DatePickerModule,
        SelectModule,
        DividerModule,
        TranslocoModule,
        RequiresFeatureDirective,
        UpgradeBannerComponent
    ],
    providers: [MessageService],
    templateUrl: './rapports.component.html',
    styles: `
        :host ::ng-deep .p-toolbar {
            .p-toolbar-start {
                flex: 1;
                width: 100%;
            }
        }
    `
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
    protected readonly appCurrency = APP_CURRENCY;
    loadingConso = false;
    loadingMouvements = false;
    loadingAlertes = false;

    loadingRapportFinancier = false;
    loadingProjection = false;

    valeurStock: ValeurStockReportResponse | null = null;
    consommation: RapportConsommationResponse | null = null;
    mouvements: MouvementExportResponse[] = [];
    alertes: AlerteResponse[] = [];
    totalAlertes = 0;
    rangeDates: Date[] = [this.defaultDebut(), new Date()];

    constructor(
        private reportService: ReportControllerService,
        private alerteService: AlerteControllerService,
        private messageService: MessageService,
        private cdr: ChangeDetectorRef,
        private http: HttpClient,
        private transloco: TranslocoService
    ) {}

    ngOnInit(): void {
        this.loadAll();
    }

    get isRangePersonnalisee(): boolean {
        return this.periodeSelectionnee === null;
    }

    loadingVentes = false;
    ventesData: any = null;
    ventesChartData: any = null;
    ventesChartOptions: any = null;
    caTotalVentes = 0;

    private readonly PLATFORM_COLORS: Record<string, string> = {
        BC: '--p-indigo-500',
        SHOPIFY: '--p-teal-500',
        B2B_MANUEL: '--p-orange-500',
        DIRECT: '--p-purple-500'
    };

    private readonly PLATFORM_LABELS: Record<string, string> = {
        BC: 'BigCommerce',
        SHOPIFY: 'Shopify',
        B2B_MANUEL: 'B2B Manuel',
        DIRECT: 'Direct'
    };

    onPeriodeChange(): void {
        // Reset la plage custom quand on choisit une période prédéfinie
        if (this.periodeSelectionnee !== null) {
            const now = new Date();
            const debut = new Date();
            if (this.periodeSelectionnee === 0) {
                debut.setDate(1);
            } else {
                debut.setDate(now.getDate() - this.periodeSelectionnee);
            }
            this.rangeDates = [debut, now];
        }
        this.loadAll();
    }

    onRangeChange(): void {
        if (this.rangeDates[0] && this.rangeDates[1]) {
            // Désactive la période prédéfinie quand on choisit une plage custom
            this.periodeSelectionnee = null;
            this.loadAll();
        }
    }

    telechargerRapportFinancier(): void {
        this.loadingRapportFinancier = true;
        const lang = navigator.language?.split('-')[0] ?? 'fr';
        this.http
            .get(`${environment.baseUrl}/api/rapport-financier/pdf?lang=${lang}`, {
                responseType: 'blob'
            })
            .subscribe({
                next: (blob) => {
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `rapport-financier.pdf`;
                    a.click();
                    URL.revokeObjectURL(url);
                    this.loadingRapportFinancier = false;
                    this.cdr.markForCheck();
                },
                error: () => {
                    this.messageService.add({
                        severity: 'error',
                        summary: this.transloco.translate('common.error'),
                        detail: this.transloco.translate('rapports.generate_error')
                    });
                    this.loadingRapportFinancier = false;
                    this.cdr.markForCheck();
                }
            });
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
        this.loadVentes();
    }

    loadVentes(): void {
        this.loadingVentes = true;
        const from = this.rangeDates[0]?.toISOString();
        const until = this.rangeDates[1]?.toISOString();
        this.http.get<any>(`${environment.baseUrl}/api/reports/ventes?depuis=${from}&jusqu=${until}`).subscribe({
            next: (data) => {
                this.ventesData = data;
                this.caTotalVentes = Number(data.caTotalGlobal ?? 0);
                this.buildVentesChart(data.parPlateforme ?? []);
                this.loadingVentes = false;
                this.cdr.markForCheck();
            },
            error: () => {
                this.loadingVentes = false;
                this.cdr.markForCheck();
            }
        });
    }

    private buildVentesChart(parPlateforme: any[]): void {
        const style = getComputedStyle(document.documentElement);
        const textColor = style.getPropertyValue('--text-color');

        const bg = parPlateforme.map((p) => style.getPropertyValue(this.PLATFORM_COLORS[p.source] ?? '--p-primary-500'));
        const hoverBg = parPlateforme.map((p) => style.getPropertyValue((this.PLATFORM_COLORS[p.source] ?? '--p-primary-500').replace('-500', '-400')));

        this.ventesChartData = {
            labels: parPlateforme.map((p) => this.PLATFORM_LABELS[p.source] ?? p.source),
            datasets: [
                {
                    data: parPlateforme.map((p) => Number(p.caTotal)),
                    backgroundColor: bg,
                    hoverBackgroundColor: hoverBg,
                    borderWidth: 0
                }
            ]
        };

        this.ventesChartOptions = {
            cutout: '70%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: textColor,
                        usePointStyle: true,
                        padding: 20,
                        font: { size: 12 }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: (ctx: any) => {
                            const val: number = ctx.parsed;
                            const total: number = ctx.dataset.data.reduce((a: number, b: number) => a + b, 0);
                            const pct = total > 0 ? ((val / total) * 100).toFixed(1) : '0';
                            return ` ${val.toLocaleString('fr-FR', {
                                style: 'currency',
                                currency: this.appCurrency
                            })} (${pct}%)`;
                        }
                    }
                }
            }
        };
    }

    get nbTotalCommandes(): number {
        return (this.ventesData?.parPlateforme ?? []).reduce((sum: number, p: any) => sum + Number(p.nbCommandes), 0);
    }

    getPlatformLabel(source: string): string {
        return this.PLATFORM_LABELS[source] ?? source;
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
                this.mouvements = d.content ?? [];
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
        this.alerteService
            .listerAlertes(
                false, // all
                0, // page
                20, // size
                undefined // entrepotId
            )
            .subscribe({
                next: (data: any) => {
                    this.alertes = data.content ?? [];
                    this.totalAlertes = data.totalElements ?? 0;
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
        return this.totalAlertes;
    }

    get nbAlertesCritiques(): number {
        return this.alertes.filter((a) => a.typeAlerte === 'stock_bas').length;
    }

    get totalManque(): number {
        return this.alertes.length;
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
            summary: this.transloco.translate('rapports.export'),
            detail: `Export ${type} en cours de développement`
        });
    }
}
function toObservable(layoutConfig: WritableSignal<LayoutConfig>, arg1: { injector: any }) {
    throw new Error('Function not implemented.');
}
