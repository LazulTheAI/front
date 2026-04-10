import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';

import { ConfirmationService, MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { Select } from 'primeng/select';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { Toast } from 'primeng/toast';
import { Toolbar } from 'primeng/toolbar';
import { Tooltip } from 'primeng/tooltip';

import { CommandeB2BControllerService, CommandeB2BResponse, PdfControllerService, RevendeurControllerService, RevendeurResponse } from '@/app/modules/openapi';
import { HttpClient as NgHttpClient } from '@angular/common/http';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { environment } from '../../../../environments/environment';
import { CommandeB2BDetailDialogComponent } from '../commande-detail-dialog/commande-b2b-detail-dialog.component';
import { CommandeB2BFormDialogComponent } from '../commande-form-dialog/commande-b2b-form-dialog.component';
interface SelectOption {
    label: string;
    value: string | number | null;
}

@Component({
    selector: 'app-commandes-b2b-list',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, TranslocoModule, FormsModule, TableModule, Button, Tooltip, Toast, Toolbar, ConfirmDialog, Select, CommandeB2BFormDialogComponent, CommandeB2BDetailDialogComponent],
    providers: [MessageService, ConfirmationService],
    templateUrl: './commandes-b2b-list.component.html'
})
export class CommandesB2BListComponent implements OnInit, OnDestroy {
    commandes: CommandeB2BResponse[] = [];
    totalRecords = 0;
    loading = false;
    downloadingId: number | null = null;

    page = 0;
    size = 20;

    // Filtres
    filtreStatut: string | null = null;
    filtreRevendeurId: number | null = null;

    revendeurs: RevendeurResponse[] = [];
    revendeurOptions: SelectOption[] = [];

    statutOptions: SelectOption[] = [];

    showFormDialog = false;
    showDetailDialog = false;
    selectedCommande: CommandeB2BResponse | null = null;

    private destroy$ = new Subject<void>();

    constructor(
        private pdfService: PdfControllerService,
        private commandeService: CommandeB2BControllerService,
        @Inject(RevendeurControllerService)
        private revendeurService: RevendeurControllerService,
        private http: NgHttpClient,
        private messageService: MessageService,
        private cdr: ChangeDetectorRef,
        private transloco: TranslocoService
    ) {}

    ngOnInit(): void {
        this.statutOptions = [
            { label: this.transloco.translate('commandes_b2b.tous_statuts'), value: null },
            { label: this.transloco.translate('commandes_b2b.statut_brouillon'), value: 'BROUILLON' },
            { label: this.transloco.translate('commandes_b2b.statut_confirmee'), value: 'CONFIRMEE' },
            { label: this.transloco.translate('commandes_b2b.statut_expediee'), value: 'EXPEDIEE' },
            { label: this.transloco.translate('commandes_b2b.statut_livree'), value: 'LIVREE' },
            { label: this.transloco.translate('commandes_b2b.statut_annulee'), value: 'ANNULEE' }
        ];
        this.revendeurService.listerRevendeurActifs().subscribe({
            next: (list) => {
                this.revendeurs = list;
                this.revendeurOptions = [{ label: this.transloco.translate('commandes_b2b.filtre_revendeur'), value: null }, ...list.map((r) => ({ label: r.nom!, value: r.id! }))];
                this.cdr.markForCheck();
            }
        });
        this.loadCommandes();
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    loadCommandes(): void {
        this.loading = true;
        this.commandeService.listerCommandeB2B(this.filtreRevendeurId ?? undefined, this.filtreStatut ?? undefined, this.page, this.size).subscribe({
            next: (data: any) => {
                this.commandes = data.content;
                this.totalRecords = data.totalElements;
                this.loading = false;
                this.cdr.markForCheck();
            },
            error: () => {
                this.messageService.add({ severity: 'error', summary: this.transloco.translate('common.error'), detail: this.transloco.translate('commandes_b2b.erreur_charger_commandes') });
                this.loading = false;
                this.cdr.markForCheck();
            }
        });
    }

    onLazyLoad(event: TableLazyLoadEvent): void {
        this.page = Math.floor((event.first ?? 0) / (event.rows ?? this.size));
        this.size = event.rows ?? this.size;
        this.loadCommandes();
    }

    onFiltreChange(): void {
        this.page = 0;
        this.loadCommandes();
    }

    openCreate(): void {
        this.selectedCommande = null;
        this.showFormDialog = true;
    }

    openDetail(c: CommandeB2BResponse): void {
        this.selectedCommande = c;
        this.showDetailDialog = true;
    }

    changerStatut(c: CommandeB2BResponse, statut: string, event: Event): void {
        event.stopPropagation();
        this.commandeService.changerStatutCommandeB2B(c.id!, { statut }).subscribe({
            next: () => {
                this.messageService.add({ severity: 'success', summary: this.transloco.translate('commandes_b2b.statut_mis_a_jour'), detail: this.transloco.translate('commandes_b2b.commande_numero_statut', { numero: c.numero, statut }) });
                this.loadCommandes();
            },
            error: (err: any) => {
                this.messageService.add({ severity: 'error', summary: this.transloco.translate('common.error'), detail: err?.error?.message ?? this.transloco.translate('commandes_b2b.transition_invalide') });
            }
        });
    }

    // ── PDF ───────────────────────────────────────────────────
    downloadBonLivraison(c: CommandeB2BResponse, event: Event): void {
        event.stopPropagation();
        const lang = navigator.language?.split('-')[0] ?? 'fr';
        this.http
            .get(`${environment.baseUrl}/api/pdf/commandes-b2b/${c.id}/bon-livraison?lang=${lang}`, {
                responseType: 'blob'
            })
            .subscribe({
                next: (blob) => {
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `bon-livraison-${c.numero}.pdf`;
                    a.click();
                    URL.revokeObjectURL(url);
                },
                error: () => {
                    this.messageService.add({ severity: 'error', summary: this.transloco.translate('common.error'), detail: this.transloco.translate('commandes_b2b.erreur_pdf') });
                }
            });
    }

    getWorkflowPct(statut: string): number {
        const map: Record<string, number> = {
            BROUILLON: 10,
            CONFIRMEE: 40,
            EXPEDIEE: 70,
            LIVREE: 100,
            ANNULEE: 0
        };
        return map[statut] ?? 0;
    }

    downloadFacture(c: CommandeB2BResponse, event: Event): void {
        event.stopPropagation();
        const lang = navigator.language?.split('-')[0] ?? 'fr';
        this.http
            .get(`${environment.baseUrl}/api/pdf/commandes-b2b/${c.id}/facture?lang=${lang}`, {
                responseType: 'blob'
            })
            .subscribe({
                next: (blob) => {
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `facture-${c.numero}.pdf`;
                    a.click();
                    URL.revokeObjectURL(url);
                },
                error: () => {
                    this.messageService.add({ severity: 'error', summary: this.transloco.translate('common.error'), detail: this.transloco.translate('commandes_b2b.erreur_pdf') });
                }
            });
    }

    // ── Helpers ───────────────────────────────────────────────

    onFormSaved(): void {
        this.showFormDialog = false;
        this.loadCommandes();
        this.messageService.add({ severity: 'success', summary: this.transloco.translate('common.success'), detail: this.transloco.translate('commandes_b2b.commande_saved') });
        this.cdr.markForCheck();
    }

    getStatutSeverity(statut: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
        const map: Record<string, any> = {
            BROUILLON: 'secondary',
            CONFIRMEE: 'info',
            EXPEDIEE: 'warn',
            LIVREE: 'success',
            ANNULEE: 'danger'
        };
        return map[statut] ?? 'secondary';
    }

    getStatutLabel(statut: string): string {
        const map: Record<string, string> = {
            BROUILLON: 'commandes_b2b.statut_brouillon',
            CONFIRMEE: 'commandes_b2b.statut_confirmee',
            EXPEDIEE: 'commandes_b2b.statut_expediee',
            LIVREE: 'commandes_b2b.statut_livree',
            ANNULEE: 'commandes_b2b.statut_annulee'
        };
        return map[statut] ? this.transloco.translate(map[statut]) : statut;
    }

    getNextStatut(statut: string): string | null {
        const map: Record<string, string> = {
            BROUILLON: 'CONFIRMEE',
            CONFIRMEE: 'EXPEDIEE',
            EXPEDIEE: 'LIVREE'
        };
        return map[statut] ?? null;
    }

    getNextStatutLabel(statut: string): string {
        const map: Record<string, string> = {
            BROUILLON: 'commandes_b2b.action_confirmer',
            CONFIRMEE: 'commandes_b2b.action_expedier',
            EXPEDIEE: 'commandes_b2b.action_livrer'
        };
        return map[statut] ? this.transloco.translate(map[statut]) : '';
    }
}
