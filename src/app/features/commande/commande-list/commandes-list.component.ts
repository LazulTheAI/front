import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';

import { ConfirmationService, MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { IconField } from 'primeng/iconfield';
import { InputIcon } from 'primeng/inputicon';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { Tag } from 'primeng/tag';
import { Toast } from 'primeng/toast';
import { Toolbar } from 'primeng/toolbar';
import { Tooltip } from 'primeng/tooltip';

import { CommandeControllerService, CommandeResponse, RevendeurControllerService, RevendeurResponse } from '@/app/modules/openapi';
import { APP_CURRENCY } from '@/app/core/currency.config';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { CommandeChangerLotDialogComponent } from '../commande-changer-lot-dialog/commande-changer-lot-dialog.component';
import { CommandeDetailDialogComponent } from '../commande-detail-dialog/commande-detail-dialog.component';
import { CommandeFormDialogComponent } from '../commande-form-dialog/commande-form-dialog.component';

interface SelectOption {
    label: string;
    value: string | number | null;
}

@Component({
    selector: 'app-commandes-list',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        CommonModule,
        TranslocoModule,
        FormsModule,
        TableModule,
        Button,
        Tag,
        Toast,
        Toolbar,
        ConfirmDialog,
        CommandeChangerLotDialogComponent,
        Select,
        IconField,
        InputIcon,
        InputText,
        Tooltip,
        CommandeFormDialogComponent,
        CommandeDetailDialogComponent
    ],
    providers: [MessageService, ConfirmationService],
    templateUrl: './commandes-list.component.html'
})
export class CommandesListComponent implements OnInit, OnDestroy {
    commandes: CommandeResponse[] = [];
    totalRecords = 0;
    loading = false;
    protected readonly appCurrency = APP_CURRENCY;

    page = 0;
    size = 20;

    // Filtres
    filtreStatut: string | null = null;
    filtreSource: string | null = null;
    filtreRevendeurId: number | null = null;
    filtreNumeroLot = '';
    filtreProduitNom = '';

    revendeurs: RevendeurResponse[] = [];
    revendeurOptions: SelectOption[] = [];
    statutOptions: SelectOption[] = [];
    sourceOptions: SelectOption[] = [];

    showFormDialog = false;
    showDetailDialog = false;
    selectedCommande: CommandeResponse | null = null;

    private searchSubject = new Subject<void>();
    private destroy$ = new Subject<void>();

    showChangerLotDialog = false;
    constructor(
        @Inject(CommandeControllerService)
        private commandeService: CommandeControllerService,
        private revendeurService: RevendeurControllerService,
        private messageService: MessageService,
        private cdr: ChangeDetectorRef,
        private transloco: TranslocoService
    ) {}

    ngOnInit(): void {
        this.statutOptions = [
            { label: this.transloco.translate('commandes.tous_statuts'), value: null },
            { label: this.transloco.translate('commandes.statut_brouillon'), value: 'BROUILLON' },
            { label: this.transloco.translate('commandes.statut_confirmee'), value: 'CONFIRMEE' },
            { label: this.transloco.translate('commandes.statut_en_cours'), value: 'EN_COURS' },
            { label: this.transloco.translate('commandes.statut_expediee'), value: 'EXPEDIEE' },
            { label: this.transloco.translate('commandes.statut_livree'), value: 'LIVREE' },
            { label: this.transloco.translate('commandes.statut_annulee'), value: 'ANNULEE' },
            { label: this.transloco.translate('commandes.statut_erreur'), value: 'ERREUR' }
        ];

        this.sourceOptions = [
            { label: this.transloco.translate('commandes.toutes_sources'), value: null },
            { label: 'BigCommerce', value: 'BC' },
            { label: 'Shopify', value: 'SHOPIFY' },
            { label: this.transloco.translate('commandes.source_manuel'), value: 'B2B_MANUEL' }
        ];

        this.revendeurService.listerRevendeurActifs().subscribe({
            next: (list) => {
                this.revendeurs = list;
                this.revendeurOptions = [{ label: this.transloco.translate('commandes.tous_revendeurs'), value: null }, ...list.map((r) => ({ label: r.nom!, value: r.id! }))];
                this.cdr.markForCheck();
            }
        });

        // Debounce sur les filtres texte
        this.searchSubject.pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$)).subscribe(() => {
            this.page = 0;
            this.loadCommandes();
        });

        this.loadCommandes();
    }

    openChangerLot(c: CommandeResponse, event: Event) {
        event.stopPropagation();
        this.selectedCommande = c;
        this.showChangerLotDialog = true;
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    loadCommandes(): void {
        this.loading = true;
        this.commandeService.listerCommande(this.filtreRevendeurId ?? undefined, this.filtreStatut ?? undefined, this.filtreSource ?? undefined, this.filtreNumeroLot || undefined, this.filtreProduitNom || undefined, this.page, this.size).subscribe({
            next: (data: any) => {
                this.commandes = data.content;
                this.totalRecords = data.totalElements;
                this.loading = false;
                this.cdr.markForCheck();
            },
            error: () => {
                this.messageService.add({
                    severity: 'error',
                    summary: this.transloco.translate('common.error'),
                    detail: this.transloco.translate('commandes.erreur_charger')
                });
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

    onSearchInput(): void {
        this.searchSubject.next();
    }

    openCreate(): void {
        this.selectedCommande = null;
        this.showFormDialog = true;
    }

    openDetail(c: CommandeResponse): void {
        this.selectedCommande = c;
        this.showDetailDialog = true;
    }

    onFormSaved(): void {
        this.showFormDialog = false;
        this.loadCommandes();
        this.messageService.add({
            severity: 'success',
            summary: this.transloco.translate('common.success'),
            detail: this.transloco.translate('commandes.commande_saved')
        });
        this.cdr.markForCheck();
    }

    onDetailClosed(): void {
        this.loadCommandes();
    }

    getStatutSeverity(statut: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
        const map: Record<string, any> = {
            BROUILLON: 'secondary',
            CONFIRMEE: 'info',
            EN_COURS: 'info',
            EXPEDIEE: 'warn',
            LIVREE: 'success',
            ANNULEE: 'danger',
            ERREUR: 'danger'
        };
        return map[statut] ?? 'secondary';
    }

    getStatutLabel(statut: string): string {
        const map: Record<string, string> = {
            BROUILLON: 'commandes.statut_brouillon',
            CONFIRMEE: 'commandes.statut_confirmee',
            EN_COURS: 'commandes.statut_en_cours',
            EXPEDIEE: 'commandes.statut_expediee',
            LIVREE: 'commandes.statut_livree',
            ANNULEE: 'commandes.statut_annulee',
            ERREUR: 'commandes.statut_erreur'
        };
        return map[statut] ? this.transloco.translate(map[statut]) : statut;
    }

    getSourceLabel(source: string): string {
        const map: Record<string, string> = {
            BC: 'BigCommerce',
            SHOPIFY: 'Shopify',
            B2B_MANUEL: 'B2B Manuel',
            DIRECT: 'Direct'
        };
        return map[source] ?? source;
    }

    getSourceSeverity(source: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
        const map: Record<string, any> = {
            BC: 'info',
            SHOPIFY: 'success',
            B2B_MANUEL: 'secondary',
            DIRECT: 'warn'
        };
        return map[source] ?? 'secondary';
    }

    getNextStatut(statut: string): string | null {
        const map: Record<string, string> = {
            BROUILLON: 'CONFIRMEE',
            CONFIRMEE: 'EXPEDIEE',
            EXPEDIEE: 'LIVREE'
        };
        return map[statut] ?? null;
    }

    changerStatut(c: CommandeResponse, statut: string, event: Event): void {
        event.stopPropagation();
        this.commandeService.changerStatutCommande(c.id!, { statut }).subscribe({
            next: () => {
                this.messageService.add({
                    severity: 'success',
                    summary: this.transloco.translate('commandes.statut_mis_a_jour'),
                    detail: `${c.numero} → ${statut}`
                });
                this.loadCommandes();
            },
            error: (err: any) => {
                this.messageService.add({
                    severity: 'error',
                    summary: this.transloco.translate('common.error'),
                    detail: err?.error?.message ?? this.transloco.translate('commandes.transition_invalide')
                });
            }
        });
    }

    resetFiltres(): void {
        this.filtreStatut = null;
        this.filtreSource = null;
        this.filtreRevendeurId = null;
        this.filtreNumeroLot = '';
        this.filtreProduitNom = '';
        this.page = 0;
        this.loadCommandes();
    }

    get hasFiltresActifs(): boolean {
        return !!(this.filtreStatut || this.filtreSource || this.filtreRevendeurId || this.filtreNumeroLot || this.filtreProduitNom);
    }
}
