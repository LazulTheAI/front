import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { distinctUntilChanged, Subject, takeUntil } from 'rxjs';

import { MobileEntrepotService } from '@/app/modules/mobile/services/mobile-entrepot.service';
import { EntrepotResponse, ProductionControllerService, ProduitControllerService, ProduitResponse, RecetteControllerService, RecetteResponse, RunProductionResponse } from '@/app/modules/openapi';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { DividerModule } from 'primeng/divider';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { SkeletonModule } from 'primeng/skeleton';
import { TabsModule } from 'primeng/tabs';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';

@Component({
    selector: 'app-mobile-fabrication',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, FormsModule, ButtonModule, InputTextModule, InputNumberModule, SelectModule, DialogModule, TagModule, DividerModule, SkeletonModule, ToastModule, TabsModule],
    providers: [MessageService],
    templateUrl: './mobile-fabrication.component.html',
    styleUrl: './mobile-fabrication.component.scss'
})
export class MobileFabricationComponent implements OnInit, OnDestroy {
    private destroy$ = new Subject<void>();
    runsEnCours: RunProductionResponse[] = [];
    runsPlanifies: RunProductionResponse[] = [];
    loadingRuns = false;
    activeTab = 0; // 0 = planifiés, 1 = en cours

    produits: ProduitResponse[] = [];
    allRecettes: RecetteResponse[] = [];
    entrepots: EntrepotResponse[] = [];

    produitOptions: { label: string; value: number }[] = [];
    recetteOptions: { label: string; value: number }[] = [];
    selectedRecette: RecetteResponse | null = null;

    showPlanifierDialog = false;
    planning = false;

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
        private mobileEntrepotService: MobileEntrepotService,
        private messageService: MessageService,
        private cdr: ChangeDetectorRef
    ) {}

    ngOnInit(): void {
        this.loadReferentials();

        // Reload dès que l'entrepôt change — BehaviorSubject émet immédiatement
        // la valeur courante, donc loadRuns() est appelé une première fois ici
        this.mobileEntrepotService.selected$
            .pipe(
                distinctUntilChanged((a, b) => a?.id === b?.id),
                takeUntil(this.destroy$)
            )
            .subscribe(() => {
                this.loadingRuns = true;
                this.cdr.markForCheck();
                this.loadRuns();
            });
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    get entrepotSelectionne() {
        return this.mobileEntrepotService.selected;
    }

    loadRuns(): void {
        this.loadingRuns = true;
        this.cdr.markForCheck();
        const entrepotId = this.mobileEntrepotService.selected?.id ?? undefined;

        // Charger EN_COURS
        this.productionService.listerProductions(0, 50, 'createdAt', 'desc', 'EN_COURS', entrepotId).subscribe({
            next: (data: any) => {
                this.runsEnCours = data.content ?? [];
                this.cdr.markForCheck();
            }
        });

        // Charger PLANIFIE
        this.productionService.listerProductions(0, 50, 'createdAt', 'asc', 'PLANIFIE', entrepotId).subscribe({
            next: (data: any) => {
                this.runsPlanifies = data.content ?? [];
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
                this.produits = (data.content ?? (Array.isArray(data) ? data : [])).filter((p: ProduitResponse) => p.actif !== false && p.recettes && (p.recettes as any[]).length > 0);
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
        this.mobileEntrepotService.entrepots$.subscribe((list) => {
            this.entrepots = list;
            this.cdr.markForCheck();
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

    openPlanifier(): void {
        const defaultEntrepot = this.mobileEntrepotService.selected?.id ?? null;
        this.newRun = { produitId: null, recetteId: null, batches: null, entrepotId: defaultEntrepot, notes: '' };
        this.selectedRecette = null;
        this.recetteOptions = [];
        this.showPlanifierDialog = true;
        this.cdr.markForCheck();
    }

    planifierRun(ngForm: NgForm): void {
        if (ngForm.invalid || !this.newRun.recetteId || !this.newRun.batches || !this.newRun.entrepotId) return;
        this.planning = true;
        this.cdr.markForCheck();

        this.productionService
            .planifierRunProduction({
                recetteId: this.newRun.recetteId,
                batches: this.newRun.batches,
                entrepotId: this.newRun.entrepotId,
                notes: this.newRun.notes || undefined
            })
            .subscribe({
                next: () => {
                    this.messageService.add({ severity: 'success', summary: 'Planifié', detail: 'Run ajouté à la file' });
                    this.showPlanifierDialog = false;
                    this.planning = false;
                    this.activeTab = 0; // retour onglet planifiés
                    this.loadRuns();
                    this.cdr.markForCheck();
                },
                error: () => {
                    this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de planifier' });
                    this.planning = false;
                    this.cdr.markForCheck();
                }
            });
    }

    demarrerRun(run: RunProductionResponse): void {
        if (!run.id) return;
        this.productionService.demarrerRunProduction(run.id).subscribe({
            next: () => {
                this.messageService.add({ severity: 'success', summary: 'Démarré', detail: `${run.recetteNom} en cours` });
                this.activeTab = 1; // switcher sur onglet en cours
                this.loadRuns();
                this.cdr.markForCheck();
            },
            error: (err: any) => {
                this.messageService.add({ severity: 'error', summary: 'Erreur', detail: err?.error?.message ?? 'Impossible de démarrer' });
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

        this.productionService.terminerRunProduction(this.closingRun.id).subscribe({
            next: (result) => {
                this.messageService.add({
                    severity: 'success',
                    summary: 'Clôturé',
                    detail: `${result.recetteNom} — ${result.unitesProduite} unités`
                });
                this.showCloturerDialog = false;
                this.closing = false;
                this.closingRun = null;
                this.loadRuns();
                this.cdr.markForCheck();
            },
            error: () => {
                this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de clôturer' });
                this.closing = false;
                this.cdr.markForCheck();
            }
        });
    }
}
