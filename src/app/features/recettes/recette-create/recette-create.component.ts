// recette-create.component.ts
import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

import { CreerRecetteRequest, MateriauControllerService, RecetteControllerService } from '@/app/modules/openapi';
import { APP_CURRENCY } from '@/app/core/currency.config';
import { TranslocoModule } from '@jsverse/transloco';
import { AccordionModule } from 'primeng/accordion';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DividerModule } from 'primeng/divider';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { PickListModule } from 'primeng/picklist';
import { ProgressBarModule } from 'primeng/progressbar';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';

export interface RecetteMeta {
    nom: string;
    quantiteProduite: number | null;
    uniteProduite: string;
    dureeFabricationMinutes: number | null;
    coutVariableParBatch: number | null;
    notes: string;
}

export interface IngredientRow {
    materiauId: number;
    materiauNom: string;
    unite: string;
    uniteOverride: string;
    stockTotal: number;
    coutUnitaire: number | null;
    enAlerte: boolean;
    quantite: number | null;
}

@Component({
    selector: 'app-recette-create',
    standalone: true,
    imports: [
        CommonModule,
        TranslocoModule,
        FormsModule,
        ButtonModule,
        InputTextModule,
        InputNumberModule,
        TextareaModule,
        PickListModule,
        AccordionModule,
        ToastModule,
        TooltipModule,
        TagModule,
        DividerModule,
        SelectModule,
        ConfirmDialogModule,
        ProgressBarModule
    ],
    providers: [MessageService, ConfirmationService],
    templateUrl: './recette-create.component.html'
})
export class RecetteCreateComponent implements OnInit, OnDestroy {
    private destroy$ = new Subject<void>();

    step = 0;
    readonly STEPS = [
        { label: 'Informations', icon: 'pi-file-edit' },
        { label: 'Ingrédients', icon: 'pi-list' },
        { label: 'Quantités', icon: 'pi-calculator' },
        { label: 'Récapitulatif', icon: 'pi-check-square' }
    ];

    meta: RecetteMeta = {
        nom: '',
        quantiteProduite: null,
        uniteProduite: '',
        dureeFabricationMinutes: null,
        coutVariableParBatch: null as number | null,
        notes: ''
    };

    // PickList
    materiauxSource: any[] = [];
    materiauxTarget: any[] = [];

    // Étape 3 — lignes ingrédients
    ingredientsSelectionnes: IngredientRow[] = [];

    // Duplication
    recettesExistantes: any[] = [];
    loadingRecettes = false;
    protected readonly appCurrency = APP_CURRENCY;
    selectedDupliqueId: number | null = null;

    saving = false;

    constructor(
        private router: Router,
        private recetteService: RecetteControllerService,
        private materiauService: MateriauControllerService,
        private messageService: MessageService,
        private confirmationService: ConfirmationService
    ) {}

    ngOnInit(): void {
        this.loadMateriaux();
        this.loadRecettesExistantes();
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    // ─── Chargements ───────────────────────────────────────────

    private loadMateriaux(): void {
        this.materiauService
            .tousLesMateriaux()
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (list) => {
                    this.materiauxSource = list.map((m) => ({
                        ...m,
                        uniteOverride: m.unite
                    }));
                },
                error: () => this.toast('error', 'Erreur', 'Impossible de charger les matériaux')
            });
    }

    private loadRecettesExistantes(): void {
        this.loadingRecettes = true;
        this.recetteService
            .listerRecetteResponse()
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (list) => {
                    this.recettesExistantes = list.map((r) => ({
                        value: r.id,
                        label: r.nom,
                        data: r
                    }));
                    this.loadingRecettes = false;
                },
                error: () => {
                    this.loadingRecettes = false;
                }
            });
    }

    // ─── Duplication ───────────────────────────────────────────

    onDupliquer(): void {
        if (!this.selectedDupliqueId) return;
        const source = this.recettesExistantes.find((r) => r.value === this.selectedDupliqueId)?.data;
        if (!source) return;

        this.meta = {
            nom: `${source.nom} (copie)`,
            quantiteProduite: source.quantiteProduite,
            uniteProduite: source.uniteProduite,
            dureeFabricationMinutes: source.dureeFabricationMinutes ?? null,
            coutVariableParBatch: source.coutVariableParBatch ?? null,
            notes: source.notes ?? ''
        };

        if (source.ingredients?.length) {
            const sourceIds = new Set(source.ingredients.map((i: any) => i.materiauId));
            this.materiauxTarget = this.materiauxSource.filter((m) => sourceIds.has(m.id));
            this.materiauxSource = this.materiauxSource.filter((m) => !sourceIds.has(m.id));
            this.buildIngredientRows();
            source.ingredients.forEach((ing: any) => {
                const row = this.ingredientsSelectionnes.find((r) => r.materiauId === ing.materiauId);
                if (row) {
                    row.quantite = ing.quantite;
                    row.uniteOverride = ing.uniteOverride ?? ing.unite;
                }
            });
        }

        this.messageService.add({
            severity: 'info',
            summary: 'Recette dupliquée',
            detail: `Données pré-remplies depuis "${source.nom}"`
        });
    }

    // ─── Navigation étapes ─────────────────────────────────────

    nextStep(): void {
        if (this.step === 0 && !this.validateStep0()) return;
        if (this.step === 1 && this.materiauxTarget.length === 0) {
            this.toast('warn', 'Attention', 'Sélectionnez au moins un ingrédient');
            return;
        }
        if (this.step === 1) this.buildIngredientRows();
        this.step++;
    }

    prevStep(): void {
        if (this.step > 0) this.step--;
    }

    goToStep(index: number): void {
        if (index < this.step) this.step = index;
    }

    private validateStep0(): boolean {
        if (!this.meta.nom?.trim()) {
            this.toast('warn', 'Champ requis', 'Le nom de la recette est obligatoire');
            return false;
        }
        if (!this.meta.quantiteProduite || !this.meta.uniteProduite?.trim()) {
            this.toast('warn', 'Champ requis', 'La production par batch est obligatoire');
            return false;
        }
        return true;
    }

    // ─── PickList ──────────────────────────────────────────────

    onMoveToSource(event: any): void {
        // retiré de target, rien à faire de spécial
    }

    onMoveAllToTarget(event: any): void {
        // tout déplacé
    }

    onMoveAllToSource(event: any): void {
        // tout remis
    }

    private buildIngredientRows(): void {
        const existing = new Map(this.ingredientsSelectionnes.map((r) => [r.materiauId, r]));
        this.ingredientsSelectionnes = this.materiauxTarget.map((m) => {
            const prev = existing.get(m.id);
            return (
                prev ?? {
                    materiauId: m.id,
                    materiauNom: m.nom,
                    unite: m.unite,
                    uniteOverride: m.unite,
                    stockTotal: m.stockTotal ?? 0,
                    coutUnitaire: m.coutUnitaire ?? null,
                    enAlerte: m.enAlerte ?? false,
                    quantite: null
                }
            );
        });
    }

    // ─── Calculs coût ──────────────────────────────────────────

    get coutTheoriqueTotal(): number {
        return this.ingredientsSelectionnes.reduce((acc, ing) => {
            if (ing.coutUnitaire && ing.quantite) {
                return acc + ing.coutUnitaire * ing.quantite;
            }
            return acc;
        }, 0);
    }

    get coutParUnite(): number {
        if (!this.meta.quantiteProduite || this.meta.quantiteProduite <= 0) return 0;
        return this.coutTheoriqueTotal / this.meta.quantiteProduite;
    }

    get ingredientsValides(): boolean {
        return this.ingredientsSelectionnes.length > 0 && this.ingredientsSelectionnes.every((i) => i.quantite != null && i.quantite > 0);
    }

    get progressionPct(): number {
        return Math.round((this.step / (this.STEPS.length - 1)) * 100);
    }

    // ─── Soumission ────────────────────────────────────────────

    submitCreate(): void {
        if (!this.ingredientsValides) {
            this.toast('warn', 'Incomplet', 'Renseignez toutes les quantités');
            return;
        }
        this.saving = true;

        const payload: CreerRecetteRequest = {
            nom: this.meta.nom,
            quantiteProduite: this.meta.quantiteProduite!,
            uniteProduite: this.meta.uniteProduite,
            dureeFabricationMinutes: this.meta.dureeFabricationMinutes ?? undefined,
            notes: this.meta.notes ?? undefined,
            ingredients: this.ingredientsSelectionnes.map((i) => ({
                materiauId: i.materiauId,
                quantite: i.quantite!,
                unite: i.unite,
                uniteOverride: i.uniteOverride || i.unite
            }))
        };

        this.recetteService
            .creerRecette(payload)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (created) => {
                    this.saving = false;
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Recette créée',
                        detail: `"${created.nom}" a été créée avec succès`
                    });
                    setTimeout(() => this.router.navigate(['/recettes']), 1200);
                },
                error: () => {
                    this.saving = false;
                    this.toast('error', 'Erreur', 'La création a échoué');
                }
            });
    }

    get ingredientsRenseignesCount(): number {
        return this.ingredientsSelectionnes.filter((i) => i.quantite != null && i.quantite > 0).length;
    }

    get progressionIngredientsPct(): number {
        if (this.ingredientsSelectionnes.length === 0) return 0;
        return Math.round((this.ingredientsRenseignesCount / this.ingredientsSelectionnes.length) * 100);
    }

    confirmCancel(): void {
        this.confirmationService.confirm({
            message: 'Abandonner la création de cette recette ?',
            header: 'Confirmer',
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Oui, abandonner',
            rejectLabel: 'Continuer',
            accept: () => this.router.navigate(['/recettes'])
        });
    }

    private toast(severity: string, summary: string, detail: string): void {
        this.messageService.add({ severity, summary, detail, life: 4000 });
    }
}
