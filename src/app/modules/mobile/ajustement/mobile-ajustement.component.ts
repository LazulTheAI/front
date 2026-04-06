import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

import {
    AjustementStockRequest,
    EntrepotControllerService,
    EntrepotResponse,
    MateriauControllerService,
    MateriauResponse
} from '@/app/modules/openapi';
import { MessageService, ConfirmationService } from 'primeng/api';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DividerModule } from 'primeng/divider';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { SelectButtonModule } from 'primeng/selectbutton';
import { TextareaModule } from 'primeng/textarea';
import { ToastModule } from 'primeng/toast';

@Component({
    selector: 'app-mobile-ajustement',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        CommonModule,
        FormsModule,
        ButtonModule,
        InputNumberModule,
        AutoCompleteModule,
        SelectModule,
        SelectButtonModule,
        TextareaModule,
        DividerModule,
        ToastModule,
        ConfirmDialogModule
    ],
    providers: [MessageService, ConfirmationService],
    templateUrl: './mobile-ajustement.component.html',
    styleUrl: './mobile-ajustement.component.scss'
})
export class MobileAjustementComponent implements OnInit {
    saving = false;

    allMateriaux: MateriauResponse[] = [];
    filteredMateriaux: MateriauResponse[] = [];
    entrepots: EntrepotResponse[] = [];

    directionOptions = [
        { label: '+ Correction positive', value: 'positif' },
        { label: '− Correction négative', value: 'negatif' }
    ];

    motifOptions = [
        { label: 'Inventaire physique', value: 'Inventaire physique' },
        { label: 'Perte', value: 'Perte' },
        { label: 'Casse', value: 'Casse' },
        { label: 'Autre', value: 'Autre' }
    ];

    form = {
        materiau: null as MateriauResponse | null,
        direction: 'positif' as 'positif' | 'negatif',
        quantite: null as number | null,
        motif: null as string | null,
        note: '',
        entrepotId: null as number | null
    };

    constructor(
        private materiauService: MateriauControllerService,
        private entrepotService: EntrepotControllerService,
        private messageService: MessageService,
        private confirmationService: ConfirmationService,
        private route: ActivatedRoute,
        private cdr: ChangeDetectorRef
    ) {}

    ngOnInit(): void {
        this.loadReferentials();
        this.route.queryParamMap.subscribe((params) => {
            const materiauId = params.get('materiauId');
            if (materiauId) {
                this.materiauService.detailMateriau(+materiauId).subscribe({
                    next: (m) => {
                        this.form.materiau = m;
                        this.cdr.markForCheck();
                    }
                });
            }
        });
    }

    private loadReferentials(): void {
        this.materiauService.tousLesMateriaux().subscribe({
            next: (data: any) => {
                this.allMateriaux = Array.isArray(data) ? data : (data.content ?? []);
                this.cdr.markForCheck();
            }
        });
        this.entrepotService.listerEntrepot().subscribe({
            next: (data: any) => {
                const items = Array.isArray(data) ? data : (data.content ?? data.items ?? []);
                this.entrepots = items.filter((e: EntrepotResponse) => e.actif);
                this.cdr.markForCheck();
            }
        });
    }

    searchMateriau(event: { query: string }): void {
        const q = event.query.toLowerCase();
        this.filteredMateriaux = this.allMateriaux.filter((m) => m.nom?.toLowerCase().includes(q));
    }

    get entrepotOptions() {
        return this.entrepots.map((e) => ({ label: e.nom!, value: e.id! }));
    }

    get currentStock(): number | null {
        if (!this.form.materiau || !this.form.entrepotId) return null;
        const s = this.form.materiau.stocks?.find((s) => s.entrepotId === this.form.entrepotId);
        return s?.stockActuel ?? this.form.materiau.stockTotal ?? null;
    }

    confirmSubmit(ngForm: NgForm): void {
        if (ngForm.invalid || !this.form.materiau?.id || !this.form.quantite || !this.form.entrepotId) return;

        const signe = this.form.direction === 'positif' ? '+' : '−';
        const detail = `${signe}${this.form.quantite} ${this.form.materiau.unite} sur « ${this.form.materiau.nom} » (${this.form.motif ?? 'sans motif'})`;

        this.confirmationService.confirm({
            message: `Confirmer l'ajustement : ${detail} ?`,
            header: 'Confirmer l\'ajustement',
            icon: 'pi pi-exclamation-triangle',
            accept: () => this.submit(ngForm)
        });
    }

    private submit(ngForm: NgForm): void {
        this.saving = true;
        this.cdr.markForCheck();

        const req: AjustementStockRequest = {
            quantite: this.form.quantite!,
            direction: this.form.direction,
            entrepotId: this.form.entrepotId!,
            raison: this.form.motif ? `${this.form.motif}${this.form.note ? ' — ' + this.form.note : ''}` : this.form.note || undefined
        };

        this.materiauService.ajustementMouvementStock(this.form.materiau!.id!, req).subscribe({
            next: () => {
                this.messageService.add({
                    severity: 'success',
                    summary: 'Ajustement enregistré',
                    detail: `Stock de ${this.form.materiau?.nom} ajusté`
                });
                this.saving = false;
                this.resetForm(ngForm);
                this.cdr.markForCheck();
            },
            error: () => {
                this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible d\'enregistrer l\'ajustement' });
                this.saving = false;
                this.cdr.markForCheck();
            }
        });
    }

    private resetForm(ngForm: NgForm): void {
        ngForm.resetForm();
        this.form = { materiau: null, direction: 'positif', quantite: null, motif: null, note: '', entrepotId: null };
    }
}
