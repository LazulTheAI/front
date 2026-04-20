import { CommandeControllerService, CommandeResponse, LotDisponibleResponse } from '@/app/modules/openapi';
import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';

interface LotLigneEdit {
    commandeLotId: number | null;
    produitId: number;
    produitNom: string;
    lotActuelId: number | null;
    lotActuelLabel: string | null;
    lotId: number | null;
    lotsDisponibles: LotDisponibleResponse[];
    lotsLoading: boolean;
}

@Component({
    selector: 'app-commande-changer-lot-dialog',
    standalone: true,
    imports: [CommonModule, FormsModule, TranslocoModule, DialogModule, ButtonModule, SelectModule, TagModule, ToastModule],
    providers: [MessageService],
    template: `
        <p-toast />
        <p-dialog
            [header]="'commandes.changer_lots_titre' | transloco: { numero: commande?.numero ?? '' }"
            [(visible)]="visible"
            (onHide)="onHide()"
            [modal]="true"
            [draggable]="false"
            [resizable]="false"
            [style]="{ width: '620px' }">

            <div class="flex flex-column gap-3 pt-2">

                @if (lignes.length === 0 && !loading) {
                    <div class="text-center text-400 py-4">
                        <i class="pi pi-box text-2xl block mb-2 opacity-30"></i>
                        {{ 'commandes.changer_lots_aucune_ligne' | transloco }}
                    </div>
                }

                @for (ligne of lignes; track ligne.produitId) {
                    <div class="surface-50 border-round border-1 surface-border p-3">
                        <div class="font-medium text-900 text-sm mb-2">
                            <i class="pi pi-box mr-1 text-400"></i>{{ ligne.produitNom }}
                        </div>

                        <!-- Lot actuel (uniquement si un lot est déjà assigné) -->
                        @if (ligne.lotActuelId !== null) {
                            <div class="text-xs text-500 mb-1">{{ 'commandes.changer_lots_lot_actuel' | transloco }} :</div>
                            <div class="font-mono text-xs bg-gray-100 px-2 py-1 border-round text-700 mb-2 inline-block">
                                {{ ligne.lotActuelLabel }}
                            </div>
                        }

                        <!-- Choix du lot -->
                        <div class="flex flex-column gap-1 mt-2">
                            <label class="text-xs text-500">
                                {{ (ligne.lotActuelId !== null
                                    ? 'commandes.changer_lots_choisir_autre_lot'
                                    : 'commandes.changer_lots_choisir_lot') | transloco }} :
                            </label>

                            @if (ligne.lotsLoading) {
                                <div class="text-400 text-xs">
                                    <i class="pi pi-spin pi-spinner mr-1"></i>{{ 'common.loading' | transloco }}
                                </div>
                            } @else if (ligne.lotsDisponibles.length === 0) {
                                <div class="text-orange-500 text-xs">
                                    <i class="pi pi-exclamation-triangle mr-1"></i>
                                    {{ 'commandes.changer_lots_aucun_disponible' | transloco }}
                                </div>
                            } @else {
                                <p-select
                                    [(ngModel)]="ligne.lotId"
                                    [options]="lotOptions(ligne)"
                                    optionLabel="label"
                                    optionValue="value"
                                    [placeholder]="ligne.lotActuelId !== null
                                        ? ('commandes.changer_lots_conserver_lot' | transloco)
                                        : ('commandes.changer_lots_choisir_lot' | transloco)"
                                    appendTo="body"
                                    [style]="{ width: '100%' }" />
                            }
                        </div>
                    </div>
                }
            </div>

            <ng-template pTemplate="footer">
                <div class="flex justify-content-end gap-2">
                    <p-button
                        [label]="'common.cancel' | transloco"
                        severity="secondary"
                        [outlined]="true"
                        (onClick)="onHide()"
                        [disabled]="saving" />
                    <p-button
                        [label]="'common.save' | transloco"
                        icon="pi pi-check"
                        [loading]="saving"
                        [disabled]="!hasChanges()"
                        (onClick)="submit()" />
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
    loading = false;

    constructor(
        private commandeService: CommandeControllerService,
        private messageService: MessageService,
        private transloco: TranslocoService
    ) {}

    ngOnChanges() {
        if (this.visible && this.commande) this.chargerLots();
    }

    private chargerLots() {
        this.loading = true;
        const lotsExistants = this.commande!.lots ?? [];

        if (lotsExistants.length > 0) {
            // Cas normal : des lots sont déjà associés — permettre de les changer
            this.lignes = lotsExistants.map((lot) => ({
                commandeLotId: lot.id ?? null,
                produitId: lot.produitId!,
                produitNom: lot.produitNom ?? '—',
                lotActuelId: lot.mouvementStockProduitId ?? null,
                lotActuelLabel: `${lot.numeroDeLot ?? 'Sans n°'} · DLC ${lot.dlcProduitFini ? new Date(lot.dlcProduitFini).toLocaleDateString('fr-FR') : '—'}`,
                lotId: null,
                lotsDisponibles: [],
                lotsLoading: true
            }));
        } else {
            // Aucun lot associé : proposer les produits de la commande avec leurs lots disponibles
            this.lignes = (this.commande!.lignes ?? []).map((ligne) => ({
                commandeLotId: null,
                produitId: ligne.produitId!,
                produitNom: ligne.produitNom ?? '—',
                lotActuelId: null,
                lotActuelLabel: null,
                lotId: null,
                lotsDisponibles: [],
                lotsLoading: true
            }));
        }

        this.loading = false;

        this.lignes.forEach((ligne) => {
            this.commandeService.lotsDisponibles(ligne.produitId).subscribe({
                next: (lots) => {
                    // Exclure le lot actuel de la liste si on en a un
                    ligne.lotsDisponibles = ligne.lotActuelId
                        ? lots.filter((l) => l.lotId !== ligne.lotActuelId)
                        : lots;
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
        const changements = this.lignes
            .filter((l) => l.lotId !== null)
            .map((l) => ({
                commandeLotId: l.commandeLotId ?? undefined,
                nouveauLotId: l.lotId!
            }));

        if (changements.length === 0) return;
        this.saving = true;

        this.commandeService.changerLots(this.commande!.id!, { changements }).subscribe({
            next: () => {
                this.messageService.add({
                    severity: 'success',
                    summary: this.transloco.translate('commandes.changer_lots_succes')
                });
                this.saved.emit();
                this.onHide();
            },
            error: (err) => {
                this.messageService.add({
                    severity: 'error',
                    summary: this.transloco.translate('common.error'),
                    detail: err?.error?.message ?? this.transloco.translate('commandes.changer_lots_erreur')
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
        this.loading = false;
    }
}
