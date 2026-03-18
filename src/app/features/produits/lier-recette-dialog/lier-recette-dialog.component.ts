import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';

// PrimeNG
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { DialogModule } from 'primeng/dialog';
import { DividerModule } from 'primeng/divider';
import { InputNumberModule } from 'primeng/inputnumber';
import { ToastModule } from 'primeng/toast';

import { SelectModule } from 'primeng/select';

import { ProduitControllerService, ProduitResponse, RecetteControllerService, RecetteResponse } from '@/app/modules/openapi';

@Component({
    selector: 'app-lier-recette-dialog',
    standalone: true,
    imports: [CommonModule, FormsModule, DialogModule, ButtonModule, SelectModule, InputNumberModule, CheckboxModule, DividerModule, ToastModule],
    providers: [MessageService],
    templateUrl: './lier-recette-dialog.component.html'
})
export class LierRecetteDialogComponent implements OnChanges {
    @Input() visible = false;
    @Output() visibleChange = new EventEmitter<boolean>();
    @Input() produit: ProduitResponse | null = null;
    @Output() onSaved = new EventEmitter<void>();

    recettes: RecetteResponse[] = [];
    loadingRecettes = false;
    saving = false;

    // Formulaire
    selectedRecetteId: number | null = null;
    batchesParUnite: number = 1;
    estPrincipale: boolean = true;

    constructor(
        private produitService: ProduitControllerService,
        private recetteService: RecetteControllerService,
        private messageService: MessageService
    ) {}

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['visible']?.currentValue === true) {
            this.loadRecettes();
            this.resetForm();
        }
    }

    loadRecettes(): void {
        this.loadingRecettes = true;
        this.recetteService.listerRecetteResponse(false).subscribe({
            next: (data) => {
                this.recettes = data;
                this.loadingRecettes = false;

                // Pré-remplir si une recette principale existe déjà
                const principale = this.produit?.recettes?.find((r: any) => r.estPrincipale);
                if (principale) {
                    this.selectedRecetteId = principale.recetteId ?? null;
                    this.batchesParUnite = principale.batchesParUnite ?? 1;
                }
            },
            error: () => {
                this.loadingRecettes = false;
            }
        });
    }

    resetForm(): void {
        this.selectedRecetteId = null;
        this.batchesParUnite = 1;
        this.estPrincipale = true;
    }

    save(): void {
        if (!this.produit?.id || !this.selectedRecetteId) return;

        this.saving = true;
        const payload = {
            recetteId: this.selectedRecetteId,
            batchesParUnite: this.batchesParUnite,
            estPrincipale: this.estPrincipale
        };

        this.produitService.lierRecette(this.produit.id, payload).subscribe({
            next: () => {
                this.saving = false;
                this.onSaved.emit();
                this.close();
            },
            error: () => {
                this.messageService.add({
                    severity: 'error',
                    summary: 'Erreur',
                    detail: 'Impossible de lier la recette.'
                });
                this.saving = false;
            }
        });
    }

    close(): void {
        this.visible = false;
        this.visibleChange.emit(false);
    }

    get recettesOptions() {
        return this.recettes.map((r) => ({
            label: r.nom,
            value: r.id,
            description: r.quantiteProduite ? `${r.quantiteProduite} ${r.uniteProduite ?? ''} / batch` : ''
        }));
    }

    get selectedRecette(): RecetteResponse | undefined {
        return this.recettes.find((r) => r.id === this.selectedRecetteId);
    }

    /** Calcul indicatif : combien d'unités produit on obtient pour X batches */
    get unitesPourUnBatch(): string {
        if (!this.selectedRecette || !this.batchesParUnite) return '—';
        const par = this.selectedRecette.quantiteProduite;
        if (!par) return '—';
        const total = par * this.batchesParUnite;
        return `${total} ${this.selectedRecette.uniteProduite ?? ''}`;
    }
}
