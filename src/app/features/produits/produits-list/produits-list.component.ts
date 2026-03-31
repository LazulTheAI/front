// produits-list.component.ts
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ConfirmationService, MessageService } from 'primeng/api';
import { AvatarModule } from 'primeng/avatar';
import { ButtonModule } from 'primeng/button';
import { ChipModule } from 'primeng/chip';
import { DialogModule } from 'primeng/dialog';
import { DividerModule } from 'primeng/divider';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { PopoverModule } from 'primeng/popover';
import { ProgressBarModule } from 'primeng/progressbar';
import { SkeletonModule } from 'primeng/skeleton';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { ToolbarModule } from 'primeng/toolbar';
import { TooltipModule } from 'primeng/tooltip';

import { ProduitControllerService, ProduitResponse, StockProduitControllerService } from '@/app/modules/openapi';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { IconField } from 'primeng/iconfield';
import { InputIcon } from 'primeng/inputicon';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';
import { AjustementProduitDialogComponent } from '../ajustement-produit/ajustement-produit-dialog.component';
import { EntreeProduitDialogComponent } from '../entree-produit-dialog/entree-produit-dialog.component';
import { HistoriqueProduitDialogComponent } from '../historique-produit-dialog/historique-produit-dialog.component';
import { LierRecetteDialogComponent } from '../lier-recette-dialog/lier-recette-dialog.component';
import { ProduitDetailComponent } from '../produit-detail/produit-detail.component';
import { TransfertProduitDialogComponent } from '../transfert-produit-dialog/transfert-produit-dialog.component';

interface StockProduitResponse {
    produitId: number;
    produitNom: string;
    entrepotId: number;
    entrepotNom: string;
    stockActuel: number;
    seuilAlerte: number | null;
    enAlerte: boolean;
    dlcProchaine: string | null;
    derniereProductionAt: string | null;
}

@Component({
    selector: 'app-produits-list',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [ConfirmationService],
    imports: [
        CommonModule,
        ConfirmDialog,
        FormsModule,
        TableModule,
        ButtonModule,
        TagModule,
        TooltipModule,
        ToastModule,
        ToolbarModule,
        InputTextModule,
        ChipModule,
        SkeletonModule,
        AvatarModule,
        PopoverModule,
        IconField,
        InputIcon,
        ProgressBarModule,
        DialogModule,
        InputNumberModule,
        DividerModule,
        ProduitDetailComponent,
        LierRecetteDialogComponent,
        EntreeProduitDialogComponent,
        TransfertProduitDialogComponent,
        HistoriqueProduitDialogComponent,
        AjustementProduitDialogComponent
    ],
    templateUrl: './produits-list.component.html'
})
export class ProduitsListComponent implements OnInit {
    produits: ProduitResponse[] = [];
    totalRecords = 0;
    loading = false;

    page = 0;
    size = 20;
    sortBy = 'nom';
    sortDir = 'asc';

    search = '';
    private search$ = new Subject<string>();

    showDetailDialog = false;
    showLierRecetteDialog = false;
    selectedProduit: ProduitResponse | null = null;

    // Modal stock
    showStockDialog = false;
    stockDialogLoading = false;
    stockDialogSaving = false;
    stocksProduit: StockProduitResponse[] = [];
    stockProduitSelectionne: StockProduitResponse | null = null;
    editingSeuil: number | null = null;
    showEntreeProduitDialog = false;
    showTransfertProduitDialog = false;
    showHistoriqueProduitDialog = false;
    showAjustementProduitDialog = false;

    constructor(
        private confirmationService: ConfirmationService,
        private produitService: ProduitControllerService,
        @Inject(StockProduitControllerService)
        private stockProduitService: StockProduitControllerService,
        private messageService: MessageService,
        private cdr: ChangeDetectorRef
    ) {}

    ngOnInit(): void {
        this.search$.pipe(debounceTime(400), distinctUntilChanged()).subscribe((value) => {
            this.search = value;
            this.page = 0;
            this.loadProduits();
        });
        this.loadProduits();
    }

    onSearchInput(value: string): void {
        this.search$.next(value);
    }

    openEntreeProduit(produit: ProduitResponse): void {
        this.selectedProduit = produit;
        this.showEntreeProduitDialog = true;
    }

    openTransfertProduit(produit: ProduitResponse): void {
        this.selectedProduit = produit;
        // Réutilise stocksProduit déjà chargé par openStockDialog.
        // Si pas encore chargé, on charge via le service existant.
        if (!this.stocksProduit.some((s) => s.produitId === produit.id)) {
            this.stockProduitService.listerStockProduit(0, 100, undefined).subscribe({
                next: (data: any) => {
                    this.stocksProduit = (data.content ?? []).filter((s: any) => s.produitId === produit.id);
                    this.cdr.markForCheck();
                }
            });
        }
        this.showTransfertProduitDialog = true;
    }

    openAjustementProduit(produit: ProduitResponse): void {
        this.selectedProduit = produit;
        this.showAjustementProduitDialog = true;
    }

    onStockUpdated(result: { success: boolean; message: string }): void {
        this.messageService.add({
            severity: result.success ? 'success' : 'error',
            summary: result.success ? 'Succès' : 'Erreur',
            detail: result.message
        });
        if (result.success) this.loadProduits();
    }

    openHistoriqueProduit(produit: ProduitResponse): void {
        this.selectedProduit = produit;
        this.showHistoriqueProduitDialog = true;
    }
    loadProduits(): void {
        this.loading = true;
        this.produitService.listerProduit(this.page, this.size, this.sortBy, this.sortDir, this.search || undefined).subscribe({
            next: (data: any) => {
                this.produits = data.content;
                this.totalRecords = data.totalElements;
                this.loading = false;
                this.cdr.markForCheck();
            },
            error: () => {
                this.loading = false;
                this.cdr.markForCheck();
            }
        });
    }

    onLazyLoad(event: TableLazyLoadEvent): void {
        this.page = Math.floor((event.first ?? 0) / (event.rows ?? this.size));
        this.size = event.rows ?? this.size;
        if (event.sortField) {
            this.sortBy = Array.isArray(event.sortField) ? event.sortField[0] : event.sortField;
            this.sortDir = event.sortOrder === -1 ? 'desc' : 'asc';
        }
        this.loadProduits();
    }

    // ─── Stock dialog ──────────────────────────────────────────

    openStockDialog(produit: ProduitResponse, event: Event): void {
        event.stopPropagation();
        this.selectedProduit = produit;
        this.showStockDialog = true;
        this.stockDialogLoading = true;
        this.stocksProduit = [];
        this.stockProduitSelectionne = null;
        this.editingSeuil = null;
        this.cdr.markForCheck();

        this.stockProduitService.listerStockProduit(0, 100, undefined).subscribe({
            next: (data: any) => {
                this.stocksProduit = (data.content ?? []).filter((s: StockProduitResponse) => s.produitId === produit.id);
                this.stockDialogLoading = false;
                this.cdr.markForCheck();
            },
            error: () => {
                this.stockDialogLoading = false;
                this.cdr.markForCheck();
            }
        });
    }

    startEditSeuil(stock: StockProduitResponse): void {
        this.stockProduitSelectionne = stock;
        this.editingSeuil = stock.seuilAlerte ?? null;
    }

    cancelEditSeuil(): void {
        this.stockProduitSelectionne = null;
        this.editingSeuil = null;
    }

    saveSeuil(): void {
        if (!this.stockProduitSelectionne || this.editingSeuil == null) return;
        this.stockDialogSaving = true;
        this.cdr.markForCheck();

        this.stockProduitService.definirSeuil(this.stockProduitSelectionne.produitId, this.stockProduitSelectionne.entrepotId, { seuil: this.editingSeuil }).subscribe({
            next: (updated: any) => {
                const idx = this.stocksProduit.findIndex((s) => s.entrepotId === this.stockProduitSelectionne!.entrepotId);
                if (idx >= 0) this.stocksProduit[idx] = updated;
                this.stocksProduit = [...this.stocksProduit];
                this.stockDialogSaving = false;
                this.stockProduitSelectionne = null;
                this.editingSeuil = null;
                this.messageService.add({
                    severity: 'success',
                    summary: 'Seuil mis à jour',
                    detail: `Seuil défini à ${updated.seuilAlerte}`
                });
                this.loadProduits();
                this.cdr.markForCheck();
            },
            error: () => {
                this.stockDialogSaving = false;
                this.messageService.add({
                    severity: 'error',
                    summary: 'Erreur',
                    detail: 'Impossible de mettre à jour le seuil'
                });
                this.cdr.markForCheck();
            }
        });
    }

    // ─── Helpers stock ─────────────────────────────────────────

    getStockTotalProduit(produit: ProduitResponse): number {
        return (produit as any).stockReel ?? 0;
    }

    isEnAlerteProduit(produit: ProduitResponse): boolean {
        return (produit as any).enAlerteProduit ?? false;
    }

    getSeuilProduit(produit: ProduitResponse): number | null {
        return (produit as any).seuilAlerte ?? null;
    }

    isDlcProche(dlc: string | null | undefined): boolean {
        if (!dlc) return false;
        const limite = new Date();
        limite.setDate(limite.getDate() + 30);
        return new Date(dlc) <= limite;
    }

    // ─── Dialogs ───────────────────────────────────────────────

    openDetail(produit: ProduitResponse): void {
        this.selectedProduit = produit;
        this.showDetailDialog = true;
    }

    openLierRecette(produit: ProduitResponse, event: Event): void {
        event.stopPropagation();
        this.selectedProduit = produit;
        this.showLierRecetteDialog = true;
    }

    onRecetteLiee(): void {
        this.showLierRecetteDialog = false;
        this.loadProduits();
        this.messageService.add({
            severity: 'success',
            summary: 'Recette liée',
            detail: 'La recette a été associée au produit.'
        });
    }

    // ─── Helpers affichage ─────────────────────────────────────

    getStatusSeverity(status: string | undefined): 'success' | 'warn' | 'danger' | 'secondary' {
        switch (status) {
            case 'active':
                return 'success';
            case 'archived':
                return 'secondary';
            default:
                return 'warn';
        }
    }

    getStatusLabel(status: string | undefined): string {
        switch (status) {
            case 'active':
                return 'Actif';
            case 'archived':
                return 'Archivé';
            default:
                return status ?? '—';
        }
    }

    getStockSeverity(stock: number | undefined): string {
        if (stock == null) return 'text-400';
        if (stock === 0) return 'text-red-500 font-bold';
        if (stock <= 5) return 'text-orange-500 font-semibold';
        return 'text-green-600 font-semibold';
    }

    getPrincipalRecette(produit: ProduitResponse): string {
        const principale = produit.recettes?.find((r: any) => r.estPrincipale);
        return principale?.recetteNom ?? produit.recettes?.[0]?.recetteNom ?? '';
    }

    hasProduitImage(produit: ProduitResponse): boolean {
        return !!(produit as any).imageUrl;
    }

    getInitials(name: string | undefined): string {
        if (!name) return '?';
        return name
            .split(' ')
            .slice(0, 2)
            .map((w) => w[0])
            .join('')
            .toUpperCase();
    }

    confirmArchiver(produit: ProduitResponse): void {
        this.confirmationService.confirm({
            message: `Archiver « ${produit.nom} » ? Le produit ne sera plus visible dans la liste.`,
            header: "Confirmer l'archivage",
            icon: 'pi pi-inbox',
            accept: () => this.archiverProduit(produit)
        });
    }

    private archiverProduit(produit: ProduitResponse): void {
        this.produitService.archiverProduit(produit.id!).subscribe({
            next: () => {
                this.messageService.add({
                    severity: 'success',
                    summary: 'Archivé',
                    detail: `${produit.nom} a été archivé.`
                });
                this.loadProduits();
                this.cdr.markForCheck();
            },
            error: () => {
                this.messageService.add({
                    severity: 'error',
                    summary: 'Erreur',
                    detail: "Impossible d'archiver ce produit."
                });
            }
        });
    }

    restaurerProduit(produit: ProduitResponse): void {
        this.produitService.restaurerProduit(produit.id!).subscribe({
            next: () => {
                this.messageService.add({
                    severity: 'success',
                    summary: 'Restauré',
                    detail: `${produit.nom} a été restauré.`
                });
                this.loadProduits();
                this.cdr.markForCheck();
            },
            error: () => {
                this.messageService.add({
                    severity: 'error',
                    summary: 'Erreur',
                    detail: 'Impossible de restaurer ce produit.'
                });
            }
        });
    }
}
