import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Inject, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { Button } from 'primeng/button';
import { DatePicker } from 'primeng/datepicker';
import { DialogModule } from 'primeng/dialog';
import { Divider } from 'primeng/divider';
import { InputNumber } from 'primeng/inputnumber';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';

import { CommandeB2BControllerService, ProduitControllerService, ProduitResponse, RevendeurControllerService, RevendeurResponse } from '@/app/modules/openapi';
import { TranslocoModule } from '@jsverse/transloco';

interface LigneForm {
    produitId: number | null;
    produitNom: string;
    quantite: number;
    prixUnitaireCents: number | null;
    remise: number | null;
}

interface SelectOption {
    label: string;
    value: number | null;
}

@Component({
    selector: 'app-commande-b2b-form-dialog',
    standalone: true,
    imports: [CommonModule, TranslocoModule, FormsModule, DialogModule, Button, Select, InputNumber, InputText, DatePicker, Divider],
    templateUrl: './commande-b2b-form-dialog.component.html'
})
export class CommandeB2BFormDialogComponent implements OnInit, OnChanges {
    @Input() visible = false;
    @Output() visibleChange = new EventEmitter<boolean>();
    @Output() saved = new EventEmitter<void>();

    saving = false;

    revendeurs: RevendeurResponse[] = [];
    produits: ProduitResponse[] = [];
    revendeurOptions: SelectOption[] = [];
    produitOptions: SelectOption[] = [];

    form = {
        revendeurId: null as number | null,
        dateLivraisonSouhaitee: null as Date | null,
        remise: null as number | null,
        notes: ''
    };

    lignes: LigneForm[] = [];
    today = new Date();

    get selectedRevendeur(): RevendeurResponse | null {
        return this.revendeurs.find((r) => r.id === this.form.revendeurId) ?? null;
    }

    get totalHT(): number {
        const sousTotal = this.lignes.reduce((sum, l) => {
            if (!l.prixUnitaireCents || !l.quantite) return sum;
            let montant = (l.prixUnitaireCents / 100) * l.quantite;
            if (l.remise) montant *= 1 - l.remise / 100;
            return sum + montant;
        }, 0);
        if (this.form.remise) return sousTotal * (1 - this.form.remise / 100);
        return sousTotal;
    }

    get sousTotal(): number {
        return this.lignes.reduce((sum, l) => {
            if (!l.prixUnitaireCents || !l.quantite) return sum;
            let montant = (l.prixUnitaireCents / 100) * l.quantite;
            if (l.remise) montant *= 1 - l.remise / 100;
            return sum + montant;
        }, 0);
    }

    constructor(
        private commandeService: CommandeB2BControllerService,
        @Inject(RevendeurControllerService)
        private revendeurService: RevendeurControllerService,
        private produitService: ProduitControllerService
    ) {}

    ngOnInit(): void {
        this.revendeurService.listerRevendeurActifs().subscribe({
            next: (list) => {
                this.revendeurs = list;
                this.revendeurOptions = list.map((r) => ({ label: r.nom!, value: r.id! }));
            }
        });
        this.produitService.listerProduit(0, 500, 'nom', 'asc', undefined).subscribe({
            next: (data: any) => {
                this.produits = (data.content ?? []).filter((p: ProduitResponse) => (p as any).actif !== false);
                this.produitOptions = this.produits.map((p) => ({
                    label: p.sku ? `${p.nom} (${p.sku})` : p.nom!,
                    value: p.id!
                }));
            }
        });
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['visible'] && this.visible) {
            this.resetForm();
        }
    }

    onRevendeurChange(): void {
        // Pré-remplir remise depuis la remise globale du revendeur
        const r = this.selectedRevendeur;
        if (r?.remiseGlobale != null && this.form.remise == null) {
            this.form.remise = Number(r.remiseGlobale);
        }
    }

    onProduitChange(ligne: LigneForm): void {
        const produit = this.produits.find((p) => p.id === ligne.produitId);
        if (produit) {
            ligne.produitNom = produit.nom!;
            ligne.prixUnitaireCents = produit.prixCents ?? null;
        }
    }

    ajouterLigne(): void {
        this.lignes.push({ produitId: null, produitNom: '', quantite: 1, prixUnitaireCents: null, remise: null });
    }

    supprimerLigne(i: number): void {
        this.lignes.splice(i, 1);
    }

    isFormValid(): boolean {
        return !!(this.form.revendeurId && this.lignes.length > 0 && this.lignes.every((l) => l.produitId && l.quantite > 0));
    }

    submit(): void {
        if (!this.isFormValid()) return;
        this.saving = true;

        const req = {
            revendeurId: this.form.revendeurId!,
            templateId: undefined,
            dateLivraisonSouhaitee: this.form.dateLivraisonSouhaitee?.toISOString() ?? undefined,
            remise: this.form.remise ?? undefined,
            notes: this.form.notes || undefined,
            lignes: this.lignes.map((l) => ({
                produitId: l.produitId!,
                quantite: l.quantite,
                prixUnitaireCents: l.prixUnitaireCents ?? undefined,
                remise: l.remise ?? undefined,
                notes: undefined
            }))
        };

        this.commandeService.creerCommandeB2B(req as any).subscribe({
            next: () => {
                this.saving = false;
                this.saved.emit();
                this.onHide();
            },
            error: () => {
                this.saving = false;
            }
        });
    }

    onHide(): void {
        this.visibleChange.emit(false);
    }

    private resetForm(): void {
        this.form = { revendeurId: null, dateLivraisonSouhaitee: null, remise: null, notes: '' };
        this.lignes = [];
    }
}
