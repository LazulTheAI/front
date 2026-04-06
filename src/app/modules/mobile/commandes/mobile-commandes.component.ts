import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

import { BonCommandeControllerService, BonCommandeResponse } from '@/app/modules/openapi';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { SkeletonModule } from 'primeng/skeleton';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';

type StatutSeverity = 'secondary' | 'info' | 'warn' | 'success' | 'danger';

@Component({
    selector: 'app-mobile-commandes',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, ButtonModule, TagModule, ProgressSpinnerModule, SkeletonModule, ToastModule],
    providers: [MessageService],
    templateUrl: './mobile-commandes.component.html',
    styleUrl: './mobile-commandes.component.scss'
})
export class MobileCommandesComponent implements OnInit {
    commandes: BonCommandeResponse[] = [];
    loading = false;
    page = 0;
    size = 20;
    totalRecords = 0;

    constructor(
        private bonCommandeService: BonCommandeControllerService,
        private messageService: MessageService,
        private router: Router,
        private cdr: ChangeDetectorRef
    ) {}

    ngOnInit(): void {
        this.loadCommandes();
    }

    loadCommandes(): void {
        this.loading = true;
        // Load both ENVOYE and PARTIELLEMENT_RECU statuses (two calls merged)
        this.bonCommandeService.listerBonCommande(0, 50, 'dateCommande', 'desc').subscribe({
            next: (data: any) => {
                const all: BonCommandeResponse[] = data.content ?? [];
                // Exclude RECUE and ANNULE
                this.commandes = all.filter(
                    (c) => c.statut !== 'RECU' && c.statut !== 'ANNULE'
                );
                this.totalRecords = this.commandes.length;
                this.loading = false;
                this.cdr.markForCheck();
            },
            error: () => {
                this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de charger les commandes' });
                this.loading = false;
                this.cdr.markForCheck();
            }
        });
    }

    goReception(commande: BonCommandeResponse): void {
        this.router.navigate(['/mobile/reception'], { queryParams: { commandeId: commande.id } });
    }

    getStatutLabel(statut: string | undefined): string {
        switch (statut) {
            case 'BROUILLON': return 'BROUILLON';
            case 'ENVOYE': return 'ENVOYÉE';
            case 'PARTIELLEMENT_RECU': return 'PARTIELLE';
            case 'EN_COURS': return 'EN COURS';
            default: return statut ?? '—';
        }
    }

    getStatutSeverity(statut: string | undefined): StatutSeverity {
        switch (statut) {
            case 'BROUILLON': return 'secondary';
            case 'ENVOYE': return 'info';
            case 'PARTIELLEMENT_RECU': return 'warn';
            case 'EN_COURS': return 'info';
            default: return 'secondary';
        }
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
