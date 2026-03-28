import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';

import { Button } from 'primeng/button';
import { Checkbox } from 'primeng/checkbox';
import { DialogModule } from 'primeng/dialog';
import { InputNumber } from 'primeng/inputnumber';
import { Select } from 'primeng/select';
import { Tooltip } from 'primeng/tooltip';

import { ProduitControllerService, ProduitResponse, RecetteResponse } from '@/app/modules/openapi';

interface SelectOption {
    label: string;
    value: number;
}

@Component({
    selector: 'app-lier-produit-recette-dialog',
    templateUrl: './lier-produit-recette-dialog.component.html',
    standalone: true,
    imports: [CommonModule, FormsModule, Button, DialogModule, Select, InputNumber, Checkbox, Tooltip]
})
export class LierProduitRecetteDialogComponent implements OnInit, OnChanges {
    @Input() visible = false;
    @Output() visibleChange = new EventEmitter<boolean>();

    @Input() recette: RecetteResponse | null = null;
    @Output() saved = new EventEmitter<{ success: boolean; message: string }>();

    saving = false;
    produits: ProduitResponse[] = [];

    form = {
        produitId: null as number | null,
        batchesParUnite: 1 as number,
        estPrincipale: true
    };

    // Liaisons déjà existantes sur le produit sélectionné (pour info)
    get liaisonsExistantes() {
        const p = this.produits.find((p) => p.id === this.form.produitId);
        return p?.recettes ?? [];
    }

    get produitOptions(): SelectOption[] {
        return this.produits.map((p) => ({
            label: p.sku ? `${p.nom} (${p.sku})` : p.nom!,
            value: p.id!
        }));
    }

    constructor(private produitService: ProduitControllerService) {}

    ngOnInit(): void {
        // Charger tous les produits pour le select
        this.produitService.listerProduit(0, 500, 'nom', 'asc', undefined).subscribe({
            next: (page: any) => (this.produits = page.content ?? [])
        });
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['visible'] && this.visible) {
            this.resetForm();
        }
    }

    submit(ngForm: NgForm): void {
        if (ngForm.invalid || !this.recette?.id || !this.form.produitId) return;
        this.saving = true;

        // PUT /api/produits/{produitId}/recette
        this.produitService
            .lierRecette(this.form.produitId, {
                recetteId: this.recette.id,
                batchesParUnite: this.form.batchesParUnite,
                estPrincipale: this.form.estPrincipale
            })
            .subscribe({
                next: () => {
                    this.saving = false;
                    const produitNom = this.produits.find((p) => p.id === this.form.produitId)?.nom ?? '';
                    this.saved.emit({
                        success: true,
                        message: `Recette liée à « ${produitNom} »`
                    });
                    this.onHide();
                },
                error: () => {
                    this.saving = false;
                    this.saved.emit({ success: false, message: 'Impossible de lier la recette' });
                }
            });
    }

    onHide(): void {
        this.visibleChange.emit(false);
    }

    private resetForm(): void {
        this.form = { produitId: null, batchesParUnite: 1, estPrincipale: true };
    }
}
