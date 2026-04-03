import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { TranslocoModule } from '@jsverse/transloco';
import { FormsModule } from '@angular/forms';

import { Button } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputNumber } from 'primeng/inputnumber';
import { Select } from 'primeng/select';
import { Textarea } from 'primeng/textarea';

import { EntrepotControllerService, EntrepotResponse, ProduitResponse, StockProduitControllerService, StockProduitResponse } from '@/app/modules/openapi';
import { TransfertRequest } from '@/app/modules/openapi/model/transfert-request';

interface SelectOption {
    label: string;
    value: number;
}

@Component({
    selector: 'app-transfert-produit-dialog',
    templateUrl: './transfert-produit-dialog.component.html',
    standalone: true,
    imports: [CommonModule, FormsModule, Button, DialogModule, Select, InputNumber, Textarea, TranslocoModule]
})
export class TransfertProduitDialogComponent implements OnInit, OnChanges {
    @Input() visible = false;
    @Output() visibleChange = new EventEmitter<boolean>();

    // On reçoit le produit + la liste des stocks par entrepôt
    @Input() produit: ProduitResponse | null = null;
    @Input() stocksProduit: StockProduitResponse[] = [];
    @Output() saved = new EventEmitter<{ success: boolean; message: string }>();

    saving = false;
    entrepots: EntrepotResponse[] = [];

    form = {
        entrepotSourceId: null as number | null,
        entrepotDestinationId: null as number | null,
        quantite: null as number | null,
        notes: ''
    };

    stockSource: number | null = null;

    get entrepotSourceOptions(): SelectOption[] {
        // Entrepôts où le produit a du stock
        return this.stocksProduit
            .filter((s) => (s.stockActuel ?? 0) > 0)
            .map((s) => ({
                label: `${s.entrepotNom} (${s.stockActuel})`,
                value: s.entrepotId!
            }));
    }

    get entrepotDestOptions(): SelectOption[] {
        return this.entrepots.filter((e) => e.actif && e.id !== this.form.entrepotSourceId).map((e) => ({ label: e.nom!, value: e.id! }));
    }

    get entrepotSourceLabel(): string {
        return this.entrepots.find((e) => e.id === this.form.entrepotSourceId)?.nom ?? '';
    }

    get entrepotDestLabel(): string {
        return this.entrepots.find((e) => e.id === this.form.entrepotDestinationId)?.nom ?? '';
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
        }
    }

    onSourceChange(): void {
        const s = this.stocksProduit.find((s) => s.entrepotId === this.form.entrepotSourceId);
        this.stockSource = s?.stockActuel ?? null;
        if (this.form.entrepotDestinationId === this.form.entrepotSourceId) {
            this.form.entrepotDestinationId = null;
        }
    }

    isFormValid(): boolean {
        return !!(
            this.form.entrepotSourceId &&
            this.form.entrepotDestinationId &&
            this.form.entrepotSourceId !== this.form.entrepotDestinationId &&
            this.form.quantite &&
            this.form.quantite > 0 &&
            (this.stockSource === null || this.form.quantite <= this.stockSource)
        );
    }

    submit(): void {
        if (!this.isFormValid() || !this.produit?.id) return;
        this.saving = true;

        const req: TransfertRequest = {
            quantite: this.form.quantite!,
            entrepotSourceId: this.form.entrepotSourceId!,
            entrepotDestinationId: this.form.entrepotDestinationId!,
            notes: this.form.notes || undefined
        };

        this.stockService.transferer(this.produit.id, req).subscribe({
            next: () => {
                this.saving = false;
                this.saved.emit({
                    success: true,
                    message: `${this.form.quantite} unités transférées vers ${this.entrepotDestLabel}`
                });
                this.onHide();
            },
            error: () => {
                this.saving = false;
                this.saved.emit({ success: false, message: "Impossible d'effectuer le transfert" });
            }
        });
    }

    onHide(): void {
        this.visibleChange.emit(false);
    }

    private resetForm(): void {
        this.form = { entrepotSourceId: null, entrepotDestinationId: null, quantite: null, notes: '' };
        this.stockSource = null;
    }
}
