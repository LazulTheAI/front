import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { ToolbarModule } from 'primeng/toolbar';
import { TooltipModule } from 'primeng/tooltip';

import { BonCommandeControllerService, BonCommandeResponse } from '@/app/modules/openapi';

import { BonCommandeDetailComponent } from '../bon-commande-detail/bon-commande-detail.component';
import { BonCommandeFormComponent } from '../bon-commande-form/bon-commande-form.component';

@Component({
    selector: 'app-bons-commande-list',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, FormsModule, TableModule, ButtonModule, TagModule, TooltipModule, ToastModule, ToolbarModule, SelectModule, BonCommandeFormComponent, BonCommandeDetailComponent],
    providers: [MessageService, ConfirmationService],
    templateUrl: './bons-commande-list.component.html'
})
export class BonsCommandeListComponent implements OnInit {
    bons: BonCommandeResponse[] = [];
    loading = false;

    filtreStatut: string | null = null;
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
        this.loadBons();
    }

    loadBons(): void {
        this.loading = true;
        const statut = (this.filtreStatut as any) ?? undefined;
        this.bonService.listerBonCommande(statut).subscribe({
            next: (data: BonCommandeResponse[]) => {
                this.bons = data;
                this.loading = false;
                this.cdr.detectChanges();
            },
            error: () => {
                this.loading = false;
                this.cdr.detectChanges();
            }
        });
    }

    onFiltreChange(): void {
        this.loadBons();
    }

    openCreate(): void {
        this.showFormDialog = true;
        this.cdr.detectChanges();
    }

    openDetail(bon: BonCommandeResponse, event?: Event): void {
        event?.stopPropagation();
        this.selectedBon = bon;
        this.showDetailDialog = true;
        this.cdr.detectChanges();
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
                        this.messageService.add({ severity: 'success', summary: 'Annulé', detail: `BC #${bon.id} annulé` });
                        this.loadBons();
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
                        this.messageService.add({ severity: 'success', summary: 'Supprimé', detail: `BC #${bon.id} supprimé` });
                        this.loadBons();
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
        if (result.success) this.loadBons();
        this.cdr.detectChanges();
    }

    onDetailClosed(): void {
        this.showDetailDialog = false;
        this.loadBons();
        this.cdr.detectChanges();
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
        return (
            bon.lignes?.reduce((sum, l) => {
                return sum + ((l.quantiteCommandee ?? 0) * (l.prixUnitaireCents ?? 0)) / 100;
            }, 0) ?? 0
        );
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
                this.messageService.add({ severity: 'success', summary: 'Envoyé', detail: `BC #${bon.id} marqué comme envoyé` });
                this.loadBons();
            }
        });
    }
}
