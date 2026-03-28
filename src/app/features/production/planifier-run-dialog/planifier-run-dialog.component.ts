import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';

import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { DividerModule } from 'primeng/divider';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';

import { EntrepotControllerService, EntrepotResponse, PlanifierRunRequest, ProductionControllerService, ProduitControllerService, ProduitResponse, RecetteControllerService, RecetteResponse } from '@/app/modules/openapi';

interface SelectOption {
    label: string;
    value: number;
}

@Component({
    selector: 'app-planifier-run-dialog',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, FormsModule, DialogModule, ButtonModule, InputNumberModule, InputTextModule, SelectModule, TextareaModule, DividerModule],
    templateUrl: './planifier-run-dialog.component.html'
})
export class PlanifierRunDialogComponent implements OnChanges, OnInit {
    @Input() visible = false;
    @Output() visibleChange = new EventEmitter<boolean>();
    @Output() saved = new EventEmitter<{ success: boolean; message: string }>();

    saving = false;

    produits: ProduitResponse[] = [];
    recettes: RecetteResponse[] = [];
    entrepots: EntrepotResponse[] = [];

    produitOptions: SelectOption[] = [];
    recetteOptions: SelectOption[] = [];
    entrepotOptions: SelectOption[] = [];

    selectedProduit: ProduitResponse | null = null;
    selectedRecette: RecetteResponse | null = null;

    form = {
        produitId: null as number | null,
        recetteId: null as number | null,
        batches: 1 as number,
        entrepotId: null as number | null,
        notes: '',
        orderId: ''
    };

    constructor(
        private productionService: ProductionControllerService,
        private produitService: ProduitControllerService,
        private recetteService: RecetteControllerService,
        private entrepotService: EntrepotControllerService,
        public cdr: ChangeDetectorRef
    ) {}

    ngOnInit(): void {
        this.produitService.listerProduit(0, 500, 'nom', 'asc', undefined).subscribe({
            next: (data: any) => {
                this.produits = (data.content ?? []).filter((p: ProduitResponse) => p.actif !== false && p.recettes && p.recettes.length > 0);
                this.produitOptions = this.produits.map((p) => ({
                    label: p.sku ? `${p.nom} (${p.sku})` : p.nom!,
                    value: p.id!
                }));
                this.cdr.detectChanges();
            }
        });

        this.recetteService.listerRecetteResponse(false).subscribe({
            next: (data: RecetteResponse[]) => {
                this.recettes = data.filter((r) => !r.archive);
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
        if (changes['visible'] && this.visible) {
            this.resetForm();
        }
    }

    onProduitChange(produitId: number): void {
        this.selectedProduit = this.produits.find((p) => p.id === produitId) ?? null;

        const recettePrincipale = this.selectedProduit?.recettes?.find((r: any) => r.estPrincipale) ?? this.selectedProduit?.recettes?.[0];

        if (recettePrincipale) {
            this.form.recetteId = recettePrincipale.recetteId;
            this.selectedRecette = this.recettes.find((r) => r.id === recettePrincipale.recetteId) ?? null;
            this.recetteOptions = (this.selectedProduit?.recettes ?? []).map((pr: any) => ({
                label: pr.recetteNom + (pr.estPrincipale ? ' ★' : ''),
                value: pr.recetteId
            }));
        } else {
            this.form.recetteId = null;
            this.selectedRecette = null;
            this.recetteOptions = [];
        }

        this.cdr.detectChanges();
    }

    onRecetteChange(recetteId: number): void {
        this.selectedRecette = this.recettes.find((r) => r.id === recetteId) ?? null;
        this.cdr.detectChanges();
    }

    get unitesPrevues(): number {
        if (!this.selectedRecette || !this.form.batches) return 0;
        return (this.selectedRecette.quantiteProduite ?? 0) * this.form.batches;
    }

    submit(ngForm: NgForm): void {
        if (ngForm.invalid) return;
        this.saving = true;

        const req: PlanifierRunRequest = {
            recetteId: this.form.recetteId!,
            batches: this.form.batches,
            entrepotId: this.form.entrepotId!,
            notes: this.form.notes || undefined,
            orderId: this.form.orderId || undefined
        };

        this.productionService.planifierRunProduction(req).subscribe({
            next: () => {
                this.saving = false;
                this.saved.emit({ success: true, message: 'Run planifié avec succès' });
            },
            error: () => {
                this.saving = false;
                this.saved.emit({ success: false, message: 'Impossible de planifier le run' });
            }
        });
    }

    onHide(): void {
        this.visibleChange.emit(false);
    }

    private resetForm(): void {
        this.form = {
            produitId: null,
            recetteId: null,
            batches: 1,
            entrepotId: this.entrepots[0]?.id ?? null,
            notes: '',
            orderId: ''
        };
        this.selectedProduit = null;
        this.selectedRecette = null;
        this.recetteOptions = [];
        this.cdr.detectChanges();
    }
}
