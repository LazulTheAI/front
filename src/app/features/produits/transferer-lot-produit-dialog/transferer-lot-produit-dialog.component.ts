import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';

import { TranslocoModule } from '@jsverse/transloco';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { DividerModule } from 'primeng/divider';
import { InputNumberModule } from 'primeng/inputnumber';
import { Select } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { TextareaModule } from 'primeng/textarea';

import { EntrepotControllerService, EntrepotResponse, LotResponse, ProduitControllerService, ProduitResponse } from '@/app/modules/openapi';

interface SelectOption {
    label: string;
    value: number;
}

@Component({
    selector: 'app-transferer-lot-produit-dialog',
    standalone: true,
    imports: [CommonModule, FormsModule, DialogModule, ButtonModule, InputNumberModule, Select, ToastModule, DividerModule, TranslocoModule, TagModule, TextareaModule],
    providers: [MessageService],
    templateUrl: './transferer-lot-produit-dialog.component.html'
})
export class TransfererLotProduitDialogComponent implements OnChanges {
    @Input() visible = false;
    @Output() visibleChange = new EventEmitter<boolean>();

    @Input() lot: LotResponse | null = null;
    @Input() produit: ProduitResponse | null = null;
    @Output() saved = new EventEmitter<void>();

    saving = false;
    entrepots: EntrepotResponse[] = [];

    form = {
        quantite: null as number | null,
        entrepotDestinationId: null as number | null,
        notes: ''
    };

    get entrepotOptions(): SelectOption[] {
        return this.entrepots
            .filter((e) => e.id !== this.lot?.entrepotId)
            .map((e) => ({ label: e.nom!, value: e.id! }));
    }

    get maxQuantite(): number {
        return this.lot?.quantiteRestante ?? 0;
    }

    get dlcSeverity(): 'danger' | 'warn' | 'success' | 'secondary' {
        if (!this.lot?.expiresAt) return 'secondary';
        if (this.lot.estExpire) return 'danger';
        if (this.lot.dlcProche) return 'warn';
        return 'success';
    }

    constructor(
        private produitService: ProduitControllerService,
        private entrepotService: EntrepotControllerService,
        private messageService: MessageService
    ) {}

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['visible'] && this.visible) {
            this.form = { quantite: null, entrepotDestinationId: null, notes: '' };
            this.loadEntrepots();
        }
    }

    private loadEntrepots(): void {
        this.entrepotService.listerEntrepot().subscribe({
            next: (list) => (this.entrepots = list.filter((e) => e.actif))
        });
    }

    onHide(): void {
        this.visibleChange.emit(false);
    }

    submit(ngForm: NgForm): void {
        if (ngForm.invalid || !this.lot || !this.produit || !this.form.entrepotDestinationId || !this.form.quantite) return;
        if (this.form.quantite > this.maxQuantite) {
            this.messageService.add({ severity: 'error', summary: 'Erreur', detail: `Quantité max : ${this.maxQuantite}` });
            return;
        }

        this.saving = true;
        this.produitService
            .transfererLotProduit(this.produit.id!, this.lot.id!, {
                quantite: this.form.quantite,
                entrepotDestinationId: this.form.entrepotDestinationId,
                notes: this.form.notes || undefined
            })
            .subscribe({
                next: () => {
                    this.saving = false;
                    this.visibleChange.emit(false);
                    this.saved.emit();
                },
                error: (err) => {
                    this.saving = false;
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Erreur',
                        detail: err?.error?.message ?? 'Une erreur est survenue'
                    });
                }
            });
    }
}
