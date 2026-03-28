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

import { EntrepotControllerService, EntrepotResponse, LancerRunRequest, ProductionControllerService, ProduitControllerService, ProduitResponse, RecetteControllerService, RecetteResponse, ResultatProductionResponse } from '@/app/modules/openapi';
import { HttpEventType } from '@angular/common/http';

interface SelectOption {
    label: string;
    value: number;
}

@Component({
    selector: 'app-lancer-run-dialog',
    standalone: true,
    imports: [CommonModule, FormsModule, DialogModule, ButtonModule, InputNumberModule, InputTextModule, SelectModule, TextareaModule, DividerModule, TableModule, TagModule],
    templateUrl: './lancer-run-dialog.component.html'
})
export class LancerRunDialogComponent implements OnChanges, OnInit {
    @Input() visible = false;
    @Output() visibleChange = new EventEmitter<boolean>();
    @Output() saved = new EventEmitter<{ success: boolean; message: string }>();

    saving = false;
    resultat: ResultatProductionResponse | null = null;
    runTermine = false;

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
        private cdr: ChangeDetectorRef
    ) {}

    ngOnInit(): void {
        // Charger produits actifs avec recettes liées
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

        // Charger toutes les recettes actives (pour override manuel si besoin)
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
        if (changes['visible'] && this.visible && !this.runTermine) {
            this.resetForm();
        }
    }

    onProduitChange(produitId: number): void {
        this.selectedProduit = this.produits.find((p) => p.id === produitId) ?? null;

        // Pré-remplir la recette principale automatiquement
        const recettePrincipale = this.selectedProduit?.recettes?.find((r: any) => r.estPrincipale) ?? this.selectedProduit?.recettes?.[0];

        if (recettePrincipale) {
            this.form.recetteId = recettePrincipale.recetteId;
            this.selectedRecette = this.recettes.find((r) => r.id === recettePrincipale.recetteId) ?? null;

            // Options recettes limitées aux recettes liées à ce produit
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

    submit(): void {
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
                if (event.type === HttpEventType.Response) {
                    this.saving = false;
                    this.resultat = event.body ?? ({} as any);
                    this.runTermine = true;
                    setTimeout(() => this.cdr.detectChanges(), 0);
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
        this.resultat = null;
        this.cdr.detectChanges();
    }
}
