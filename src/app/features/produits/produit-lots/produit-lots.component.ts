import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { TranslocoModule } from '@jsverse/transloco';
import { MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Select } from 'primeng/select';
import { Tag } from 'primeng/tag';
import { TableModule } from 'primeng/table';
import { Toast } from 'primeng/toast';
import { Toolbar } from 'primeng/toolbar';
import { Tooltip } from 'primeng/tooltip';

import {
    EntrepotControllerService,
    EntrepotResponse,
    LotResponse,
    ProduitControllerService,
    ProduitResponse
} from '@/app/modules/openapi';
import { DegreverLotProduitDialogComponent } from '../degrever-lot-produit-dialog/degrever-lot-produit-dialog.component';
import { EntreeProduitDialogComponent } from '../entree-produit-dialog/entree-produit-dialog.component';
import { TransfererLotProduitDialogComponent } from '../transferer-lot-produit-dialog/transferer-lot-produit-dialog.component';

interface SelectOption {
    label: string;
    value: number | null;
}

@Component({
    selector: 'app-produit-lots',
    templateUrl: './produit-lots.component.html',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        CommonModule,
        FormsModule,
        RouterModule,
        TranslocoModule,
        Toast,
        Button,
        Tag,
        Select,
        TableModule,
        Toolbar,
        Tooltip,
        DegreverLotProduitDialogComponent,
        EntreeProduitDialogComponent,
        TransfererLotProduitDialogComponent
    ],
    providers: [MessageService]
})
export class ProduitLotsComponent implements OnInit, OnDestroy {
    produit: ProduitResponse | null = null;
    lots: LotResponse[] = [];
    lotsFiltres: LotResponse[] = [];
    loading = true;
    produitId!: number;

    entrepots: EntrepotResponse[] = [];
    entrepotOptions: SelectOption[] = [];
    filtreEntrepotId: number | null = null;

    // Dialogs
    showDegreverDialog = false;
    showEntreeDialog = false;
    showTransfertDialog = false;
    selectedLot: LotResponse | null = null;

    private destroy$ = new Subject<void>();

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private produitService: ProduitControllerService,
        private entrepotService: EntrepotControllerService,
        private messageService: MessageService,
        private cdr: ChangeDetectorRef
    ) {}

    ngOnInit(): void {
        this.produitId = Number(this.route.snapshot.paramMap.get('id'));
        this.loadEntrepots();
        this.loadProduit();
        this.loadLots();
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    private loadEntrepots(): void {
        this.entrepotService
            .listerEntrepot()
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (list) => {
                    this.entrepots = list;
                    this.entrepotOptions = [
                        { label: 'Tous les entrepôts', value: null },
                        ...list.map((e) => ({ label: e.nom!, value: e.id! }))
                    ];
                    this.cdr.markForCheck();
                }
            });
    }

    private loadProduit(): void {
        this.produitService
            .detailProduit(this.produitId)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (p) => {
                    this.produit = p;
                    this.cdr.markForCheck();
                },
                error: () => this.router.navigate(['/produits'])
            });
    }

    loadLots(): void {
        this.loading = true;
        this.produitService
            .listerLotsProduit(this.produitId, undefined, undefined, 0, 500)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (page) => {
                    this.lots = page.content ?? [];
                    this.applyFiltre();
                    this.loading = false;
                    this.cdr.markForCheck();
                },
                error: () => {
                    this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de charger les lots.' });
                    this.loading = false;
                    this.cdr.markForCheck();
                }
            });
    }

    onFiltreEntrepot(): void {
        this.applyFiltre();
    }

    private applyFiltre(): void {
        if (this.filtreEntrepotId === null) {
            this.lotsFiltres = this.lots;
        } else {
            this.lotsFiltres = this.lots.filter((l) => l.entrepotId === this.filtreEntrepotId);
        }
        this.cdr.markForCheck();
    }

    getTotalStock(): number {
        return this.lotsFiltres.reduce((sum, l) => sum + (l.quantiteRestante ?? 0), 0);
    }

    get nbLotsExpires(): number {
        return this.lotsFiltres.filter((l) => l.estExpire).length;
    }

    getDlcSeverity(lot: LotResponse): 'danger' | 'warn' | 'success' | 'secondary' {
        if (!lot.expiresAt) return 'secondary';
        if (lot.estExpire) return 'danger';
        if (lot.dlcProche) return 'warn';
        return 'success';
    }

    openDegrever(lot: LotResponse): void {
        this.selectedLot = lot;
        this.showDegreverDialog = true;
    }

    openTransfert(lot: LotResponse): void {
        this.selectedLot = lot;
        this.showTransfertDialog = true;
    }

    openEntree(): void {
        this.showEntreeDialog = true;
    }

    onDegreverSaved(): void {
        this.messageService.add({ severity: 'success', summary: 'Succès', detail: 'Lot dégrevé avec succès.' });
        this.loadLots();
    }

    onTransfertSaved(): void {
        this.messageService.add({ severity: 'success', summary: 'Succès', detail: 'Lot transféré avec succès.' });
        this.loadLots();
    }

    onEntreeSaved(result: { success: boolean; message: string }): void {
        this.messageService.add({
            severity: result.success ? 'success' : 'error',
            summary: result.success ? 'Succès' : 'Erreur',
            detail: result.message
        });
        if (result.success) {
            this.loadLots();
            this.loadProduit();
        }
    }

    retour(): void {
        this.router.navigate(['/produits']);
    }
}
