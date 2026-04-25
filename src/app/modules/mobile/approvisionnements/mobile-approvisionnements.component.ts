import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

import { BonCommandeControllerService, BonCommandeResponse } from '@/app/modules/openapi';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { SkeletonModule } from 'primeng/skeleton';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';

type StatutSeverity = 'secondary' | 'info' | 'warn' | 'success' | 'danger';

const STATUTS_EXCLUS = ['RECU', 'ANNULE'];

@Component({
    selector: 'app-mobile-approvisionnements',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, ButtonModule, TagModule, ProgressSpinnerModule, SkeletonModule, ToastModule, TranslocoModule],
    providers: [MessageService],
    templateUrl: './mobile-approvisionnements.component.html',
    styleUrl: './mobile-approvisionnements.component.scss'
})
export class MobileApprovisionnementsComponent implements OnInit {
    commandes: BonCommandeResponse[] = [];
    loading = false;

    constructor(
        private bonCommandeService: BonCommandeControllerService,
        private messageService: MessageService,
        private transloco: TranslocoService,
        private router: Router,
        private cdr: ChangeDetectorRef
    ) {}

    ngOnInit(): void {
        this.loadCommandes();
    }

    loadCommandes(): void {
        this.loading = true;
        this.bonCommandeService.listerBonCommande(0, 50, 'dateCommande', 'desc').subscribe({
            next: (data: any) => {
                const all: BonCommandeResponse[] = data.content ?? data ?? [];
                this.commandes = all.filter((c) => !STATUTS_EXCLUS.includes(c.statut ?? ''));
                this.loading = false;
                this.cdr.markForCheck();
            },
            error: () => {
                this.messageService.add({
                    severity: 'error',
                    summary: this.transloco.translate('common.error'),
                    detail: this.transloco.translate('mobile.approvisionnements.erreur_chargement')
                });
                this.loading = false;
                this.cdr.markForCheck();
            }
        });
    }

    goReception(commande: BonCommandeResponse): void {
        this.router.navigate(['/mobile/reception'], { queryParams: { commandeId: commande.id } });
    }

    getStatutLabel(statut: string | undefined): string {
        return this.transloco.translate(`mobile.statuts.${statut ?? ''}`, {}, statut ?? '—');
    }

    getStatutSeverity(statut: string | undefined): StatutSeverity {
        const map: Record<string, StatutSeverity> = {
            BROUILLON: 'secondary',
            ENVOYE: 'info',
            PARTIELLEMENT_RECU: 'warn',
            EN_COURS: 'info',
            RECU: 'success',
            ANNULE: 'danger'
        };
        return map[statut ?? ''] ?? 'secondary';
    }

    canReceive(commande: BonCommandeResponse): boolean {
        return commande.statut === 'ENVOYE' || commande.statut === 'PARTIELLEMENT_RECU';
    }

    getLignesCount(commande: BonCommandeResponse): number {
        return commande.lignes?.length ?? 0;
    }

    getTotalQte(commande: BonCommandeResponse): number {
        return commande.lignes?.reduce((sum, l) => sum + (l.quantiteCommandee ?? 0), 0) ?? 0;
    }
}
