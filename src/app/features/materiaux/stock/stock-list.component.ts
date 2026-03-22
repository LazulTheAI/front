import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';

import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { ToolbarModule } from 'primeng/toolbar';
import { TooltipModule } from 'primeng/tooltip';

import { EntrepotControllerService, EntrepotResponse, MateriauControllerService, MateriauResponse } from '@/app/modules/openapi';

import { AjustementDialogComponent } from '../ajustement-dialog/ajustement-dialog.component';
import { EntreeStockDialogComponent } from '../entree-stock-dialog/entree-stock-dialog.component';
import { HistoriqueDialogComponent } from '../historique-dialog/historique-dialog.component';

@Component({
    selector: 'app-stock-list',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, FormsModule, TableModule, ButtonModule, TagModule, TooltipModule, ToastModule, ToolbarModule, InputTextModule, EntreeStockDialogComponent, AjustementDialogComponent, HistoriqueDialogComponent],
    providers: [MessageService],
    templateUrl: './stock-list.component.html'
})
export class StockListComponent implements OnInit, OnDestroy {
    materiaux: MateriauResponse[] = [];
    totalRecords = 0;
    loading = false;

    page = 0;
    size = 20;
    sortBy = 'nom';
    sortDir = 'asc';

    search = '';
    filtreEntrepotId: number | null = null;
    private search$ = new Subject<string>();

    entrepots: EntrepotResponse[] = [];

    showEntreeDialog = false;
    showAjustementDialog = false;
    showHistoriqueDialog = false;
    selectedMateriau: MateriauResponse | null = null;

    constructor(
        private materiauService: MateriauControllerService,
        private entrepotService: EntrepotControllerService,
        private messageService: MessageService,
        private cdr: ChangeDetectorRef
    ) {}

    ngOnInit(): void {
        this.entrepotService.listerEntrepot().subscribe({
            next: (data) => {
                this.entrepots = data.filter((e) => e.actif);
                this.cdr.markForCheck();
            }
        });

        this.search$.pipe(debounceTime(400), distinctUntilChanged()).subscribe((v) => {
            this.search = v;
            this.page = 0;
            this.load();
        });

        this.load();
    }

    ngOnDestroy(): void {
        this.search$.complete();
    }

    load(): void {
        this.loading = true;
        this.materiauService.listerMateriau(false, this.page, this.size, this.sortBy, this.sortDir, this.search || undefined, this.filtreEntrepotId ?? undefined).subscribe({
            next: (data: any) => {
                this.materiaux = [...(data.content ?? [])];
                this.totalRecords = data.totalElements ?? 0;
                this.loading = false;
                this.cdr.detectChanges();
            },
            error: () => {
                this.loading = false;
                this.cdr.detectChanges();
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
        this.load();
    }

    onSearchInput(v: string): void {
        this.search$.next(v);
    }

    onFiltreEntrepot(id: number | null): void {
        this.filtreEntrepotId = id;
        this.page = 0;
        this.load();
    }

    get nbAlertes(): number {
        return this.materiaux.filter((m) => m.enAlerte).length;
    }

    isDlcProche(dlc: string | Date | null | undefined): boolean {
        if (!dlc) return false;
        const limite = new Date();
        limite.setDate(limite.getDate() + 30);
        return new Date(dlc) <= limite;
    }

    openEntreeStock(m: MateriauResponse): void {
        this.selectedMateriau = m;
        this.showEntreeDialog = true;
    }
    openAjustement(m: MateriauResponse): void {
        this.selectedMateriau = m;
        this.showAjustementDialog = true;
    }
    openHistorique(m: MateriauResponse): void {
        this.selectedMateriau = m;
        this.showHistoriqueDialog = true;
    }

    onStockUpdated(result: { success: boolean; message: string }): void {
        this.showEntreeDialog = false;
        this.showAjustementDialog = false;
        this.messageService.add({
            severity: result.success ? 'success' : 'error',
            summary: result.success ? 'Succès' : 'Erreur',
            detail: result.message
        });
        if (result.success) this.load();
    }
}
