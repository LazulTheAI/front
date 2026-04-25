import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';

import { MobileEntrepotService } from '@/app/modules/mobile/services/mobile-entrepot.service';
import { BonCommandeControllerService, BonCommandeResponse, EntreeStockRequest, LigneCommandeFournisseurResponse, MateriauControllerService, MateriauResponse, ReceptionControllerService, ReceptionRequest } from '@/app/modules/openapi';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { SkeletonModule } from 'primeng/skeleton';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';

interface LotEntry {
    quantite: number;
    numeroLot: string;
    dlc: Date | null;
}

interface LigneReception {
    ligne: LigneCommandeFournisseurResponse;
    dlcObligatoire: boolean;
    checked: boolean;
    lots: LotEntry[];
}

type ReceptionStep = 'select' | 'lines';

@Component({
    selector: 'app-mobile-reception',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, FormsModule, ButtonModule, InputTextModule, InputNumberModule, DatePickerModule, SkeletonModule, TagModule, ToastModule, TranslocoModule],
    providers: [MessageService],
    templateUrl: './mobile-reception.component.html',
    styleUrl: './mobile-reception.component.scss'
})
export class MobileReceptionComponent implements OnInit {
    step: ReceptionStep = 'select';
    today = new Date();

    // Étape 1 — sélection
    commandes: BonCommandeResponse[] = [];
    loadingCommandes = false;

    // Étape 2 — lignes
    selectedCommande: BonCommandeResponse | null = null;
    lignes: LigneReception[] = [];
    loadingCommande = false;

    submitting = false;

    get selectedEntrepotNom(): string {
        return this.mobileEntrepotService.selected?.nom ?? '—';
    }

    get checkedLignes(): LigneReception[] {
        return this.lignes.filter((l) => l.checked);
    }

    get canSubmit(): boolean {
        const checked = this.checkedLignes;
        return !!this.mobileEntrepotService.selected?.id && checked.length > 0 && checked.every((l) => l.lots.every((lot) => (lot.quantite ?? 0) > 0 && (!l.dlcObligatoire || lot.dlc !== null)));
    }

    getTotalLots(entry: LigneReception): number {
        return entry.lots.reduce((s, l) => s + (l.quantite ?? 0), 0);
    }

    getQteRestante(entry: LigneReception): number {
        return Math.max(0, (entry.ligne.quantiteCommandee ?? 0) - (entry.ligne.quantiteRecue ?? 0));
    }

    isOverReceiving(entry: LigneReception): boolean {
        return this.getTotalLots(entry) > this.getQteRestante(entry);
    }

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private bonCommandeService: BonCommandeControllerService,
        private receptionService: ReceptionControllerService,
        private materiauService: MateriauControllerService,
        private mobileEntrepotService: MobileEntrepotService,
        private messageService: MessageService,
        private transloco: TranslocoService,
        private cdr: ChangeDetectorRef
    ) {}

    ngOnInit(): void {
        const commandeId = this.route.snapshot.queryParamMap.get('commandeId');
        if (commandeId) {
            this.loadCommande(+commandeId);
        } else {
            this.loadCommandes();
        }
    }

    // ── Étape 1 ────────────────────────────────────────────────────────────

    loadCommandes(): void {
        this.step = 'select';
        this.loadingCommandes = true;
        this.bonCommandeService.listerBonCommande(0, 50, 'dateCommande', 'desc').subscribe({
            next: (data: any) => {
                const all: BonCommandeResponse[] = data.content ?? data ?? [];
                this.commandes = all.filter((c) => c.statut === 'ENVOYE' || c.statut === 'PARTIELLEMENT_RECU');
                this.loadingCommandes = false;
                this.cdr.markForCheck();
            },
            error: () => {
                this.loadingCommandes = false;
                this.cdr.markForCheck();
            }
        });
    }

    selectCommande(commande: BonCommandeResponse): void {
        this.loadCommande(commande.id!);
    }

    // ── Étape 2 ────────────────────────────────────────────────────────────

    private loadCommande(id: number): void {
        this.step = 'lines';
        this.loadingCommande = true;
        this.bonCommandeService.getBonCommandeById(id).subscribe({
            next: (commande) => {
                this.selectedCommande = commande;
                this.buildLignes(commande);
                this.loadingCommande = false;
                this.cdr.markForCheck();
            },
            error: () => {
                this.loadingCommande = false;
                this.cdr.markForCheck();
            }
        });
    }

    private buildLignes(commande: BonCommandeResponse): void {
        const pending = (commande.lignes ?? []).filter((l) => l.statut !== 'RECU');
        if (pending.length === 0) {
            this.lignes = [];
            this.cdr.markForCheck();
            return;
        }

        const ids = [...new Set(pending.map((l) => l.materiauId).filter(Boolean) as number[])];
        const requests = ids.length > 0 ? ids.map((id) => this.materiauService.detailMateriau(id)) : [of(null)];

        forkJoin(requests).subscribe({
            next: (materiaux) => {
                const map = new Map<number, MateriauResponse>();
                (materiaux as (MateriauResponse | null)[]).forEach((m) => m?.id && map.set(m.id, m));
                this.lignes = pending.map((l) => {
                    const dlc = l.materiauId ? (map.get(l.materiauId)?.dlcObligatoire ?? false) : false;
                    return this.makeLigneEntry(l, dlc);
                });
                this.cdr.markForCheck();
            },
            error: () => {
                this.lignes = pending.map((l) => this.makeLigneEntry(l, false));
                this.cdr.markForCheck();
            }
        });
    }

    private makeLigneEntry(ligne: LigneCommandeFournisseurResponse, dlcObligatoire: boolean): LigneReception {
        const restant = Math.max(0, (ligne.quantiteCommandee ?? 0) - (ligne.quantiteRecue ?? 0));
        return { ligne, dlcObligatoire, checked: false, lots: [this.makeDefaultLot(restant)] };
    }

    private makeDefaultLot(quantite: number): LotEntry {
        return { quantite, numeroLot: '', dlc: null };
    }

    // ── Interactions ────────────────────────────────────────────────────────

    backToSelect(): void {
        this.step = 'select';
        this.selectedCommande = null;
        this.lignes = [];
        this.cdr.markForCheck();
    }

    toggleLigne(entry: LigneReception): void {
        entry.checked = !entry.checked;
        this.cdr.markForCheck();
    }

    addLot(entry: LigneReception): void {
        entry.lots.push(this.makeDefaultLot(0));
        this.cdr.markForCheck();
    }

    removeLot(entry: LigneReception, index: number): void {
        entry.lots.splice(index, 1);
        this.cdr.markForCheck();
    }

    // ── Soumission ──────────────────────────────────────────────────────────

    submit(): void {
        if (!this.canSubmit || !this.selectedCommande?.id || this.submitting) return;

        const entrepotId = this.mobileEntrepotService.selected!.id!;
        this.submitting = true;
        this.cdr.markForCheck();

        const checked = this.checkedLignes;

        const stockCalls = checked.flatMap((entry) =>
            entry.lots.map((lot) => {
                const req: EntreeStockRequest = {
                    quantite: lot.quantite,
                    entrepotId,
                    numeroLot: lot.numeroLot || undefined,
                    expiresAt: lot.dlc ? lot.dlc.toISOString() : undefined
                };
                return this.materiauService.entreeMouvementStock(entry.ligne.materiauId!, req);
            })
        );

        forkJoin(stockCalls)
            .pipe(
                switchMap(() => {
                    const receptionReq: ReceptionRequest = {
                        entrepotId,
                        lignes: checked.map((entry) => ({
                            ligneId: entry.ligne.id!,
                            quantiteRecue: entry.lots.reduce((s, l) => s + (l.quantite ?? 0), 0)
                        }))
                    };
                    return this.receptionService.reception(this.selectedCommande!.id!, receptionReq);
                })
            )
            .subscribe({
                next: () => {
                    this.submitting = false;
                    this.messageService.add({
                        severity: 'success',
                        summary: this.transloco.translate('common.success'),
                        detail: this.transloco.translate('mobile.reception.succes')
                    });
                    setTimeout(() => this.router.navigate(['/mobile/approvisionnements']), 1500);
                },
                error: () => {
                    this.submitting = false;
                    this.messageService.add({
                        severity: 'error',
                        summary: this.transloco.translate('common.error'),
                        detail: this.transloco.translate('mobile.reception.erreur_envoi')
                    });
                    this.cdr.markForCheck();
                }
            });
    }

    // ── Utilitaires ─────────────────────────────────────────────────────────

    getStatutLabel(statut: string | undefined): string {
        return this.transloco.translate(`mobile.statuts.${statut ?? ''}`, {}, statut ?? '—');
    }

    getStatutSeverity(statut: string | undefined): 'secondary' | 'info' | 'warn' | 'success' | 'danger' {
        const map: Record<string, 'secondary' | 'info' | 'warn' | 'success' | 'danger'> = {
            BROUILLON: 'secondary',
            ENVOYE: 'info',
            PARTIELLEMENT_RECU: 'warn',
            RECU: 'success',
            ANNULE: 'danger'
        };
        return map[statut ?? ''] ?? 'secondary';
    }
}
