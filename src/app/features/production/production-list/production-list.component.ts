// production-list.component.ts
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';

import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DividerModule } from 'primeng/divider';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { ToolbarModule } from 'primeng/toolbar';
import { TooltipModule } from 'primeng/tooltip';

import { EntrepotControllerService, EntrepotResponse, ProductionControllerService, ReportControllerService, RunProductionResponse } from '@/app/modules/openapi';

import { AnnulerRunDialogComponent } from '../annuler-run-dialog/annuler-run-dialog.component';
import { LancerRunDialogComponent } from '../lancer-run-dialog/lancer-run-dialog.component';
import { PlanifierRunDialogComponent } from '../planifier-run-dialog/planifier-run-dialog.component';
import { RunDetailDialogComponent } from '../run-detail-dialog/run-detail-dialog.component';

@Component({
    selector: 'app-production-list',
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
        SelectModule,
        DividerModule,
        InputTextModule,
        PlanifierRunDialogComponent,
        LancerRunDialogComponent,
        AnnulerRunDialogComponent,
        RunDetailDialogComponent
    ],
    providers: [MessageService, ConfirmationService],
    templateUrl: './production-list.component.html'
})
export class ProductionListComponent implements OnInit, OnDestroy {
    runs: RunProductionResponse[] = [];
    totalRecords = 0;
    loading = false;
    executingRunId: number | null = null;
    exportingRunId: number | null = null;

    // Pagination & tri
    page = 0;
    size = 15;
    sortBy = 'createdAt';
    sortDir = 'desc';

    // Entrepôts
    entrepots: EntrepotResponse[] = [];
    entrepotOptions: { label: string; value: number | null }[] = [];

    // Filtres
    filtreStatut: string | null = null;
    filtreEntrepotId: number | null = null;

    // Recherche
    search = '';
    private search$ = new Subject<string>();

    statutOptions: { label: string; value: string | null }[] = [
        { label: 'Tous les statuts', value: null },
        { label: 'Planifié', value: 'PLANIFIE' },
        { label: 'En cours', value: 'EN_COURS' },
        { label: 'Terminé', value: 'TERMINE' },
        { label: 'Annulé', value: 'ANNULE' }
    ];

    // Dialogs
    showPlanifierDialog = false;
    showLancerDialog = false;
    showAnnulerDialog = false;
    showDetailDialog = false;
    selectedRun: RunProductionResponse | null = null;

    constructor(
        private productionService: ProductionControllerService,
        private reportService: ReportControllerService,
        private entrepotService: EntrepotControllerService,
        private messageService: MessageService,
        private cdr: ChangeDetectorRef
    ) {}

    ngOnInit(): void {
        this.entrepotService.listerEntrepot().subscribe({
            next: (data) => {
                this.entrepots = data.filter((e) => e.actif);
                this.entrepotOptions = [{ label: 'Tous les entrepôts', value: null }, ...this.entrepots.map((e) => ({ label: e.nom!, value: e.id! }))];
                this.cdr.markForCheck();
            }
        });

        this.search$.pipe(debounceTime(400), distinctUntilChanged()).subscribe((value) => {
            this.search = value;
            this.page = 0;
            this.loadRuns();
        });

        this.loadRuns();
    }

    ngOnDestroy(): void {
        this.search$.complete();
    }

    onSearchInput(value: string): void {
        this.search$.next(value);
    }

    loadRuns(): void {
        this.loading = true;
        this.productionService.listerProductions(this.page, this.size, this.sortBy, this.sortDir, this.filtreStatut ?? undefined, this.filtreEntrepotId ?? undefined, this.search || undefined).subscribe({
            next: (data: any) => {
                this.runs = data.content;
                this.totalRecords = data.totalElements;
                this.loading = false;
                this.cdr.markForCheck();
            },
            error: () => {
                this.messageService.add({
                    severity: 'error',
                    summary: 'Erreur',
                    detail: 'Impossible de charger les runs'
                });
                this.loading = false;
                this.cdr.markForCheck();
            }
        });
    }

    isDlcProche(dlc: string | null | undefined): boolean {
        if (!dlc) return false;
        const limite = new Date();
        limite.setDate(limite.getDate() + 30);
        return new Date(dlc) <= limite;
    }

    onLazyLoad(event: TableLazyLoadEvent): void {
        this.page = Math.floor((event.first ?? 0) / (event.rows ?? this.size));
        this.size = event.rows ?? this.size;

        if (event.sortField) {
            this.sortBy = Array.isArray(event.sortField) ? event.sortField[0] : event.sortField;
            this.sortDir = event.sortOrder === -1 ? 'desc' : 'asc';
        }

        this.loadRuns();
    }

    onFiltreChange(): void {
        this.page = 0;
        this.loadRuns();
    }

    resetFiltres(): void {
        this.filtreStatut = null;
        this.filtreEntrepotId = null;
        this.search = '';
        this.page = 0;
        this.loadRuns();
    }

    get filtreEntrepotLabel(): string {
        if (!this.filtreEntrepotId) return '';
        return this.entrepots.find((e) => e.id === this.filtreEntrepotId)?.nom ?? '';
    }

    get hasFiltresActifs(): boolean {
        return this.filtreStatut !== null || this.filtreEntrepotId !== null || this.search.length > 0;
    }

    openDetail(run: RunProductionResponse): void {
        this.selectedRun = run;
        this.showDetailDialog = true;
        this.cdr.markForCheck();
    }

    openAnnuler(run: RunProductionResponse, event: Event): void {
        event.stopPropagation();
        this.selectedRun = run;
        this.showAnnulerDialog = true;
        this.cdr.markForCheck();
    }

    executerRun(run: RunProductionResponse, event: Event): void {
        event.stopPropagation();
        if (!run.id) return;
        this.executingRunId = run.id;
        this.cdr.markForCheck();

        this.productionService.executerRunProduction(run.id).subscribe({
            next: () => {
                this.executingRunId = null;
                this.messageService.add({
                    severity: 'success',
                    summary: 'Run exécuté',
                    detail: `Run #${run.id} — ${run.recetteNom} terminé avec succès`
                });
                this.loadRuns();
            },
            error: (err: any) => {
                this.executingRunId = null;
                this.messageService.add({
                    severity: 'error',
                    summary: 'Erreur',
                    detail: err?.error?.message ?? "Impossible d'exécuter ce run"
                });
                this.cdr.markForCheck();
            }
        });
    }

    exportCsv(run: RunProductionResponse, event: Event): void {
        event.stopPropagation();
        if (!run.id) return;
        this.exportingRunId = run.id;
        this.cdr.markForCheck();

        this.reportService.exportCsv(run.id).subscribe({
            next: (data: any) => {
                const blob = data instanceof Blob ? data : new Blob([data], { type: 'text/csv' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `tracabilite-run-${run.id}.csv`;
                a.click();
                window.URL.revokeObjectURL(url);
                this.exportingRunId = null;
                this.cdr.markForCheck();
            },
            error: () => {
                this.messageService.add({
                    severity: 'error',
                    summary: 'Erreur',
                    detail: 'Export CSV impossible'
                });
                this.exportingRunId = null;
                this.cdr.markForCheck();
            }
        });
    }

    onRunSaved(result: { success: boolean; message: string }): void {
        this.showPlanifierDialog = false;
        this.showLancerDialog = false;
        this.messageService.add({
            severity: result.success ? 'success' : 'error',
            summary: result.success ? 'Succès' : 'Erreur',
            detail: result.message
        });
        if (result.success) this.loadRuns();
        this.cdr.markForCheck();
    }

    onRunAnnule(result: { success: boolean; message: string }): void {
        this.showAnnulerDialog = false;
        this.messageService.add({
            severity: result.success ? 'success' : 'error',
            summary: result.success ? 'Annulé' : 'Erreur',
            detail: result.message
        });
        if (result.success) this.loadRuns();
        this.cdr.markForCheck();
    }

    getStatutSeverity(statut: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
        const map: Record<string, 'success' | 'info' | 'warn' | 'danger' | 'secondary'> = {
            TERMINE: 'success',
            EN_COURS: 'info',
            PLANIFIE: 'warn',
            ANNULE: 'danger'
        };
        return map[statut] ?? 'secondary';
    }

    getStatutLabel(statut: string): string {
        const map: Record<string, string> = {
            PLANIFIE: 'Planifié',
            EN_COURS: 'En cours',
            TERMINE: 'Terminé',
            ANNULE: 'Annulé'
        };
        return map[statut] ?? statut;
    }

    canExecuter(run: RunProductionResponse): boolean {
        return run.statut === 'PLANIFIE';
    }
    canAnnuler(run: RunProductionResponse): boolean {
        return run.statut === 'PLANIFIE' || run.statut === 'EN_COURS';
    }
    canExport(run: RunProductionResponse): boolean {
        return run.statut === 'TERMINE';
    }
}
