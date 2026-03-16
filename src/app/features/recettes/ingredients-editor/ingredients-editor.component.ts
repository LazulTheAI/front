import { MateriauControllerService, MateriauResponse } from '@/app/modules/openapi';
import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

// PrimeNG
import { ButtonModule } from 'primeng/button';
import { DividerModule } from 'primeng/divider';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';


export interface IngredientLine {
  materiauId: number | null;
  materiauNom?: string;
  quantite: number | null;
  unite: string;
}

@Component({
  selector: 'app-ingredients-editor',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    SelectModule,
    InputNumberModule,
    InputTextModule,
    TooltipModule,
    TagModule,
    DividerModule,
  ],
  templateUrl: './ingredients-editor.component.html',
})
export class IngredientsEditorComponent implements OnInit {
  @Input() ingredients: IngredientLine[] = [];
  @Output() ingredientsChange = new EventEmitter<IngredientLine[]>();

  materiaux: MateriauResponse[] = [];
  loadingMateriaux = false;

  constructor(private materiauService: MateriauControllerService) {}

  ngOnInit(): void {
    this.loadingMateriaux = true;
    this.materiauService.lister2(false).subscribe({
      next: (data: MateriauResponse[]) => {
        this.materiaux = data.filter((m: MateriauResponse) => !m.archive);
        this.loadingMateriaux = false;
      },
      error: () => (this.loadingMateriaux = false),
    });
  }

  get materiauOptions(): { label: string; value: number; unite: string }[] {
    return this.materiaux.map((m: MateriauResponse) => ({
      label: `${m.nom} (${m.unite})`,
      value: m.id!,
      unite: m.unite!,
    }));
  }

  addIngredient(): void {
    this.ingredients = [...this.ingredients, { materiauId: null, quantite: null, unite: '' }];
    this.emit();
  }

  removeIngredient(index: number): void {
    this.ingredients = this.ingredients.filter((_, i) => i !== index);
    this.emit();
  }

  onMateriauChange(index: number, materiauId: number): void {
    const found = this.materiaux.find((m: MateriauResponse) => m.id === materiauId);
    if (found) {
      this.ingredients[index].unite = found.unite ?? '';
      this.ingredients[index].materiauNom = found.nom ?? '';
    }
    this.emit();
  }

  onFieldChange(): void {
    this.emit();
  }

  private emit(): void {
    this.ingredientsChange.emit([...this.ingredients]);
  }

  isValid(): boolean {
    return (
      this.ingredients.length > 0 &&
      this.ingredients.every(
        (i) => i.materiauId != null && i.quantite != null && i.quantite > 0 && i.unite.trim() !== ''
      )
    );
  }

  hasDuplicates(): boolean {
    const ids = this.ingredients.map((i) => i.materiauId).filter((id) => id != null);
    return new Set(ids).size !== ids.length;
  }
}
