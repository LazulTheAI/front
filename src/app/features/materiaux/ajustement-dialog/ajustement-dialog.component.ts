import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';

import { AjustementStockRequest, EntrepotControllerService, EntrepotResponse, MateriauControllerService, MateriauResponse } from '@/app/modules/openapi';
import { TranslocoModule } from '@jsverse/transloco';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { SelectButtonModule } from 'primeng/selectbutton';
import { StockTotalPipe } from '../materiau.pipes';

@Component({
    selector: 'app-ajustement-dialog',
    standalone: true,
    imports: [CommonModule, FormsModule, DialogModule, ButtonModule, InputNumberModule, SelectModule, InputTextModule, TranslocoModule, SelectButtonModule, StockTotalPipe],
    providers: [],
    templateUrl: './ajustement-dialog.component.html'
})
export class AjustementDialogComponent implements OnChanges, OnInit {
    @Input() visible = false;
    @Output() visibleChange = new EventEmitter<boolean>();

    @Input() materiau: MateriauResponse | null = null;
    @Output() saved = new EventEmitter<{ success: boolean; message: string }>();

    saving = false;
    entrepots: EntrepotResponse[] = [];

    directionOptions = [
        { label: '↑ Positif (ajout)', value: 'positif' },
        { label: '↓ Négatif (retrait)', value: 'negatif' }
    ];

    form = {
        quantite: null as number | null,
        direction: 'positif' as 'positif' | 'negatif',
        raison: '',
        entrepotId: null as number | null
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
            this.form = { quantite: null, direction: 'positif', raison: '', entrepotId: null };
        }
    }

    onHide(): void {
        this.visibleChange.emit(false);
    }

    get entrepotOptions() {
        return this.entrepots.map((e) => ({ label: e.nom!, value: e.id! }));
    }

    get selectedEntrepotStock(): number | null {
        if (!this.form.entrepotId || !this.materiau?.stocks) return null;
        const s = this.materiau.stocks.find((s) => s.entrepotId === this.form.entrepotId);
        return s?.stockActuel ?? 0;
    }

    submit(ngForm: NgForm): void {
        if (ngForm.invalid || !this.materiau?.id) return;
        this.saving = true;
        const req: AjustementStockRequest = {
            quantite: this.form.quantite!,
            direction: this.form.direction,
            entrepotId: this.form.entrepotId!,
            raison: this.form.raison || undefined
        };
        this.materiauService.ajustementMouvementStock(this.materiau.id, req).subscribe({
            next: () => {
                this.saving = false;
                this.saved.emit({ success: true, message: `Stock ajusté de ${this.form.direction === 'positif' ? '+' : '-'}${this.form.quantite} ${this.materiau?.unite}` });
            },
            error: () => {
                this.saving = false;
                this.saved.emit({ success: false, message: "Impossible d'enregistrer l'ajustement" });
            }
        });
    }
}
