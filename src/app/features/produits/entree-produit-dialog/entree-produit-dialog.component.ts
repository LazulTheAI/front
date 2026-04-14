import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { TranslocoModule } from '@jsverse/transloco';
import { FormsModule, NgForm } from '@angular/forms';

import { Button } from 'primeng/button';
import { DatePicker } from 'primeng/datepicker';
import { InputNumber } from 'primeng/inputnumber';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { Textarea } from 'primeng/textarea';

import { EntrepotControllerService, EntrepotResponse, ProduitResponse, StockProduitControllerService } from '@/app/modules/openapi';
import { APP_CURRENCY, APP_CURRENCY_LOCALE } from '@/app/core/currency.config';
import { EntreeManuelleRequest } from '@/app/modules/openapi/model/entree-manuelle-request';
import { DialogModule } from 'primeng/dialog';

interface SelectOption {
    label: string;
    value: number;
}

@Component({
    selector: 'app-entree-produit-dialog',
    templateUrl: './entree-produit-dialog.component.html',
    standalone: true,
    imports: [CommonModule, FormsModule, Button, DialogModule, Select, InputNumber, InputText, Textarea, DatePicker, TranslocoModule]
})
export class EntreeProduitDialogComponent implements OnInit, OnChanges {
    @Input() visible = false;
    @Output() visibleChange = new EventEmitter<boolean>();

    @Input() produit: ProduitResponse | null = null;
    @Output() saved = new EventEmitter<{ success: boolean; message: string }>();

    saving = false;
    entrepots: EntrepotResponse[] = [];
    today = new Date();
    dialogHeader = '';
    protected readonly appCurrency = APP_CURRENCY;
    protected readonly appCurrencyLocale = APP_CURRENCY_LOCALE;

    form = {
        entrepotId: null as number | null,
        quantite: null as number | null,
        coutUnitaireSnapshot: null as number | null,
        referenceId: '',
        numeroLot: '',
        dlc: null as Date | null,
        notes: ''
    };

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
        }
    }

    submit(ngForm: NgForm): void {
        if (ngForm.invalid || !this.produit?.id || !this.form.entrepotId || !this.form.quantite) return;
        this.saving = true;

        const req: EntreeManuelleRequest = {
            quantite: this.form.quantite,
            entrepotId: this.form.entrepotId,
            coutUnitaireSnapshot: this.form.coutUnitaireSnapshot ?? undefined,
            referenceId: this.form.referenceId || undefined,
            numeroLot: this.form.numeroLot || undefined,
            dlc: this.form.dlc?.toISOString() ?? undefined,
            notes: this.form.notes || undefined
        };

        this.stockService.entreeManuelle(this.produit.id, req).subscribe({
            next: () => {
                this.saving = false;
                this.saved.emit({
                    success: true,
                    message: `Entrée de ${this.form.quantite} unités enregistrée`
                });
                this.onHide();
            },
            error: () => {
                this.saving = false;
                this.saved.emit({ success: false, message: "Impossible d'enregistrer l'entrée" });
            }
        });
    }

    onHide(): void {
        this.visibleChange.emit(false);
    }

    private resetForm(): void {
        this.form = {
            entrepotId: null,
            quantite: null,
            coutUnitaireSnapshot: null,
            referenceId: '',
            numeroLot: '',
            dlc: null,
            notes: ''
        };
    }
}
