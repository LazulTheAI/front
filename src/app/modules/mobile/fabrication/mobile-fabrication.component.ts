import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';

import {
    EntrepotControllerService,
    EntrepotResponse,
    LancerRunRequest,
    ProductionControllerService,
    RecetteControllerService,
    RecetteResponse,
    RunProductionResponse
} from '@/app/modules/openapi';
import { MessageService, ConfirmationService } from 'primeng/api';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { DividerModule } from 'primeng/divider';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { SelectModule } from 'primeng/select';
import { SkeletonModule } from 'primeng/skeleton';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';

@Component({
    selector: 'app-mobile-fabrication',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        CommonModule,
        FormsModule,
        ButtonModule,
        InputTextModule,
        InputNumberModule,
        AutoCompleteModule,
        SelectModule,
        DialogModule,
        TagModule,
        DividerModule,
        ProgressSpinnerModule,
        SkeletonModule,
        ToastModule,
        ConfirmDialogModule
    ],
    providers: [MessageService, ConfirmationService],
    templateUrl: './mobile-fabrication.component.html',
    styleUrl: './mobile-fabrication.component.scss'
})
export class MobileFabricationComponent implements OnInit {
    runs: RunProductionResponse[] = [];
    loadingRuns = false;

    allRecettes: RecetteResponse[] = [];
    filteredRecettes: RecetteResponse[] = [];
    entrepots: EntrepotResponse[] = [];

    showLancerDialog = false;
    launching = false;

    showCloturerDialog = false;
    selectedRun: RunProductionResponse | null = null;
    closingRun: RunProductionResponse | null = null;
    closing = false;

    newRun = {
        recette: null as RecetteResponse | null,
        batches: null as number | null,
        entrepotId: null as number | null,
        notes: ''
    };

    constructor(
        private productionService: ProductionControllerService,
        private recetteService: RecetteControllerService,
        private entrepotService: EntrepotControllerService,
        private messageService: MessageService,
        private confirmationService: ConfirmationService,
        private cdr: ChangeDetectorRef
    ) {}

    ngOnInit(): void {
        this.loadRuns();
        this.loadReferentials();
    }

    loadRuns(): void {
        this.loadingRuns = true;
        this.productionService.listerProductions(0, 50, 'createdAt', 'desc', 'EN_COURS').subscribe({
            next: (data: any) => {
                this.runs = data.content ?? [];
                this.loadingRuns = false;
                this.cdr.markForCheck();
            },
            error: () => {
                this.loadingRuns = false;
                this.cdr.markForCheck();
            }
        });
    }

    private loadReferentials(): void {
        this.recetteService.listerRecetteResponse(false).subscribe({
            next: (data) => {
                this.allRecettes = Array.isArray(data) ? data : [];
                this.cdr.markForCheck();
            }
        });
        this.entrepotService.listerEntrepot().subscribe({
            next: (data: any) => {
                const items = Array.isArray(data) ? data : (data.content ?? data.items ?? []);
                this.entrepots = items.filter((e: EntrepotResponse) => e.actif);
                this.cdr.markForCheck();
            }
        });
    }

    searchRecette(event: { query: string }): void {
        const q = event.query.toLowerCase();
        this.filteredRecettes = this.allRecettes.filter((r) => r.nom?.toLowerCase().includes(q));
    }

    get entrepotOptions() {
        return this.entrepots.map((e) => ({ label: e.nom!, value: e.id! }));
    }

    openLancer(): void {
        this.newRun = { recette: null, batches: null, entrepotId: null, notes: '' };
        this.showLancerDialog = true;
        this.cdr.markForCheck();
    }

    lancerRun(ngForm: NgForm): void {
        if (ngForm.invalid || !this.newRun.recette?.id || !this.newRun.batches || !this.newRun.entrepotId) return;
        this.launching = true;
        this.cdr.markForCheck();

        const req: LancerRunRequest = {
            recetteId: this.newRun.recette.id,
            batches: this.newRun.batches,
            entrepotId: this.newRun.entrepotId,
            notes: this.newRun.notes || undefined
        };

        this.productionService.lancerRunProduction(req).subscribe({
            next: (result) => {
                this.messageService.add({
                    severity: 'success',
                    summary: 'Run lancé',
                    detail: `${result.recetteNom} — ${result.batchsProduits} batch(s)`
                });
                this.showLancerDialog = false;
                this.launching = false;
                this.loadRuns();
                this.cdr.markForCheck();
            },
            error: () => {
                this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de lancer le run' });
                this.launching = false;
                this.cdr.markForCheck();
            }
        });
    }

    openCloturer(run: RunProductionResponse): void {
        this.closingRun = run;
        this.showCloturerDialog = true;
        this.cdr.markForCheck();
    }

    cloturerRun(): void {
        if (!this.closingRun?.id) return;
        this.closing = true;
        this.cdr.markForCheck();

        this.productionService.executerRunProduction(this.closingRun.id).subscribe({
            next: (result) => {
                this.messageService.add({
                    severity: 'success',
                    summary: 'Run clôturé',
                    detail: `${result.recetteNom} — ${result.unitesProduite} unités produites`
                });
                this.showCloturerDialog = false;
                this.closing = false;
                this.closingRun = null;
                this.loadRuns();
                this.cdr.markForCheck();
            },
            error: () => {
                this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de clôturer le run' });
                this.closing = false;
                this.cdr.markForCheck();
            }
        });
    }

    getStatutSeverity(statut: string | undefined): 'info' | 'warn' | 'success' | 'danger' {
        switch (statut) {
            case 'EN_COURS': return 'info';
            case 'PLANIFIE': return 'warn';
            case 'TERMINE': return 'success';
            case 'ANNULE': return 'danger';
            default: return 'info';
        }
    }
}
