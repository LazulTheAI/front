import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, ViewChild } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';

import { AccordionModule } from 'primeng/accordion';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { DividerModule } from 'primeng/divider';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { PickListModule } from 'primeng/picklist';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';

import { CreerRecetteRequest, MateriauControllerService, MateriauResponse, ModifierRecetteMetaRequest, RecetteControllerService, RecetteResponse } from '@/app/modules/openapi';
import { APP_CURRENCY } from '@/app/core/currency.config';
import { TranslocoModule } from '@jsverse/transloco';

export interface IngredientSelectionne {
    materiauId: number;
    materiauNom: string;
    unite: string;
    stockTotal: number;
    coutUnitaire: number | null;
    quantite: number | null;
    uniteOverride: string;
}

@Component({
    selector: 'app-recette-form',
    standalone: true,
    imports: [CommonModule, TranslocoModule, FormsModule, DialogModule, ButtonModule, InputTextModule, InputNumberModule, TextareaModule, DividerModule, ToastModule, PickListModule, TagModule, TooltipModule, AccordionModule],
    providers: [MessageService],
    templateUrl: './recette-form.component.html'
})
export class RecetteFormComponent implements OnChanges, OnInit {
    @Input() visible = false;
    @Output() visibleChange = new EventEmitter<boolean>();

    @ViewChild('ngForm') ngForm!: NgForm;

    @Input() recette: RecetteResponse | null = null;
    @Output() saved = new EventEmitter<void>();

    saving = false;
    protected readonly appCurrency = APP_CURRENCY;

    // 0 = infos, 1 = sélection matériaux (picklist), 2 = quantités (accordéons)
    step = 0;

    materiauxSource: MateriauResponse[] = [];
    materiauxTarget: MateriauResponse[] = [];
    ingredientsSelectionnes: IngredientSelectionne[] = [];

    meta = {
        nom: '',
        quantiteProduite: null as number | null,
        uniteProduite: '',
        dureeFabricationMinutes: null as number | null,
        coutVariableParBatch: null as number | null,
        notes: ''
    };

    get isEdit(): boolean {
        return this.recette != null && this.recette.id != null;
    }

    submitEdit(): void {
        if (!this.meta.nom || !this.meta.quantiteProduite || !this.meta.uniteProduite) {
            this.messageService.add({ severity: 'warn', summary: 'Attention', detail: 'Renseignez les champs obligatoires' });
            return;
        }
        this.saving = true;
        const req: ModifierRecetteMetaRequest = {
            nom: this.meta.nom,
            quantiteProduite: this.meta.quantiteProduite!,
            uniteProduite: this.meta.uniteProduite,
            dureeFabricationMinutes: this.meta.dureeFabricationMinutes ?? undefined,
            coutVariableParBatch: this.recette.coutVariableParBatch ?? null,
            notes: this.meta.notes || undefined
        };
        this.recetteService.modifierMetaRecette(this.recette!.id!, req).subscribe({
            next: () => this.handleSuccess('Recette modifiée'),
            error: () => this.handleError()
        });
    }

    submitStep0(): void {
        if (!this.meta.nom || !this.meta.quantiteProduite || !this.meta.uniteProduite) {
            this.messageService.add({ severity: 'warn', summary: 'Attention', detail: 'Renseignez les champs obligatoires' });
            return;
        }
        this.step = 1;
    }

    get coutTheoriqueTotal(): number {
        return this.ingredientsSelectionnes.filter((i) => i.coutUnitaire && i.quantite).reduce((s, i) => s + i.coutUnitaire! * i.quantite!, 0);
    }
    get dialogTitle(): string {
        return this.isEdit ? `Modifier "${this.recette?.nom}"` : 'Nouvelle recette';
    }

    get ingredientsValides(): boolean {
        return this.ingredientsSelectionnes.length > 0 && this.ingredientsSelectionnes.every((i) => i.quantite != null && i.quantite > 0);
    }

    get dialogWidth(): string {
        if (this.isEdit) return '560px';
        if (this.step === 1) return '92vw';
        return '620px';
    }

    onMoveToTarget(event: { items: MateriauResponse[] }): void {
        this.materiauxTarget = [...this.materiauxTarget, ...event.items];
        this.materiauxSource = this.materiauxSource.filter((m) => !event.items.some((i) => i.id === m.id));
    }

    onMoveToSource(event: { items: MateriauResponse[] }): void {
        this.materiauxSource = [...this.materiauxSource, ...event.items];
        this.materiauxTarget = this.materiauxTarget.filter((m) => !event.items.some((i) => i.id === m.id));
    }

    onMoveAllToTarget(event: { items: MateriauResponse[] }): void {
        this.materiauxTarget = [...this.materiauxTarget, ...event.items];
        this.materiauxSource = [];
    }

    onMoveAllToSource(event: { items: MateriauResponse[] }): void {
        this.materiauxSource = [...this.materiauxSource, ...event.items];
        this.materiauxTarget = [];
    }

    get dialogMaxWidth(): string {
        return this.step === 1 ? '1100px' : '620px';
    }

    constructor(
        private recetteService: RecetteControllerService,
        private materiauService: MateriauControllerService,
        private messageService: MessageService
    ) {}

    ngOnInit(): void {
        this.loadMateriaux();
    }

    loadMateriaux(): void {
        this.materiauService.tousLesMateriaux().subscribe({
            next: (data: MateriauResponse[]) => {
                this.materiauxSource = data.filter((m) => !m.archive);
            }
        });
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['visible'] && this.visible) {
            this.step = 0;
            this.resetForm();
        }
    }

    private resetForm(): void {
        if (this.isEdit && this.recette) {
            this.meta = {
                nom: this.recette.nom ?? '',
                quantiteProduite: this.recette.quantiteProduite ?? null,
                uniteProduite: this.recette.uniteProduite ?? '',
                dureeFabricationMinutes: this.recette.dureeFabricationMinutes ?? null,
                coutVariableParBatch: this.recette.coutVariableParBatch ?? null,
                notes: this.recette.notes ?? ''
            };
        } else {
            this.meta = { nom: '', quantiteProduite: null, uniteProduite: '', dureeFabricationMinutes: null, coutVariableParBatch: null, notes: '' };
            this.materiauxTarget = [];
            this.ingredientsSelectionnes = [];
            this.loadMateriaux();
        }
    }

    onHide(): void {
        this.visibleChange.emit(false);
    }

    // Étape 0 → 1
    goToPicklist(form: NgForm): void {
        form.onSubmit(new Event('submit'));
        if (form.invalid) return;
        this.step = 1;
    }

    // Étape 1 → 2 : convertir les matériaux target en ingrédients
    goToQuantites(): void {
        console.log('materiauxTarget:', this.materiauxTarget);
        if (this.materiauxTarget.length === 0) {
            this.messageService.add({ severity: 'warn', summary: 'Attention', detail: 'Sélectionnez au moins un ingrédient' });
            return;
        }

        // Conserver les quantités déjà saisies si on revient en arrière
        const existants = new Map(this.ingredientsSelectionnes.map((i) => [i.materiauId, i]));

        this.ingredientsSelectionnes = this.materiauxTarget.map((m) => {
            const exist = existants.get(m.id!);
            return (
                exist ?? {
                    materiauId: m.id!,
                    materiauNom: m.nom ?? '',
                    unite: m.unite ?? '',
                    stockTotal: Array.isArray(m.stocks) ? m.stocks.reduce((s, st) => s + (st.stockActuel ?? 0), 0) : 0,
                    coutUnitaire: m.coutUnitaire ?? null,
                    quantite: null,
                    uniteOverride: m.unite ?? ''
                }
            );
        });

        this.step = 2;
    }

    submit(form: NgForm): void {
        if (this.isEdit) {
            form.onSubmit(new Event('submit'));
            if (form.invalid) return;
            this.submitEdit();
        }
    }

    submitCreate(): void {
        if (!this.ingredientsValides) {
            this.messageService.add({ severity: 'warn', summary: 'Attention', detail: 'Renseignez toutes les quantités' });
            return;
        }
        this.saving = true;
        const req: CreerRecetteRequest = {
            nom: this.meta.nom,
            quantiteProduite: this.meta.quantiteProduite!,
            uniteProduite: this.meta.uniteProduite,
            dureeFabricationMinutes: this.meta.dureeFabricationMinutes ?? undefined,
            coutVariableParBatch: this.meta.coutVariableParBatch ?? undefined,
            notes: this.meta.notes || undefined,
            ingredients: this.ingredientsSelectionnes.map((i) => ({
                materiauId: i.materiauId,
                quantite: i.quantite!,
                unite: i.uniteOverride || i.unite
            }))
        };
        this.recetteService.creerRecette(req).subscribe({
            next: () => this.handleSuccess('Recette créée'),
            error: () => this.handleError()
        });
    }

    private handleSuccess(msg: string): void {
        this.saving = false;
        this.messageService.add({ severity: 'success', summary: 'Succès', detail: msg });
        this.saved.emit();
        this.visibleChange.emit(false);
    }

    private handleError(): void {
        this.saving = false;
        this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Une erreur est survenue' });
    }
}
