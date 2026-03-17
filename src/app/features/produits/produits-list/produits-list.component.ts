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
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { ToolbarModule } from 'primeng/toolbar';
import { TooltipModule } from 'primeng/tooltip';

import { ProduitControllerService, ProduitResponse } from '@/app/modules/openapi';
import { PopoverModule } from 'primeng/popover';
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
    LierRecetteDialogComponent,
  ],
  providers: [MessageService],
  templateUrl: './produits-list.component.html',
})
export class ProduitsListComponent implements OnInit {
  produits: ProduitResponse[] = [];
  loading = false;
  globalFilter = '';

  showDetailDialog = false;
  showLierRecetteDialog = false;
  selectedProduit: ProduitResponse | null = null;

  constructor(
    private produitService: ProduitControllerService,
    private messageService: MessageService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadProduits();
  }

  loadProduits(): void {
    this.loading = true;
    this.produitService.listerProduit().subscribe({
      next: (data) => {
        this.produits = data;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Erreur',
          detail: 'Impossible de charger les produits BigCommerce.',
        });
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
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
      detail: 'La recette a été associée au produit.',
    });
  }

  getStatusSeverity(status: string | undefined): 'success' | 'warn' | 'danger' | 'secondary' {
    switch (status) {
      case 'active': return 'success';
      case 'archived': return 'secondary';
      default: return 'warn';
    }
  }

  getStatusLabel(status: string | undefined): string {
    switch (status) {
      case 'active': return 'Actif';
      case 'archived': return 'Archivé';
      default: return status ?? '—';
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
