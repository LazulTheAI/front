import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoModule } from '@jsverse/transloco';

import { Button } from 'primeng/button';
import { Paginator } from 'primeng/paginator';
import { Select } from 'primeng/select';
import { Skeleton } from 'primeng/skeleton';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';

import { EntrepotControllerService, EntrepotResponse, ProduitResponse, StockProduitControllerService } from '@/app/modules/openapi';
import { MouvementStockProduitResponse } from '@/app/modules/openapi/model/mouvement-stock-produit-response';
import { DialogModule } from 'primeng/dialog';

interface SelectOption {
    label: string;
    value: number | null;
}

// Map type mouvement → label lisible + icône + css
const TYPE_CONFIG: Record<string, { label: string; icon: string; css: string }> = {
    production: { label: 'Production', icon: 'pi pi-cog text-primary', css: 'text-primary' },
    entree_manuelle: { label: 'Entrée manuelle', icon: 'pi pi-arrow-down text-green-500', css: 'text-green-600' },
    ajustement_positif: { label: 'Ajustement +', icon: 'pi pi-plus text-green-500', css: 'text-green-600' },
    ajustement_negatif: { label: 'Ajustement −', icon: 'pi pi-minus text-orange-500', css: 'text-orange-600' },
    vente_bc: { label: 'Vente BC', icon: 'pi pi-shopping-cart text-blue-500', css: 'text-blue-600' },
    vente_b2b: { label: 'Vente B2B', icon: 'pi pi-shopping-bag text-indigo-500', css: 'text-indigo-600' }, // ← manquant
    transfert_sortie: { label: 'Transfert sortie', icon: 'pi pi-arrow-up-right text-purple-500', css: 'text-purple-600' },
    transfert_entree: { label: 'Transfert entrée', icon: 'pi pi-arrow-down-left text-purple-500', css: 'text-purple-600' }
};

@Component({
    selector: 'app-historique-produit-dialog',
    templateUrl: './historique-produit-dialog.component.html',
    standalone: true,
    imports: [CommonModule, FormsModule, Button, DialogModule, Select, TableModule, Skeleton, Paginator, TranslocoModule]
})
export class HistoriqueProduitDialogComponent implements OnChanges, OnInit {
    @Input() visible = false;
    @Output() visibleChange = new EventEmitter<boolean>();

    @Input() produit: ProduitResponse | null = null;

    loading = false;
    mouvements: MouvementStockProduitResponse[] = [];
    entrepots: EntrepotResponse[] = [];

    filtreEntrepotId: number | null = null;
    page = 0;
    pageSize = 20;
    totalElements = 0;

    entrepotOptions: SelectOption[] = [];

    constructor(
        private stockService: StockProduitControllerService,
        private entrepotService: EntrepotControllerService
    ) {}

    ngOnInit(): void {
        this.entrepotService.listerEntrepot().subscribe({
            next: (list) => {
                this.entrepots = list;
                this.entrepotOptions = [{ label: 'Tous les entrepôts', value: null }, ...list.map((e) => ({ label: e.nom!, value: e.id! }))];
            }
        });
    }

    charger(): void {
        if (!this.produit?.id) return;
        this.loading = true;

        this.stockService.historiqueStockProduit(this.produit.id, this.filtreEntrepotId ?? undefined, this.page, this.pageSize).subscribe({
            next: (page) => {
                this.mouvements = page.content ?? [];
                this.totalElements = page.totalElements ?? 0;
                this.loading = false;
            },
            error: () => {
                this.loading = false;
            }
        });
    }

    onLazyLoad(event: TableLazyLoadEvent): void {
        this.page = Math.floor((event.first ?? 0) / (event.rows ?? this.pageSize));
        this.pageSize = event.rows ?? this.pageSize;
        this.charger();
    }
    ngOnChanges(changes: SimpleChanges): void {
        // Déclencher si visible passe à true ET produit est défini
        // OU si produit change alors que le dialog est déjà visible
        const visibleChanged = changes['visible'] && this.visible;
        const produitChanged = changes['produit'] && this.produit?.id;

        if ((visibleChanged || produitChanged) && this.visible && this.produit?.id) {
            this.page = 0;
            this.filtreEntrepotId = null;
            this.charger();
        }
    }

    onPageChange(event: { page?: number }): void {
        this.page = event.page ?? 0;
        this.charger();
    }

    getTypeLabel(type: string): string {
        return TYPE_CONFIG[type]?.label ?? type;
    }

    getTypeIcon(type: string): string {
        return TYPE_CONFIG[type]?.icon ?? 'pi pi-circle';
    }

    getTypeCss(type: string): string {
        return TYPE_CONFIG[type]?.css ?? 'text-500';
    }

    onHide(): void {
        this.visibleChange.emit(false);
    }
}
