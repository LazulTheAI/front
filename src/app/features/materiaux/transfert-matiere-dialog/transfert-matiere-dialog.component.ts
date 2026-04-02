import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { Button } from 'primeng/button';
import { InputNumber } from 'primeng/inputnumber';
import { Select } from 'primeng/select';
import { Textarea } from 'primeng/textarea';

import { EntrepotControllerService, EntrepotResponse, MateriauControllerService, MateriauResponse, TransfertStockRequest } from '@/app/modules/openapi';
import { TranslocoModule } from '@jsverse/transloco';
import { DialogModule } from 'primeng/dialog';

interface SelectOption {
    label: string;
    value: number;
}

@Component({
    selector: 'app-transfert-matiere-dialog',
    templateUrl: './transfert-matiere-dialog.component.html',
    standalone: true,
    imports: [CommonModule, FormsModule, TranslocoModule, Button, DialogModule, Select, InputNumber, Textarea]
})
export class TransfertMatiereDialogComponent implements OnInit, OnChanges {
    @Input() visible = false;
    @Output() visibleChange = new EventEmitter<boolean>();

    @Input() materiau: MateriauResponse | null = null;
    @Output() saved = new EventEmitter<{ success: boolean; message: string }>();

    saving = false;
    entrepots: EntrepotResponse[] = [];

    form = {
        entrepotSourceId: null as number | null,
        entrepotDestinationId: null as number | null,
        quantite: null as number | null,
        notes: ''
    };

    // Stock disponible à la source (depuis materiau.stocks[])
    stockSource: number | null = null;

    get entrepotSourceOptions(): SelectOption[] {
        // Seulement les entrepôts où ce matériau a du stock
        return (this.materiau?.stocks ?? []).filter((s) => (s.stockActuel ?? 0) > 0).map((s) => ({ label: `${s.entrepotNom} (${s.stockActuel} ${this.materiau?.unite})`, value: s.entrepotId! }));
    }

    get entrepotDestOptions(): SelectOption[] {
        // Tous les entrepôts actifs sauf la source
        return this.entrepots.filter((e) => e.actif && e.id !== this.form.entrepotSourceId).map((e) => ({ label: e.nom!, value: e.id! }));
    }

    get entrepotSourceLabel(): string {
        return this.entrepots.find((e) => e.id === this.form.entrepotSourceId)?.nom ?? '';
    }

    get entrepotDestLabel(): string {
        return this.entrepots.find((e) => e.id === this.form.entrepotDestinationId)?.nom ?? '';
    }

    constructor(
        private materiauService: MateriauControllerService,
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
        // Mettre à jour le stock disponible affiché
        const s = this.materiau?.stocks?.find((s) => s.entrepotId === this.form.entrepotSourceId);
        this.stockSource = s?.stockActuel ?? null;
        // Réinitialiser destination si identique
        if (this.form.entrepotDestinationId === this.form.entrepotSourceId) {
            this.form.entrepotDestinationId = null;
        }
    }

    onDestChange(): void {}

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
        if (!this.isFormValid() || !this.materiau?.id) return;
        this.saving = true;

        const req: TransfertStockRequest = {
            quantite: this.form.quantite!,
            entrepotSourceId: this.form.entrepotSourceId!,
            entrepotDestinationId: this.form.entrepotDestinationId!,
            notes: this.form.notes || undefined
        };

        this.materiauService.transfererStock(this.materiau.id, req).subscribe({
            next: () => {
                this.saving = false;
                this.saved.emit({
                    success: true,
                    message: `${this.form.quantite} ${this.materiau?.unite} transférés vers ${this.entrepotDestLabel}`
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
