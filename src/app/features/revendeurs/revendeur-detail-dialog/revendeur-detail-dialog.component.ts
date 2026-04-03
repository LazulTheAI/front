import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { TranslocoModule } from '@jsverse/transloco';

import { CommandeB2BControllerService, CommandeB2BResponse, RevendeurResponse } from '@/app/modules/openapi';
import { MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { Divider } from 'primeng/divider';
import { TableModule } from 'primeng/table';
import { Tag } from 'primeng/tag';
import { Toast } from 'primeng/toast';
import { Tooltip } from 'primeng/tooltip';
import { environment } from '../../../../environments/environment';

@Component({
    selector: 'app-revendeur-detail-dialog',
    standalone: true,
    imports: [CommonModule, DialogModule, TranslocoModule, Button, Tag, Divider, TableModule, Tooltip, Toast, TranslocoModule],
    providers: [MessageService],
    templateUrl: './revendeur-detail-dialog.component.html'
})
export class RevendeurDetailDialogComponent {
    @Input() visible = false;
    @Output() visibleChange = new EventEmitter<boolean>();
    @Input() revendeur: RevendeurResponse | null = null;
    @Output() onEdit = new EventEmitter<Event>();

    commandes: CommandeB2BResponse[] = [];
    loadingCommandes = false;

    get dialogHeader(): string {
        return this.revendeur?.nom ?? 'Revendeur';
    }

    constructor(
        private commandeService: CommandeB2BControllerService,
        private http: HttpClient,
        private messageService: MessageService
    ) {}

    ngOnChanges(): void {
        if (this.visible && this.revendeur?.id) {
            this.loadCommandes();
        }
    }

    loadCommandes(): void {
        if (!this.revendeur?.id) return;
        this.loadingCommandes = true;
        this.commandeService.listerCommandeB2B(this.revendeur.id, undefined, 0, 10).subscribe({
            next: (data: any) => {
                this.commandes = data.content ?? [];
                this.loadingCommandes = false;
            },
            error: () => {
                this.loadingCommandes = false;
            }
        });
    }

    downloadBonLivraison(c: CommandeB2BResponse): void {
        const lang = navigator.language?.split('-')[0] ?? 'fr';
        this.http
            .get(`${environment.baseUrl}/api/pdf/commandes-b2b/${c.id}/bon-livraison?lang=${lang}`, {
                responseType: 'blob'
            })
            .subscribe({
                next: (blob) => {
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `bon-livraison-${c.numero}.pdf`;
                    a.click();
                    URL.revokeObjectURL(url);
                },
                error: () => {
                    this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de générer le PDF' });
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

    onHide(): void {
        this.visibleChange.emit(false);
    }
}
