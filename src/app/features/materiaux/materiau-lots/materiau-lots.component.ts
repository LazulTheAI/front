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
import { TableModule } from 'primeng/table';
import { Tag } from 'primeng/tag';
import { Toast } from 'primeng/toast';
import { Toolbar } from 'primeng/toolbar';
import { Tooltip } from 'primeng/tooltip';

import { EntrepotControllerService, EntrepotResponse, LotResponse, MateriauControllerService, MateriauResponse } from '@/app/modules/openapi';
import { DegreverLotDialogComponent } from '../degrever-lot-dialog/degrever-lot-dialog.component';
import { EntreeStockDialogComponent } from '../entree-stock-dialog/entree-stock-dialog.component';

interface SelectOption {
    label: string;
    value: number | null;
}

@Component({
    selector: 'app-materiau-lots',
    templateUrl: './materiau-lots.component.html',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, FormsModule, RouterModule, TranslocoModule, Toast, Button, Tag, Select, TableModule, Tooltip, Toolbar, DegreverLotDialogComponent, EntreeStockDialogComponent],
    providers: [MessageService]
})
export class MateriauLotsComponent implements OnInit, OnDestroy {
    materiau: MateriauResponse | null = null;
    lots: LotResponse[] = [];
    lotsFiltres: LotResponse[] = [];
    loading = true;
    materiauId!: number;

    // Filtre entrepôt
    entrepots: EntrepotResponse[] = [];
    entrepotOptions: SelectOption[] = [];
    filtreEntrepotId: number | null = null;

    // Dialogs
    showDegreverDialog = false;
    showEntreeDialog = false;
    selectedLot: LotResponse | null = null;

    private destroy$ = new Subject<void>();

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private materiauService: MateriauControllerService,
        private entrepotService: EntrepotControllerService,
        private messageService: MessageService,
        private cdr: ChangeDetectorRef
    ) {}

    ngOnInit(): void {
        this.materiauId = Number(this.route.snapshot.paramMap.get('id'));
        this.loadEntrepots();
        this.loadMateriau();
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
                    this.entrepotOptions = [{ label: 'Tous les entrepôts', value: null }, ...list.map((e) => ({ label: e.nom!, value: e.id! }))];
                    this.cdr.markForCheck();
                }
            });
    }

    private loadMateriau(): void {
        this.materiauService
            .detailMateriau(this.materiauId)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (m) => {
                    this.materiau = m;
                    this.cdr.markForCheck();
                },
                error: () => this.router.navigate(['/materiaux'])
            });
    }

    loadLots(): void {
        this.loading = true;
        this.materiauService
            .listerLotsMateriau(this.materiauId)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (lots) => {
                    this.lots = lots;
                    this.applyFiltre();
                    this.loading = false;
                    this.cdr.markForCheck();
                },
                error: () => {
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Erreur',
                        detail: 'Impossible de charger les lots.'
                    });
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

    openDegrever(lot: LotResponse): void {
        this.selectedLot = lot;
        this.showDegreverDialog = true;
    }

    openEntree(): void {
        this.showEntreeDialog = true;
    }

    onDegreverSaved(): void {
        this.messageService.add({
            severity: 'success',
            summary: 'Succès',
            detail: 'Lot dégrevé avec succès.'
        });
        this.loadLots();
    }

    onEntreeSaved(): void {
        this.messageService.add({
            severity: 'success',
            summary: 'Succès',
            detail: 'Entrée en stock enregistrée.'
        });
        this.loadLots();
        this.loadMateriau();
    }

    retour(): void {
        this.router.navigate(['/materiaux']);
    }

    isDlcProche(dlc: string | null): boolean {
        if (!dlc) return false;
        return new Date(dlc).getTime() - Date.now() < 30 * 24 * 60 * 60 * 1000;
    }

    getDlcSeverity(lot: LotResponse): 'danger' | 'warn' | 'success' | 'secondary' {
        if (!lot.expiresAt) return 'secondary';
        if (lot.estExpire) return 'danger';
        if (lot.dlcProche) return 'warn';
        return 'success';
    }

    getTotalStock(): number {
        return this.lotsFiltres.reduce((sum, l) => sum + (l.quantiteRestante ?? 0), 0);
    }

    get nbLotsExpires(): number {
        return this.lotsFiltres.filter((l) => l.estExpire).length;
    }
}
