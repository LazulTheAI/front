import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { Button } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { TableModule } from 'primeng/table';
import { Tag } from 'primeng/tag';

import { CommandeB2BControllerService, CommandeB2BResponse } from '@/app/modules/openapi';
import { TranslocoModule } from '@jsverse/transloco';
import { MessageService } from 'primeng/api';
import { Toast } from 'primeng/toast';
import { environment } from '../../../../environments/environment';

@Component({
    selector: 'app-commande-b2b-detail-dialog',
    standalone: true,
    imports: [CommonModule, TranslocoModule, FormsModule, DialogModule, Button, Tag, TableModule, Toast],
    providers: [MessageService],
    templateUrl: './commande-b2b-detail-dialog.component.html'
})
export class CommandeB2BDetailDialogComponent implements OnChanges {
    @Input() visible = false;
    @Output() visibleChange = new EventEmitter<boolean>();
    @Input() commande: CommandeB2BResponse | null = null;
    @Output() onStatutChange = new EventEmitter<void>();

    saving = false;

    get dialogHeader(): string {
        return this.commande ? `Commande ${this.commande.numero} — ${this.commande.revendeurNom}` : 'Détail commande';
    }

    constructor(
        private commandeService: CommandeB2BControllerService,
        private http: HttpClient,
        private messageService: MessageService
    ) {}

    ngOnChanges(changes: SimpleChanges): void {}

    changerStatut(statut: string): void {
        if (!this.commande?.id) return;
        this.saving = true;
        this.commandeService.changerStatutCommandeB2B(this.commande.id, { statut }).subscribe({
            next: (updated) => {
                this.commande = updated;
                this.saving = false;
                this.onStatutChange.emit();
                this.messageService.add({
                    severity: 'success',
                    summary: 'Statut mis à jour',
                    detail: `Commande → ${statut}`
                });
            },
            error: (err: any) => {
                this.saving = false;
                this.messageService.add({
                    severity: 'error',
                    summary: 'Erreur',
                    detail: err?.error?.message ?? 'Transition invalide'
                });
            }
        });
    }
    downloadBonLivraison(): void {
        this.downloadPdf(`${environment.baseUrl}/api/pdf/commandes-b2b/${this.commande!.id}/bon-livraison`, `bon-livraison-${this.commande!.numero}.pdf`);
    }

    downloadFacture(): void {
        this.downloadPdf(`${environment.baseUrl}/api/pdf/commandes-b2b/${this.commande!.id}/facture`, `facture-${this.commande!.numero}.pdf`);
    }

    private downloadPdf(url: string, filename: string): void {
        const lang = navigator.language?.split('-')[0] ?? 'fr';
        this.http.get(`${url}?lang=${lang}`, { responseType: 'blob' }).subscribe({
            next: (blob) => {
                const blobUrl = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = blobUrl;
                a.download = filename;
                a.click();
                URL.revokeObjectURL(blobUrl);
            },
            error: (e) => {
                console.error(e);
                this.messageService.add({
                    severity: 'error',
                    summary: 'Erreur',
                    detail: 'Impossible de générer le PDF'
                });
            }
        });
    }

    getStatutSeverity(statut: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
        const map: Record<string, any> = {
            BROUILLON: 'secondary',
            CONFIRMEE: 'info',
            EXPEDIEE: 'warn',
            LIVREE: 'success',
            ANNULEE: 'danger'
        };
        return map[statut] ?? 'secondary';
    }

    getStatutLabel(statut: string): string {
        const map: Record<string, string> = {
            BROUILLON: 'Brouillon',
            CONFIRMEE: 'Confirmée',
            EXPEDIEE: 'Expédiée',
            LIVREE: 'Livrée',
            ANNULEE: 'Annulée'
        };
        return map[statut] ?? statut;
    }

    getNextStatut(statut: string): string | null {
        return { BROUILLON: 'CONFIRMEE', CONFIRMEE: 'EXPEDIEE', EXPEDIEE: 'LIVREE' }[statut] ?? null;
    }

    getNextStatutLabel(statut: string): string {
        return { BROUILLON: 'Confirmer', CONFIRMEE: 'Marquer expédiée', EXPEDIEE: 'Marquer livrée' }[statut] ?? '';
    }

    canAnnuler(statut: string): boolean {
        return ['BROUILLON', 'CONFIRMEE', 'EXPEDIEE'].includes(statut);
    }

    onHide(): void {
        this.visibleChange.emit(false);
    }
}
