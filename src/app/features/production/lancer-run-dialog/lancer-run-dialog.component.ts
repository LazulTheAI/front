import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { DividerModule } from 'primeng/divider';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';

import { EntrepotControllerService, EntrepotResponse, LancerRunRequest, ProductionControllerService, RecetteControllerService, RecetteResponse, ResultatProductionResponse } from '@/app/modules/openapi';
import { HttpEventType } from '@angular/common/http';

@Component({
    selector: 'app-lancer-run-dialog',
    standalone: true,
    imports: [CommonModule, FormsModule, DialogModule, ButtonModule, InputNumberModule, InputTextModule, SelectModule, TextareaModule, DividerModule, TableModule, TagModule],
    providers: [],
    templateUrl: './lancer-run-dialog.component.html'
})
export class LancerRunDialogComponent implements OnChanges, OnInit {
    @Input() visible = false;
    @Output() visibleChange = new EventEmitter<boolean>();
    @Output() saved = new EventEmitter<{ success: boolean; message: string }>();

    saving = false;
    resultat: ResultatProductionResponse | null = null;
    runTermine = false;

    recettes: RecetteResponse[] = [];
    entrepots: EntrepotResponse[] = [];
    recetteOptions: { label: string; value: number }[] = [];
    entrepotOptions: { label: string; value: number }[] = [];
    selectedRecette: RecetteResponse | null = null;

    form = {
        recetteId: null as number | null,
        batches: 1 as number,
        entrepotId: null as number | null,
        notes: '',
        orderId: ''
    };

    constructor(
        private productionService: ProductionControllerService,
        private recetteService: RecetteControllerService,
        private entrepotService: EntrepotControllerService,
        private cdr: ChangeDetectorRef
    ) {}

    ngOnInit(): void {
        this.recetteService.listerRecetteResponse(false).subscribe({
            next: (data: RecetteResponse[]) => {
                this.recettes = data.filter((r) => !r.archive);
                this.recetteOptions = this.recettes.map((r) => ({
                    label: `${r.nom} (→ ${r.quantiteProduite} ${r.uniteProduite}/batch)`,
                    value: r.id!
                }));
                this.cdr.detectChanges();
            }
        });

        this.entrepotService.listerEntrepot().subscribe({
            next: (data: EntrepotResponse[]) => {
                this.entrepots = data.filter((e) => e.actif);
                this.entrepotOptions = this.entrepots.map((e) => ({ label: e.nom!, value: e.id! }));
                if (this.entrepots.length === 1) {
                    this.form.entrepotId = this.entrepots[0].id!;
                }
                this.cdr.detectChanges();
            }
        });
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['visible'] && this.visible && !this.runTermine) {
            this.form = {
                recetteId: null,
                batches: 1,
                entrepotId: this.entrepots[0]?.id ?? null,
                notes: '',
                orderId: ''
            };
            this.selectedRecette = null;
            this.resultat = null;
        }
    }

    onRecetteChange(recetteId: number): void {
        this.selectedRecette = this.recettes.find((r) => r.id === recetteId) ?? null;
        this.cdr.detectChanges();
    }

    get unitesPrevues(): number {
        if (!this.selectedRecette || !this.form.batches) return 0;
        return (this.selectedRecette.quantiteProduite ?? 0) * this.form.batches;
    }

    submit(): void {
        // Validation manuelle sans ViewChild
        if (!this.form.recetteId || !this.form.entrepotId || !this.form.batches) return;

        this.saving = true;

        const req: LancerRunRequest = {
            recetteId: this.form.recetteId!,
            batches: this.form.batches,
            entrepotId: this.form.entrepotId!,
            notes: this.form.notes || undefined,
            orderId: this.form.orderId || undefined
        };

        this.productionService.lancerRunProduction(req, 'response', false, { transferCache: false }).subscribe({
            next: (event: any) => {
                console.log('EVENT:', event);
                if (event.type === HttpEventType.Response) {
                    this.saving = false;
                    this.resultat = event.body ?? ({} as any);
                    this.runTermine = true;
                    setTimeout(() => {
                        this.cdr.detectChanges();
                    }, 0); // ← force un cycle de détection après la mise à jour
                }
            },
            error: (err) => {
                this.saving = false;
                const detail = err?.error?.message ?? 'Impossible de lancer le run';
                this.saved.emit({ success: false, message: detail });
            }
        });
    }

    fermer(): void {
        this.runTermine = false;
        this.saving = false;
        if (this.resultat) {
            this.saved.emit({
                success: true,
                message: `Run terminé — ${this.resultat.unitesProduite} ${this.selectedRecette?.uniteProduite ?? 'unités'} produites`
            });
        }
        this.resultat = null;
        this.visibleChange.emit(false);
    }

    onHide(): void {
        this.runTermine = false;
        this.saving = false;
        if (this.resultat) {
            this.saved.emit({ success: true, message: 'Run terminé avec succès' });
        }
        this.resultat = null;
        this.visibleChange.emit(false);
    }
}
