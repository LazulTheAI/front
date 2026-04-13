import { CommandeControllerService, LotDisponibleResponse, ProduitControllerService, RevendeurControllerService } from '@/app/modules/openapi';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoModule } from '@jsverse/transloco';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { DialogModule } from 'primeng/dialog';
import { DividerModule } from 'primeng/divider';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';

interface LigneForm {
    produitId: number | null;
    quantite: number | null;
    prixUnitaireCents: number | null;
    remise: number | null;
    notes: string | null;
    lotId: number | null;
    // UI
    lotsDisponibles: LotDisponibleResponse[];
    lotsLoading: boolean;
    lotLabel: string | null;
}

@Component({
    selector: 'app-commande-form-dialog',
    standalone: true,
    imports: [CommonModule, FormsModule, DialogModule, ButtonModule, DividerModule, InputNumberModule, InputTextModule, SelectModule, DatePickerModule, TagModule, TranslocoModule, ToastModule, CurrencyPipe],
    providers: [MessageService],
    templateUrl: './commande-form-dialog.component.html'
})
export class CommandeFormDialogComponent implements OnInit {
    @Input() visible = false;
    @Output() visibleChange = new EventEmitter<boolean>();
    @Output() saved = new EventEmitter<void>();

    form = {
        revendeurId: null as number | null,
        dateLivraisonSouhaitee: null as Date | null,
        remise: null as number | null,
        notes: null as string | null
    };

    lignes: LigneForm[] = [];
    revendeurOptions: { label: string; value: number; remiseGlobale?: number }[] = [];
    produitOptions: { label: string; value: number; prixCents?: number }[] = [];
    selectedRevendeur: { remiseGlobale?: number } | null = null;
    today = new Date();
    saving = false;

    constructor(
        private commandeService: CommandeControllerService,
        private revendeurService: RevendeurControllerService,
        private produitService: ProduitControllerService,
        private messageService: MessageService
    ) {}

    ngOnInit() {
        this.revendeurService.listerRevendeurActifs().subscribe(
            (list) =>
                (this.revendeurOptions = list.map((r) => ({
                    label: r.nom,
                    value: r.id,
                    remiseGlobale: r.remiseGlobale
                })))
        );

        this.produitService.listerProduit(0, 500).subscribe(
            (page) =>
                (this.produitOptions =
                    page.content?.map((p) => ({
                        label: `${p.nom}${p.sku ? ' — ' + p.sku : ''}`,
                        value: p.id!,
                        prixCents: p.prixCents
                    })) ?? [])
        );
    }

    onRevendeurChange() {
        const rev = this.revendeurOptions.find((r) => r.value === this.form.revendeurId);
        this.selectedRevendeur = rev ?? null;
        if (rev?.remiseGlobale && !this.form.remise) {
            this.form.remise = rev.remiseGlobale;
        }
    }

    ajouterLigne() {
        this.lignes.push({
            produitId: null,
            quantite: null,
            prixUnitaireCents: null,
            remise: null,
            notes: null,
            lotId: null,
            lotsDisponibles: [],
            lotsLoading: false,
            lotLabel: null
        });
    }

    supprimerLigne(i: number) {
        this.lignes.splice(i, 1);
    }

    onProduitChange(ligne: LigneForm) {
        // Prix par défaut
        const opt = this.produitOptions.find((p) => p.value === ligne.produitId);
        if (opt?.prixCents && !ligne.prixUnitaireCents) {
            ligne.prixUnitaireCents = opt.prixCents;
        }
        // Reset lot
        ligne.lotId = null;
        ligne.lotLabel = null;
        ligne.lotsDisponibles = [];

        if (!ligne.produitId) return;

        // Charger les lots disponibles
        ligne.lotsLoading = true;
        this.commandeService.lotsDisponibles(ligne.produitId).subscribe({
            next: (lots) => {
                ligne.lotsDisponibles = lots;
                // Auto-sélectionner le premier (DLC la plus proche)
                if (lots.length > 0) {
                    ligne.lotId = lots[0].lotId;
                    ligne.lotLabel = this.formatLotLabel(lots[0]);
                }
                ligne.lotsLoading = false;
            },
            error: () => {
                ligne.lotsLoading = false;
            }
        });
    }

    formatLotLabel(lot: LotDisponibleResponse): string {
        const dlc = lot.expiresAt ? new Date(lot.expiresAt).toLocaleDateString('fr-FR') : '—';
        const qte = lot.quantiteDisponible;
        return `${lot.numeroLot ?? 'Sans n°'} · DLC ${dlc} · ${qte} dispo · ${lot.entrepotNom}`;
    }

    lotOptions(ligne: LigneForm) {
        return ligne.lotsDisponibles.map((l) => ({
            label: this.formatLotLabel(l),
            value: l.lotId
        }));
    }

    get sousTotal(): number {
        return this.lignes.reduce((acc, l) => {
            if (!l.prixUnitaireCents || !l.quantite) return acc;
            return acc + (l.prixUnitaireCents / 100) * l.quantite;
        }, 0);
    }

    get totalHT(): number {
        const remise = this.form.remise ?? 0;
        return this.sousTotal * (1 - remise / 100);
    }

    isFormValid(): boolean {
        return !!this.form.revendeurId && this.lignes.length > 0 && this.lignes.every((l) => !!l.produitId && !!l.quantite && l.quantite > 0);
    }

    submit() {
        if (!this.isFormValid()) return;
        this.saving = true;

        const payload = {
            revendeurId: this.form.revendeurId!,
            dateLivraisonSouhaitee: this.form.dateLivraisonSouhaitee?.toISOString() ?? null,
            remise: this.form.remise,
            notes: this.form.notes,
            lignes: this.lignes.map((l) => ({
                produitId: l.produitId!,
                quantite: l.quantite!,
                prixUnitaireCents: l.prixUnitaireCents,
                remise: l.remise,
                notes: l.notes,
                lotId: l.lotId // ← envoyé au backend
            }))
        };

        this.commandeService.creerCommande(payload).subscribe({
            next: () => {
                this.messageService.add({ severity: 'success', summary: 'Commande créée' });
                this.saved.emit();
                this.onHide();
            },
            error: (err) => {
                this.messageService.add({
                    severity: 'error',
                    summary: 'Erreur',
                    detail: err?.error?.message ?? 'Erreur lors de la création'
                });
                this.saving = false;
            }
        });
    }

    onHide() {
        this.visible = false;
        this.visibleChange.emit(false);
        this.reset();
    }

    private reset() {
        this.form = { revendeurId: null, dateLivraisonSouhaitee: null, remise: null, notes: null };
        this.lignes = [];
        this.saving = false;
        this.selectedRevendeur = null;
    }
}
