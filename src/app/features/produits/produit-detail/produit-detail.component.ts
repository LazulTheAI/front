import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';

// PrimeNG
import { MessageService } from 'primeng/api';
import { AvatarModule } from 'primeng/avatar';
import { ButtonModule } from 'primeng/button';
import { ChipModule } from 'primeng/chip';
import { DialogModule } from 'primeng/dialog';
import { DividerModule } from 'primeng/divider';
import { SkeletonModule } from 'primeng/skeleton';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';

import { ProductionControllerService, ProduitControllerService, ProduitResponse, RunProductionResponse } from '@/app/modules/openapi';
import { TabsModule } from 'primeng/tabs';

@Component({
    selector: 'app-produit-detail',
    standalone: true,
    imports: [CommonModule, DialogModule, ButtonModule, TabsModule, TagModule, ChipModule, TableModule, DividerModule, TooltipModule, SkeletonModule, AvatarModule, ToastModule],
    providers: [MessageService],
    templateUrl: './produit-detail.component.html'
})
export class ProduitDetailComponent implements OnChanges {
    @Input() visible = false;
    @Output() visibleChange = new EventEmitter<boolean>();
    @Input() produit: ProduitResponse | null = null;
    @Output() onLierRecette = new EventEmitter<Event>();

    produitDetail: ProduitResponse | null = null;
    productions: any[] = [];
    loadingDetail = false;
    loadingProductions = false;

    constructor(
        private produitService: ProduitControllerService,
        private productionService: ProductionControllerService,
        private messageService: MessageService
    ) {}

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['visible']?.currentValue === true && this.produit?.id) {
            this.loadDetail();
            this.loadProductions();
        }
    }

    loadDetail(): void {
        if (!this.produit?.id) return;
        this.loadingDetail = true;
        this.produitService.detailProduit(this.produit.id).subscribe({
            next: (data) => {
                this.produitDetail = data;
                this.loadingDetail = false;
            },
            error: () => {
                this.loadingDetail = false;
            }
        });
    }

    loadProductions(): void {
        if (!this.produit?.id) return;
        this.loadingProductions = true;

        const recettePrincipale = this.produit.recettes?.find((r: any) => r.estPrincipale);
        if (!recettePrincipale?.recetteId) {
            this.productions = [];
            this.loadingProductions = false;
            return;
        }

        this.productionService
            .listerProductions(
                0, // page
                10, // size — on veut les 10 derniers directement
                'createdAt', // sortBy
                'desc', // sortDir
                undefined, // statut
                undefined, // entrepotId
                undefined // search
            )
            .subscribe({
                next: (data: any) => {
                    this.productions = (data.content as RunProductionResponse[]).filter((r) => r.recetteId === recettePrincipale.recetteId);
                    this.loadingProductions = false;
                },
                error: () => {
                    this.productions = [];
                    this.loadingProductions = false;
                }
            });
    }

    close(): void {
        this.visible = false;
        this.visibleChange.emit(false);
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

    getProductionStatusSeverity(status: string): 'success' | 'warn' | 'info' | 'secondary' | 'danger' {
        switch (status) {
            case 'completed':
                return 'success';
            case 'in_progress':
                return 'info';
            case 'planned':
                return 'warn';
            case 'cancelled':
                return 'secondary';
            default:
                return 'secondary';
        }
    }

    getProductionStatusLabel(status: string): string {
        const map: Record<string, string> = {
            completed: 'Terminée',
            in_progress: 'En cours',
            planned: 'Planifiée',
            cancelled: 'Annulée'
        };
        return map[status] ?? status;
    }

    openBigCommerce(): void {
        const produitDetail = this.produitDetail as any;
        if (produitDetail?.platformProductId) {
            // URL générique admin BC
            window.open(`https://store.mybigcommerce.com/manage/products/${produitDetail.platformProductId}/edit`, '_blank');
        }
    }
}
