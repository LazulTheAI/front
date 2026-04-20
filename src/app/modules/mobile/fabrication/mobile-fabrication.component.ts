import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';

import {
    EntrepotControllerService,
    EntrepotResponse,
    LancerRunRequest,
    ProductionControllerService,
    ProduitControllerService,
    ProduitResponse,
    RecetteControllerService,
    RecetteResponse,
    RunProductionResponse
} from '@/app/modules/openapi';
import { MessageService, ConfirmationService } from 'primeng/api';
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

    produits: ProduitResponse[] = [];
    allRecettes: RecetteResponse[] = [];
    entrepots: EntrepotResponse[] = [];

    produitOptions: { label: string; value: number }[] = [];
    recetteOptions: { label: string; value: number }[] = [];
    selectedRecette: RecetteResponse | null = null;

    showLancerDialog = false;
    launching = false;

    showCloturerDialog = false;
    closingRun: RunProductionResponse | null = null;
    closing = false;

    newRun = {
        produitId: null as number | null,
        recetteId: null as number | null,
        batches: null as number | null,
        entrepotId: null as number | null,
        notes: ''
    };

    constructor(
        private productionService: ProductionControllerService,
        private produitService: ProduitControllerService,
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
        this.produitService.listerProduit(0, 500, 'nom', 'asc', undefined).subscribe({
            next: (data: any) => {
                this.produits = (data.content ?? (Array.isArray(data) ? data : [])).filter(
                    (p: ProduitResponse) => p.actif !== false && p.recettes && (p.recettes as any[]).length > 0
                );
                this.produitOptions = this.produits.map((p) => ({
                    label: p.sku ? `${p.nom} (${p.sku})` : p.nom!,
                    value: p.id!
                }));
                this.cdr.markForCheck();
            }
        });
        this.recetteService.listerRecetteResponse(false).subscribe({
            next: (data) => {
                this.allRecettes = (Array.isArray(data) ? data : []).filter((r: RecetteResponse) => !r.archive);
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

    onProduitChange(): void {
        this.newRun.recetteId = null;
        this.selectedRecette = null;
        const produit = this.produits.find((p) => p.id === this.newRun.produitId) ?? null;
        if (!produit) {
            this.recetteOptions = [];
            this.cdr.markForCheck();
            return;
        }
        const produitRecettes: any[] = (produit as any).recettes ?? [];
        this.recetteOptions = produitRecettes.map((pr: any) => ({
            label: pr.recetteNom + (pr.estPrincipale ? ' ★' : ''),
            value: pr.recetteId
        }));
        const principale = produitRecettes.find((pr: any) => pr.estPrincipale) ?? produitRecettes[0];
        if (principale) {
            this.newRun.recetteId = principale.recetteId;
            this.selectedRecette = this.allRecettes.find((r) => r.id === principale.recetteId) ?? null;
        }
        this.cdr.markForCheck();
    }

    onRecetteChange(): void {
        this.selectedRecette = this.allRecettes.find((r) => r.id === this.newRun.recetteId) ?? null;
        this.cdr.markForCheck();
    }

    get entrepotOptions() {
        return this.entrepots.map((e) => ({ label: e.nom!, value: e.id! }));
    }

    openLancer(): void {
        this.newRun = { produitId: null, recetteId: null, batches: null, entrepotId: null, notes: '' };
        this.selectedRecette = null;
        this.recetteOptions = [];
        this.showLancerDialog = true;
        this.cdr.markForCheck();
    }

    lancerRun(ngForm: NgForm): void {
        if (ngForm.invalid || !this.newRun.recetteId || !this.newRun.batches || !this.newRun.entrepotId) return;
        this.launching = true;
        this.cdr.markForCheck();

        const req: LancerRunRequest = {
            recetteId: this.newRun.recetteId,
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
