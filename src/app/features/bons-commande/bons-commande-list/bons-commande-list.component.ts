// bons-commande-list.component.ts
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, switchMap, takeUntil } from 'rxjs';

import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { ToolbarModule } from 'primeng/toolbar';
import { TooltipModule } from 'primeng/tooltip';

import { BonCommandeControllerService, BonCommandeResponse } from '@/app/modules/openapi';
import { APP_CURRENCY } from '@/app/core/currency.config';
import { TranslocoModule } from '@jsverse/transloco';
import { IconField } from 'primeng/iconfield';
import { InputIcon } from 'primeng/inputicon';
import { UpgradeBannerComponent } from '@/app/shared/plan-gating.components';
import { RequiresFeatureDirective } from '@/app/shared/requires-plan.directive';
import { BonCommandeDetailComponent } from '../bon-commande-detail/bon-commande-detail.component';
import { BonCommandeFormComponent } from '../bon-commande-form/bon-commande-form.component';

@Component({
    selector: 'app-bons-commande-list',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, TranslocoModule, IconField, InputIcon, FormsModule, TableModule, ButtonModule, TagModule, TooltipModule, ToastModule, ToolbarModule, SelectModule, InputTextModule, BonCommandeFormComponent, BonCommandeDetailComponent, RequiresFeatureDirective, UpgradeBannerComponent],
    providers: [MessageService, ConfirmationService],
    templateUrl: './bons-commande-list.component.html'
})
export class BonsCommandeListComponent implements OnInit, OnDestroy {
    bons: BonCommandeResponse[] = [];
    totalRecords = 0;
    loading = false;
    protected readonly appCurrency = APP_CURRENCY;

    // Pagination & tri
    page = 0;
    size = 15;
    sortBy = 'dateCommande';
    sortDir = 'desc';

    // Filtres
    filtreStatut: string | null = null;
    search = '';

    private load$ = new Subject<void>();
    private search$ = new Subject<string>();
    private destroy$ = new Subject<void>();

    statutOptions = [
        { label: 'Tous les statuts', value: null },
        { label: 'Brouillon', value: 'BROUILLON' },
        { label: 'Envoyé', value: 'ENVOYE' },
        { label: 'Partiellement reçu', value: 'PARTIELLEMENT_RECU' },
        { label: 'Reçu', value: 'RECU' },
        { label: 'Annulé', value: 'ANNULE' }
    ];

    showFormDialog = false;
    showDetailDialog = false;
    selectedBon: BonCommandeResponse | null = null;

    constructor(
        private bonService: BonCommandeControllerService,
        private messageService: MessageService,
        private confirmationService: ConfirmationService,
        private cdr: ChangeDetectorRef
    ) {}

    ngOnInit(): void {
        // switchMap annule la requête précédente si une nouvelle est déclenchée avant la réponse
        this.load$.pipe(
            switchMap(() => {
                this.loading = true;
                this.cdr.markForCheck();
                return this.bonService.listerBonCommande(
                    this.page, this.size, this.sortBy, this.sortDir,
                    (this.filtreStatut as any) ?? undefined,
                    this.search || undefined
                );
            }),
            takeUntil(this.destroy$)
        ).subscribe({
            next: (data: any) => {
                this.bons = data.content;
                this.totalRecords = data.totalElements;
                this.loading = false;
                this.cdr.markForCheck();
            },
            error: () => {
                this.loading = false;
                this.cdr.markForCheck();
            }
        });

        // La recherche texte met à jour this.search puis déclenche le chargement
        this.search$.pipe(
            debounceTime(400),
            distinctUntilChanged(),
            takeUntil(this.destroy$)
        ).subscribe((value) => {
            this.search = value;
            this.page = 0;
            this.load$.next();
        });
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    onSearchInput(value: string): void {
        this.search$.next(value);
    }

    getWorkflowPct(bon: any): number {
        const map: Record<string, number> = {
            BROUILLON: 10,
            ENVOYE: 40,
            PARTIELLEMENT_RECU: 70,
            RECU: 100,
            ANNULE: 0
        };
        return map[bon.statut] ?? 0;
    }

    onLazyLoad(event: TableLazyLoadEvent): void {
        this.page = Math.floor((event.first ?? 0) / (event.rows ?? this.size));
        this.size = event.rows ?? this.size;

        if (event.sortField) {
            this.sortBy = Array.isArray(event.sortField) ? event.sortField[0] : event.sortField;
            this.sortDir = event.sortOrder === -1 ? 'desc' : 'asc';
        }

        this.load$.next();
    }

    onFiltreChange(): void {
        this.page = 0;
        this.load$.next();
    }

    openCreate(): void {
        this.showFormDialog = true;
        this.cdr.markForCheck();
    }

    openDetail(bon: BonCommandeResponse, event?: Event): void {
        event?.stopPropagation();
        this.selectedBon = bon;
        this.showDetailDialog = true;
        this.cdr.markForCheck();
    }

    confirmAnnuler(bon: BonCommandeResponse, event: Event): void {
        event.stopPropagation();
        this.confirmationService.confirm({
            message: `Annuler le bon de commande #${bon.id} ?`,
            header: "Confirmer l'annulation",
            icon: 'pi pi-exclamation-triangle',
            accept: () => {
                this.bonService.annulerBonCommande(bon.id!).subscribe({
                    next: () => {
                        this.messageService.add({
                            severity: 'success',
                            summary: 'Annulé',
                            detail: `BC #${bon.id} annulé`
                        });
                        this.load$.next();
                    }
                });
            }
        });
    }

    confirmSupprimer(bon: BonCommandeResponse, event: Event): void {
        event.stopPropagation();
        this.confirmationService.confirm({
            message: `Supprimer définitivement le brouillon #${bon.id} ?`,
            header: 'Supprimer ce brouillon',
            icon: 'pi pi-trash',
            accept: () => {
                this.bonService.supprimerBonCommande(bon.id!).subscribe({
                    next: () => {
                        this.messageService.add({
                            severity: 'success',
                            summary: 'Supprimé',
                            detail: `BC #${bon.id} supprimé`
                        });
                        this.load$.next();
                    }
                });
            }
        });
    }

    onFormSaved(result: { success: boolean; message: string }): void {
        this.showFormDialog = false;
        this.messageService.add({
            severity: result.success ? 'success' : 'error',
            summary: result.success ? 'Succès' : 'Erreur',
            detail: result.message
        });
        if (result.success) this.load$.next();
        this.cdr.markForCheck();
    }

    onDetailClosed(): void {
        this.showDetailDialog = false;
        this.load$.next();
        this.cdr.markForCheck();
    }

    getStatutSeverity(statut: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
        const map: Record<string, 'success' | 'info' | 'warn' | 'danger' | 'secondary'> = {
            BROUILLON: 'secondary',
            ENVOYE: 'info',
            PARTIELLEMENT_RECU: 'warn',
            RECU: 'success',
            ANNULE: 'danger'
        };
        return map[statut] ?? 'secondary';
    }

    getStatutLabel(statut: string): string {
        const map: Record<string, string> = {
            BROUILLON: 'Brouillon',
            ENVOYE: 'Envoyé',
            PARTIELLEMENT_RECU: 'Part. reçu',
            RECU: 'Reçu',
            ANNULE: 'Annulé'
        };
        return map[statut] ?? statut;
    }

    getTotalBC(bon: BonCommandeResponse): number {
        return bon.lignes?.reduce((sum, l) => sum + ((l.quantiteCommandee ?? 0) * (l.prixUnitaireCents ?? 0)) / 100, 0) ?? 0;
    }

    getProgressionReception(bon: BonCommandeResponse): number {
        if (!bon.lignes?.length) return 0;
        const totalCmd = bon.lignes.reduce((s, l) => s + (l.quantiteCommandee ?? 0), 0);
        const totalRecu = bon.lignes.reduce((s, l) => s + (l.quantiteRecue ?? 0), 0);
        return totalCmd > 0 ? Math.round((totalRecu / totalCmd) * 100) : 0;
    }

    canEnvoyer(bon: BonCommandeResponse): boolean {
        return bon.statut === 'BROUILLON';
    }
    canReceptionner(bon: BonCommandeResponse): boolean {
        return bon.statut === 'ENVOYE' || bon.statut === 'PARTIELLEMENT_RECU';
    }
    canAnnuler(bon: BonCommandeResponse): boolean {
        return bon.statut === 'BROUILLON' || bon.statut === 'ENVOYE';
    }
    canSupprimer(bon: BonCommandeResponse): boolean {
        return bon.statut === 'BROUILLON';
    }

    isEnRetard(bon: BonCommandeResponse): boolean {
        if (!bon.dateLivraisonPrevue) return false;
        if (bon.statut === 'RECU' || bon.statut === 'ANNULE') return false;
        return new Date(bon.dateLivraisonPrevue) < new Date();
    }

    envoyerBon(bon: BonCommandeResponse, event: Event): void {
        event.stopPropagation();
        this.bonService.envoyerBonCommande(bon.id!).subscribe({
            next: () => {
                this.messageService.add({
                    severity: 'success',
                    summary: 'Envoyé',
                    detail: `BC #${bon.id} marqué comme envoyé`
                });
                this.load$.next();
            }
        });
    }
}
