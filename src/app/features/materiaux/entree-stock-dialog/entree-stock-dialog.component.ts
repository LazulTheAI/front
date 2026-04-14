import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';

import { EntreeStockRequest, EntrepotControllerService, EntrepotResponse, MateriauControllerService, MateriauResponse } from '@/app/modules/openapi';
import { APP_CURRENCY, APP_CURRENCY_LOCALE } from '@/app/core/currency.config';
import { TranslocoModule } from '@jsverse/transloco';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { DialogModule } from 'primeng/dialog';
import { DividerModule } from 'primeng/divider';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';

@Component({
    selector: 'app-entree-stock-dialog',
    standalone: true,
    imports: [CommonModule, FormsModule, DialogModule, ButtonModule, InputNumberModule, InputTextModule, SelectModule, TranslocoModule, DatePickerModule, DividerModule],
    providers: [],
    templateUrl: './entree-stock-dialog.component.html'
})
export class EntreeStockDialogComponent implements OnChanges, OnInit {
    @Input() visible = false;
    @Output() visibleChange = new EventEmitter<boolean>();

    @Input() materiau: MateriauResponse | null = null;
    @Output() saved = new EventEmitter<{ success: boolean; message: string }>();

    saving = false;
    entrepots: EntrepotResponse[] = [];
    today = new Date();
    protected readonly appCurrency = APP_CURRENCY;
    protected readonly appCurrencyLocale = APP_CURRENCY_LOCALE;

    form = {
        quantite: null as number | null,
        coutUnitaire: null as number | null,
        entrepotId: null as number | null,
        referenceId: '',
        numeroLot: '',
        notes: '',
        expiresAt: null as Date | null
    };

    constructor(
        private materiauService: MateriauControllerService,
        private entrepotService: EntrepotControllerService
    ) {}

    ngOnInit(): void {
        this.entrepotService.listerEntrepot().subscribe({
            next: (data) => {
                console.log('entrepots data:', data);
                this.entrepots = (Array.isArray(data) ? data : ((data as any).content ?? (data as any).items ?? [])).filter((e: EntrepotResponse) => e.actif);
            }
        });
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['visible'] && this.visible) {
            this.form = {
                quantite: null,
                coutUnitaire: this.materiau?.coutUnitaire ?? null,
                entrepotId: null,
                referenceId: '',
                numeroLot: '',
                notes: '',
                expiresAt: null
            };
        }
    }

    onHide(): void {
        this.visibleChange.emit(false);
    }

    get entrepotOptions(): { label: string; value: number }[] {
        return this.entrepots.map((e: EntrepotResponse) => ({ label: e.nom!, value: e.id! }));
    }

    submit(ngForm: NgForm): void {
        if (ngForm.invalid || !this.materiau?.id) return;
        this.saving = true;
        const req: EntreeStockRequest = {
            quantite: this.form.quantite!,
            coutUnitaire: this.form.coutUnitaire ?? undefined,
            entrepotId: this.form.entrepotId!,
            referenceId: this.form.referenceId || undefined,
            numeroLot: this.form.numeroLot || undefined,
            notes: this.form.notes || undefined,
            expiresAt: this.form.expiresAt?.toISOString() ?? undefined
        };
        this.materiauService.entreeMouvementStock(this.materiau.id, req).subscribe({
            next: () => {
                this.saving = false;
                this.saved.emit({
                    success: true,
                    message: `Entrée de ${this.form.quantite} ${this.materiau?.unite} enregistrée`
                });
                this.onHide();
            },
            error: () => {
                this.saving = false;
                this.saved.emit({ success: false, message: "Impossible d'enregistrer l'entrée de stock" });
            }
        });
    }
}
