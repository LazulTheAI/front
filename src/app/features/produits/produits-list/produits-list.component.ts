import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';

// PrimeNG
import { MessageService } from 'primeng/api';
import { AvatarModule } from 'primeng/avatar';
import { ButtonModule } from 'primeng/button';
import { ChipModule } from 'primeng/chip';
import { InputTextModule } from 'primeng/inputtext';
import { ProgressBarModule } from 'primeng/progressbar';
import { SkeletonModule } from 'primeng/skeleton';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { ToolbarModule } from 'primeng/toolbar';
import { TooltipModule } from 'primeng/tooltip';

import { ProduitControllerService, ProduitResponse } from '@/app/modules/openapi';
import { PopoverModule } from 'primeng/popover';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';
import { LierRecetteDialogComponent } from '../lier-recette-dialog/lier-recette-dialog.component';
import { ProduitDetailComponent } from '../produit-detail/produit-detail.component';

@Component({
    selector: 'app-produits-list',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        CommonModule,
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
        ProgressBarModule,
        ProduitDetailComponent,
        LierRecetteDialogComponent
    ],
    providers: [MessageService],
    templateUrl: './produits-list.component.html'
})
export class ProduitsListComponent implements OnInit {
    produits: ProduitResponse[] = [];
    totalRecords = 0;
    loading = false;

    // Pagination & tri
    page = 0;
    size = 20;
    sortBy = 'nom';
    sortDir = 'asc';

    showDetailDialog = false;
    showLierRecetteDialog = false;
    selectedProduit: ProduitResponse | null = null;

    // Recherche
    search = '';
    private search$ = new Subject<string>();

    constructor(
        private produitService: ProduitControllerService,
        private messageService: MessageService,
        private cdr: ChangeDetectorRef
    ) {}

    ngOnInit(): void {
        // Debounce recherche — attend 400ms après la dernière frappe
        this.search$.pipe(debounceTime(400), distinctUntilChanged()).subscribe((value) => {
            this.search = value;
            this.page = 0; // reset à la première page
            this.loadProduits();
        });

        this.loadProduits();
    }

    onSearchInput(value: string): void {
        this.search$.next(value);
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
}
