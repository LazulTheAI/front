import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';

// PrimeNG
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { DividerModule } from 'primeng/divider';
import { TableModule } from 'primeng/table';
import { TabsModule } from 'primeng/tabs';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';

import { IngredientResponse, RecetteControllerService, RecetteResponse } from '@/app/modules/openapi';
import { APP_CURRENCY } from '@/app/core/currency.config';
import { TranslocoModule } from '@jsverse/transloco';
import { IngredientLine } from '../ingredients-editor/ingredients-editor.component';
import { IngredientsEnAlertePipe } from '../recette.pipes';

@Component({
    selector: 'app-recette-detail',
    standalone: true,
    imports: [CommonModule, TranslocoModule, FormsModule, DialogModule, ButtonModule, TabsModule, TableModule, TagModule, DividerModule, ToastModule, TooltipModule, IngredientsEnAlertePipe],
    providers: [MessageService, ConfirmationService],
    templateUrl: './recette-detail.component.html'
})
export class RecetteDetailComponent implements OnChanges {
    @Input() visible = false;
    @Output() visibleChange = new EventEmitter<boolean>();

    @Input() recetteId: number | null = null;
    @Output() closed = new EventEmitter<void>();

    recette: RecetteResponse | null = null;
    loading = false;
    protected readonly appCurrency = APP_CURRENCY;

    // Edit ingrédients
    editingIngredients = false;
    savingIngredients = false;
    editIngredients: IngredientLine[] = [];

    // Dialogs enfants
    showSimulation = false;

    constructor(
        private recetteService: RecetteControllerService,
        private messageService: MessageService
    ) {}

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['visible'] && this.visible && this.recetteId) {
            this.editingIngredients = false;
            this.loadRecette();
        }
    }

    loadRecette(): void {
        if (!this.recetteId) return;
        this.loading = true;
        this.recetteService.detailRecette(this.recetteId).subscribe({
            next: (data: RecetteResponse) => {
                this.recette = data;
                this.loading = false;
            },
            error: () => (this.loading = false)
        });
    }

    onHide(): void {
        this.visibleChange.emit(false);
        this.closed.emit();
    }

    // Helpers
    getTotalCout(): number {
        return this.recette?.coutTheorique ?? 0;
    }

    getDureeFabricationLabel(): string {
        const minutes = this.recette?.dureeFabricationMinutes;
        if (!minutes) return '—';
        if (minutes < 60) return `${minutes} min`;
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        return m > 0 ? `${h}h${m.toString().padStart(2, '0')}` : `${h}h`;
    }

    getPctCout(ingredient: IngredientResponse): number {
        const total = this.getTotalCout();
        if (!total || !ingredient.coutLigne) return 0;
        return (ingredient.coutLigne / total) * 100;
    }
}
