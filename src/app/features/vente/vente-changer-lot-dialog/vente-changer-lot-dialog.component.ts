import { CommandeControllerService, CommandeResponse, LotDisponibleResponse } from '@/app/modules/openapi';
import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';

interface LotLigneEdit {
    commandeLotId: number;
    produitId: number;
    produitNom: string;
    lotActuelId: number | null;
    lotActuelLabel: string;
    lotId: number | null;
    lotsDisponibles: LotDisponibleResponse[];
    lotsLoading: boolean;
}

@Component({
    selector: 'app-commande-changer-lot-dialog',
    standalone: true,
    imports: [CommonModule, FormsModule, DialogModule, ButtonModule, SelectModule, TagModule, ToastModule],
    providers: [MessageService],
    template: `
        <p-toast />
        <p-dialog header="Modifier les lots — {{ commande?.numero }}" [(visible)]="visible" (onHide)="onHide()" [modal]="true" [draggable]="false" [resizable]="false" [style]="{ width: '620px' }">
            <div class="flex flex-column gap-3 pt-2">
                @if (lignes.length === 0) {
                    <div class="text-center text-400 py-4">
                        <i class="pi pi-box text-2xl block mb-2 opacity-30"></i>
                        Aucun lot associé à cette commande
                    </div>
                }

                @for (ligne of lignes; track ligne.commandeLotId) {
                    <div class="surface-50 border-round border-1 surface-border p-3">
                        <div class="font-medium text-900 text-sm mb-2"><i class="pi pi-box mr-1 text-400"></i>{{ ligne.produitNom }}</div>

                        <!-- Lot actuel -->
                        <div class="text-xs text-500 mb-1">Lot actuel :</div>
                        <div class="font-mono text-xs bg-gray-100 px-2 py-1 border-round text-700 mb-2 inline-block">
                            {{ ligne.lotActuelLabel }}
                        </div>

                        <!-- Nouveau lot -->
                        <div class="flex flex-column gap-1 mt-2">
                            <label class="text-xs text-500">Choisir un autre lot :</label>
                            @if (ligne.lotsLoading) {
                                <div class="text-400 text-xs">Chargement…</div>
                            } @else if (ligne.lotsDisponibles.length === 0) {
                                <div class="text-orange-500 text-xs"><i class="pi pi-exclamation-triangle mr-1"></i>Aucun autre lot disponible</div>
                            } @else {
                                <p-select [(ngModel)]="ligne.lotId" [options]="lotOptions(ligne)" optionLabel="label" optionValue="value" placeholder="Conserver le lot actuel" appendTo="body" [style]="{ width: '100%' }" />
                            }
                        </div>
                    </div>
                }
            </div>

            <ng-template pTemplate="footer">
                <div class="flex justify-content-end gap-2">
                    <p-button label="Annuler" severity="secondary" [outlined]="true" (onClick)="onHide()" [disabled]="saving" />
                    <p-button label="Enregistrer" icon="pi pi-check" [loading]="saving" [disabled]="!hasChanges()" (onClick)="submit()" />
                </div>
            </ng-template>
        </p-dialog>
    `
})
export class CommandeChangerLotDialogComponent implements OnChanges {
    @Input() visible = false;
    @Input() commande: CommandeResponse | null = null;
    @Output() visibleChange = new EventEmitter<boolean>();
    @Output() saved = new EventEmitter<void>();

    lignes: LotLigneEdit[] = [];
    saving = false;

    constructor(
        private commandeService: CommandeControllerService,
        private messageService: MessageService
    ) {}

    ngOnChanges() {
        if (this.visible && this.commande) this.chargerLots();
    }

    private chargerLots() {
        this.lignes = (this.commande!.lots ?? []).map((lot) => ({
            commandeLotId: lot.id,
            produitId: lot.produitId,
            produitNom: lot.produitNom,
            lotActuelId: lot.mouvementStockProduitId ?? null,
            lotActuelLabel: `${lot.numeroDeLot ?? 'Sans n°'} · DLC ${lot.dlcProduitFini ? new Date(lot.dlcProduitFini).toLocaleDateString('fr-FR') : '—'}`,
            lotId: null, // null = pas de changement
            lotsDisponibles: [],
            lotsLoading: true
        }));

        this.lignes.forEach((ligne) => {
            this.commandeService.lotsDisponibles(ligne.produitId).subscribe({
                next: (lots) => {
                    // Exclure le lot actuel de la liste
                    ligne.lotsDisponibles = lots.filter((l) => l.lotId !== ligne.lotActuelId);
                    ligne.lotsLoading = false;
                },
                error: () => {
                    ligne.lotsLoading = false;
                }
            });
        });
    }

    lotOptions(ligne: LotLigneEdit) {
        return ligne.lotsDisponibles.map((l) => ({
            label: `${l.numeroLot ?? 'Sans n°'} · DLC ${l.expiresAt ? new Date(l.expiresAt).toLocaleDateString('fr-FR') : '—'} · ${l.quantiteDisponible} dispo · ${l.entrepotNom}`,
            value: l.lotId
        }));
    }

    hasChanges(): boolean {
        return this.lignes.some((l) => l.lotId !== null);
    }

    submit() {
        const changements = this.lignes.filter((l) => l.lotId !== null).map((l) => ({ commandeLotId: l.commandeLotId, nouveauLotId: l.lotId! }));

        if (changements.length === 0) return;
        this.saving = true;

        this.commandeService.changerLots(this.commande!.id!, { changements }).subscribe({
            next: () => {
                this.messageService.add({ severity: 'success', summary: 'Lots mis à jour' });
                this.saved.emit();
                this.onHide();
            },
            error: (err) => {
                this.messageService.add({
                    severity: 'error',
                    summary: 'Erreur',
                    detail: err?.error?.message ?? 'Erreur lors de la modification'
                });
                this.saving = false;
            }
        });
    }

    onHide() {
        this.visible = false;
        this.visibleChange.emit(false);
        this.lignes = [];
        this.saving = false;
    }
}
