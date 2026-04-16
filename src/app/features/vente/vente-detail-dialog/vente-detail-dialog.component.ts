import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, EventEmitter, Inject, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { Button } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { TableModule } from 'primeng/table';
import { Tag } from 'primeng/tag';

import { APP_CURRENCY } from '@/app/core/currency.config';
import { CommandeControllerService, CommandeResponse } from '@/app/modules/openapi';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { MessageService } from 'primeng/api';
import { Toast } from 'primeng/toast';
import { environment } from '../../../../environments/environment';

@Component({
    selector: 'app-commande-detail-dialog',
    standalone: true,
    imports: [CommonModule, TranslocoModule, FormsModule, DialogModule, Button, Tag, TableModule, Toast],
    providers: [MessageService],
    templateUrl: './vente-detail-dialog.component.html'
})
export class CommandeDetailDialogComponent implements OnChanges {
    @Input() visible = false;
    @Output() visibleChange = new EventEmitter<boolean>();
    @Input() commande: CommandeResponse | null = null;
    @Output() onStatutChange = new EventEmitter<void>();

    saving = false;
    protected readonly appCurrency = APP_CURRENCY;

    get dialogHeader(): string {
        if (!this.commande) return this.transloco.translate('commande_detail.header_empty');
        return this.transloco.translate('commande_detail.header', {
            numero: this.commande.numero,
            revendeur: this.commande.revendeurNom
        });
    }

    constructor(
        @Inject(CommandeControllerService)
        private commandeService: CommandeControllerService,
        private http: HttpClient,
        private messageService: MessageService,
        private transloco: TranslocoService
    ) {}

    ngOnChanges(_changes: SimpleChanges): void {}

    changerStatut(statut: string): void {
        if (!this.commande?.id) return;
        this.saving = true;
        this.commandeService.changerStatutCommande(this.commande.id, { statut }).subscribe({
            next: (updated) => {
                this.commande = updated;
                this.saving = false;
                this.onStatutChange.emit();
                this.messageService.add({
                    severity: 'success',
                    summary: this.transloco.translate('commande_detail.statut_mis_a_jour'),
                    detail: `${this.commande!.numero} → ${statut}`
                });
            },
            error: (err: any) => {
                this.saving = false;
                this.messageService.add({
                    severity: 'error',
                    summary: this.transloco.translate('common.error'),
                    detail: err?.error?.message ?? this.transloco.translate('commande_detail.transition_invalide')
                });
            }
        });
    }

    downloadBonLivraison(): void {
        this.downloadPdf(`${environment.baseUrl}/api/pdf/vente/${this.commande!.id}/bon-livraison`, `bon-livraison-${this.commande!.numero}.pdf`);
    }

    downloadFacture(): void {
        this.downloadPdf(`${environment.baseUrl}/api/pdf/vente/${this.commande!.id}/facture`, `facture-${this.commande!.numero}.pdf`);
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
                    summary: this.transloco.translate('common.error'),
                    detail: this.transloco.translate('commande_detail.erreur_pdf')
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
        const key = `commandes.statut_${statut.toLowerCase()}`;
        return this.transloco.translate(key) || statut;
    }

    getNextStatut(statut: string): string | null {
        return { BROUILLON: 'CONFIRMEE', CONFIRMEE: 'EXPEDIEE', EXPEDIEE: 'LIVREE' }[statut] ?? null;
    }

    getNextStatutLabel(statut: string): string {
        const map: Record<string, string> = {
            BROUILLON: 'commande_detail.action_confirmer',
            CONFIRMEE: 'commande_detail.action_expediee',
            EXPEDIEE: 'commande_detail.action_livree'
        };
        return map[statut] ? this.transloco.translate(map[statut]) : '';
    }

    canAnnuler(statut: string): boolean {
        return ['BROUILLON', 'CONFIRMEE', 'EXPEDIEE'].includes(statut);
    }

    onHide(): void {
        this.visibleChange.emit(false);
    }
}
