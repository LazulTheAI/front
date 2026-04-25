import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';

import { MobileEntrepotService } from '@/app/modules/mobile/services/mobile-entrepot.service';
import { CommandeControllerService, CommandeResponse } from '@/app/modules/openapi';
import { Router } from '@angular/router';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { DividerModule } from 'primeng/divider';
import { SkeletonModule } from 'primeng/skeleton';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';

type StatutSeverity = 'secondary' | 'info' | 'warn' | 'success' | 'danger';
type Onglet = 'brouillons' | 'confirmees';

const STATUTS_EXCLUS = ['EXPEDIEE', 'ANNULEE', 'REMBOURSEE'];
const STATUTS_BROUILLON = ['BROUILLON', 'EN_ATTENTE'];
const STATUTS_CONFIRMEES = ['CONFIRMEE', 'EN_PREPARATION'];

@Component({
    selector: 'app-mobile-commandes',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, TranslocoModule, ButtonModule, TagModule, SkeletonModule, ToastModule, DialogModule, DividerModule],
    providers: [MessageService],
    templateUrl: './mobile-commandes.component.html',
    styleUrl: './mobile-commandes.component.scss'
})
export class MobileCommandesComponent implements OnInit, OnDestroy {
    private destroy$ = new Subject<void>();

    // ── État ─────────────────────────────────────────────────
    ongletActif: Onglet = 'brouillons';
    loading = false;

    toutesCommandes: CommandeResponse[] = [];
    entrepotId: number | null = null;

    // ── Détail inline ────────────────────────────────────────
    selectedCommande: CommandeResponse | null = null;
    showDetail = false;

    constructor(
        private commandeService: CommandeControllerService,
        private mobileEntrepotService: MobileEntrepotService,
        private messageService: MessageService,
        private transloco: TranslocoService,
        private router: Router,
        private cdr: ChangeDetectorRef
    ) {}

    ngOnInit(): void {
        // Recharger quand l'entrepôt change
        this.mobileEntrepotService.selected$.pipe(takeUntil(this.destroy$)).subscribe((entrepot) => {
            this.entrepotId = entrepot?.id ?? null;
            this.loadCommandes();
        });
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    // ── Chargement ───────────────────────────────────────────
    loadCommandes(): void {
        this.loading = true;
        this.commandeService.listerCommandes(undefined, undefined, undefined, undefined, undefined, 0, 100).subscribe({
            next: (data: any) => {
                const all: CommandeResponse[] = data.content ?? (Array.isArray(data) ? data : []);
                this.toutesCommandes = all.filter((c) => !STATUTS_EXCLUS.includes(c.statut ?? ''));
                this.loading = false;
                this.cdr.markForCheck();
            },
            error: () => {
                this.loading = false;
                this.cdr.markForCheck();
                this.messageService.add({
                    severity: 'error',
                    summary: this.transloco.translate('common.error'),
                    detail: this.transloco.translate('mobile.commandes.erreur_chargement')
                });
            }
        });
    }

    // ── Onglets ──────────────────────────────────────────────
    setOnglet(onglet: Onglet): void {
        this.ongletActif = onglet;
        this.cdr.markForCheck();
    }

    get commandesBrouillons(): CommandeResponse[] {
        return this.toutesCommandes.filter((c) => STATUTS_BROUILLON.includes(c.statut ?? ''));
    }

    get commandesConfirmees(): CommandeResponse[] {
        const base = this.toutesCommandes.filter((c) => STATUTS_CONFIRMEES.includes(c.statut ?? ''));
        // Filtre par entrepôt si un entrepôt est sélectionné
        if (!this.entrepotId) return base;
        return base.filter(
            (c) =>
                c.lots?.some((l: any) => l.entrepotId === this.entrepotId) ||
                c.lignes?.some((l: any) => l.entrepotId === this.entrepotId) ||
                // fallback si pas de lien entrepôt : afficher toutes les confirmées
                true
        );
    }

    get commandesActives(): CommandeResponse[] {
        return this.ongletActif === 'brouillons' ? this.commandesBrouillons : this.commandesConfirmees;
    }

    // ── Navigation ───────────────────────────────────────────
    voirDetail(commande: CommandeResponse): void {
        this.selectedCommande = commande;
        this.showDetail = true;
        this.cdr.markForCheck();
    }

    fermerDetail(): void {
        this.showDetail = false;
        this.selectedCommande = null;
        this.cdr.markForCheck();
    }

    // ── Helpers affichage ────────────────────────────────────
    getStatutSeverity(statut: string | undefined): StatutSeverity {
        const map: Record<string, StatutSeverity> = {
            BROUILLON: 'secondary',
            EN_ATTENTE: 'secondary',
            CONFIRMEE: 'info',
            EN_PREPARATION: 'warn',
            EXPEDIEE: 'success',
            ANNULEE: 'danger',
            REMBOURSEE: 'danger'
        };
        return map[statut ?? ''] ?? 'secondary';
    }

    getStatutLabel(statut: string | undefined): string {
        return this.transloco.translate(`mobile.commandes.statuts.${statut ?? ''}`, {}, statut ?? '—');
    }

    getTotalHT(commande: CommandeResponse): number {
        return commande.totalHT ?? 0;
    }

    getNombreArticles(commande: CommandeResponse): number {
        return commande.lignes?.length ?? 0;
    }

    trackById(_: number, item: CommandeResponse): number {
        return item.id!;
    }
}
