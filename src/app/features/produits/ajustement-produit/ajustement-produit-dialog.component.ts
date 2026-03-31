import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';

import { Button } from 'primeng/button';
import { InputNumber } from 'primeng/inputnumber';
import { Select } from 'primeng/select';
import { SelectButton } from 'primeng/selectbutton';
import { Textarea } from 'primeng/textarea';

import { EntrepotControllerService, EntrepotResponse, ProduitResponse, StockProduitControllerService, StockProduitResponse } from '@/app/modules/openapi';
import { DialogModule } from 'primeng/dialog';

interface SelectOption {
    label: string;
    value: number | string;
}

@Component({
    selector: 'app-ajustement-produit-dialog',
    templateUrl: './ajustement-produit-dialog.component.html',
    standalone: true,
    imports: [CommonModule, FormsModule, Button, DialogModule, Select, SelectButton, InputNumber, Textarea]
})
export class AjustementProduitDialogComponent implements OnInit, OnChanges {
    @Input() visible = false;
    @Output() visibleChange = new EventEmitter<boolean>();

    @Input() produit: ProduitResponse | null = null;
    @Output() saved = new EventEmitter<{ success: boolean; message: string }>();

    saving = false;
    entrepots: EntrepotResponse[] = [];
    stocksEntrepot: StockProduitResponse[] = [];

    // Stock disponible dans l'entrepôt sélectionné
    stockEntrepot: number | null = null;

    form = {
        entrepotId: null as number | null,
        direction: 'negatif' as 'positif' | 'negatif',
        quantite: null as number | null,
        raison: ''
    };

    readonly directionOptions: SelectOption[] = [
        { label: '↑ Positif (ajout)', value: 'positif' },
        { label: '↓ Négatif (retrait)', value: 'negatif' }
    ];

    get entrepotOptions(): SelectOption[] {
        return this.entrepots.map((e) => ({ label: e.nom!, value: e.id! }));
    }

    constructor(
        private stockService: StockProduitControllerService,
        private entrepotService: EntrepotControllerService
    ) {}

    ngOnInit(): void {
        this.entrepotService.listerEntrepot().subscribe({
            next: (list) => (this.entrepots = list.filter((e) => e.actif))
        });
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['visible'] && this.visible) {
            this.resetForm();
            this.chargerStocks();
        }
    }

    onEntrepotChange(): void {
        const s = this.stocksEntrepot.find((s) => s.entrepotId === this.form.entrepotId);
        this.stockEntrepot = s?.stockActuel ?? null;
    }

    submit(ngForm: NgForm): void {
        if (ngForm.invalid || !this.produit?.id || !this.form.entrepotId || !this.form.quantite) return;
        this.saving = true;

        this.stockService
            .ajuster(this.produit.id, {
                quantite: this.form.quantite,
                direction: this.form.direction,
                entrepotId: this.form.entrepotId,
                raison: this.form.raison || undefined
            } as any)
            .subscribe({
                next: () => {
                    this.saving = false;
                    const signe = this.form.direction === 'positif' ? '+' : '-';
                    this.saved.emit({
                        success: true,
                        message: `Ajustement ${signe}${this.form.quantite} enregistré`
                    });
                    this.onHide();
                },
                error: () => {
                    this.saving = false;
                    this.saved.emit({ success: false, message: "Impossible d'enregistrer l'ajustement" });
                }
            });
    }

    onHide(): void {
        this.visibleChange.emit(false);
    }

    private chargerStocks(): void {
        if (!this.produit?.id) return;
        this.stockService.listerStockProduit(0, 100, undefined).subscribe({
            next: (data: any) => {
                this.stocksEntrepot = (data.content ?? []).filter((s: StockProduitResponse) => s.produitId === this.produit!.id);
            }
        });
    }

    private resetForm(): void {
        this.form = { entrepotId: null, direction: 'negatif', quantite: null, raison: '' };
        this.stockEntrepot = null;
    }
}
