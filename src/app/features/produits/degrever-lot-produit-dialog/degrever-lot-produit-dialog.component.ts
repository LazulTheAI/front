import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';

import { TranslocoModule } from '@jsverse/transloco';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { DividerModule } from 'primeng/divider';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';

import { LotResponse, ProduitControllerService, ProduitResponse } from '@/app/modules/openapi';

@Component({
    selector: 'app-degrever-lot-produit-dialog',
    standalone: true,
    imports: [CommonModule, FormsModule, DialogModule, ButtonModule, InputNumberModule, InputTextModule, ToastModule, DividerModule, TranslocoModule, TagModule],
    providers: [MessageService],
    templateUrl: './degrever-lot-produit-dialog.component.html'
})
export class DegreverLotProduitDialogComponent implements OnChanges {
    @Input() visible = false;
    @Output() visibleChange = new EventEmitter<boolean>();

    @Input() lot: LotResponse | null = null;
    @Input() produit: ProduitResponse | null = null;
    @Output() saved = new EventEmitter<void>();

    saving = false;

    form = {
        quantite: null as number | null,
        raison: ''
    };

    constructor(
        private produitService: ProduitControllerService,
        private messageService: MessageService
    ) {}

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['visible'] && this.visible) {
            this.form = { quantite: null, raison: '' };
        }
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

    onHide(): void {
        this.visibleChange.emit(false);
    }

    submit(ngForm: NgForm): void {
        if (ngForm.invalid || !this.lot || !this.produit) return;
        if (!this.form.quantite || this.form.quantite <= 0) return;
        if (this.form.quantite > this.maxQuantite) {
            this.messageService.add({
                severity: 'error',
                summary: 'Erreur',
                detail: `Quantité max : ${this.maxQuantite}`
            });
            return;
        }

        this.saving = true;
        this.produitService
            .degreverLotProduit(this.produit.id!, this.lot.id!, {
                quantite: this.form.quantite,
                raison: this.form.raison || undefined
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
