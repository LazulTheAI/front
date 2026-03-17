import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, ViewChild } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';

// PrimeNG
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { DividerModule } from 'primeng/divider';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { StepsModule } from 'primeng/steps';
import { TextareaModule } from 'primeng/textarea';
import { ToastModule } from 'primeng/toast';

import {
  CreerRecetteRequest,
  ModifierRecetteMetaRequest,
  RecetteControllerService,
  RecetteResponse,
} from '@/app/modules/openapi';

import { IngredientLine, IngredientsEditorComponent } from '../ingredients-editor/ingredients-editor.component';

@Component({
  selector: 'app-recette-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DialogModule,
    ButtonModule,
    InputTextModule,
    InputNumberModule,
    TextareaModule,
    DividerModule,
    StepsModule,
    ToastModule,
    IngredientsEditorComponent,
  ],
  providers: [MessageService],
  templateUrl: './recette-form.component.html',
})
export class RecetteFormComponent implements OnChanges {
  @Input() visible = false;
  @Output() visibleChange = new EventEmitter<boolean>();

  @Input() recette: RecetteResponse | null = null;
  @Output() saved = new EventEmitter<void>();

  @ViewChild('ngForm') ngForm!: NgForm;

  saving = false;

  // Étape active en mode création (0=méta, 1=ingrédients)
  activeStep = 0;

  steps = [
    { label: 'Informations' },
    { label: 'Ingrédients' },
  ];

  meta = {
    nom: '',
    quantiteProduite: null as number | null,
    uniteProduite: '',
    dureeFabricationMinutes: null as number | null,
    notes: '',
  };

  ingredients: IngredientLine[] = [];

  get isEdit(): boolean {
    return this.recette != null && this.recette.id != null;
  }

  get dialogTitle(): string {
    return this.isEdit ? `Modifier "${this.recette?.nom}"` : 'Nouvelle recette';
  }

  get dialogWidth(): string {
    return this.isEdit ? '540px' : '700px';
  }

  constructor(
    private recetteService: RecetteControllerService,
    private messageService: MessageService
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visible'] && this.visible) {
      this.activeStep = 0;
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
        notes: this.recette.notes ?? '',
      };
    } else {
      this.meta = { nom: '', quantiteProduite: null, uniteProduite: '', dureeFabricationMinutes: null, notes: '' };
      this.ingredients = [];
    }
  }

  onHide(): void {
    this.visibleChange.emit(false);
  }

  // Étape 1 → 2
  goToIngredients(form: NgForm): void {
    form.onSubmit(new Event('submit'));
    if (form.invalid) return;
    this.activeStep = 1;
  }

  // Soumission finale
  submit(form: NgForm): void {
    if (this.isEdit) {
      this.submitEdit(form);
    } else {
      this.submitCreate();
    }
  }

  private submitEdit(form: NgForm): void {
    form.onSubmit(new Event('submit'));
    if (form.invalid) return;

    this.saving = true;
    const req: ModifierRecetteMetaRequest = {
      nom: this.meta.nom,
      quantiteProduite: this.meta.quantiteProduite!,
      uniteProduite: this.meta.uniteProduite,
      dureeFabricationMinutes: this.meta.dureeFabricationMinutes ?? undefined,
      notes: this.meta.notes || undefined,
    };

    this.recetteService.modifierMetaRecette(this.recette!.id!, req).subscribe({
      next: () => this.handleSuccess('Recette modifiée avec succès'),
      error: () => this.handleError(),
    });
  }

  private submitCreate(): void {
    if (this.ingredients.length === 0) {
      this.messageService.add({ severity: 'warn', summary: 'Attention', detail: 'Ajoutez au moins un ingrédient' });
      return;
    }

    this.saving = true;
    const req: CreerRecetteRequest = {
      nom: this.meta.nom,
      quantiteProduite: this.meta.quantiteProduite!,
      uniteProduite: this.meta.uniteProduite,
      dureeFabricationMinutes: this.meta.dureeFabricationMinutes ?? undefined,
      notes: this.meta.notes || undefined,
      ingredients: this.ingredients.map((i) => ({
        materiauId: i.materiauId!,
        quantite: i.quantite!,
        unite: i.unite,
      })),
    };

    this.recetteService.creerRecette(req).subscribe({
      next: () => this.handleSuccess('Recette créée avec succès'),
      error: () => this.handleError(),
    });
  }

  private handleSuccess(msg: string): void {
    this.saving = false;
    this.messageService.add({ severity: 'success', summary: 'Succès', detail: msg });
    this.saved.emit();
  }

  private handleError(): void {
    this.saving = false;
    this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Une erreur est survenue' });
  }
}
