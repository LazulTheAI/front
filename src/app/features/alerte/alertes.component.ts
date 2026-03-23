import { AsyncPipe, CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { map, Observable } from 'rxjs';

import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { SelectModule } from 'primeng/select';
import { SkeletonModule } from 'primeng/skeleton';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';

import { AlerteControllerService, AlerteResponse } from '@/app/modules/openapi';
import { AlerteService } from './alerte.service';

@Component({
    selector: 'app-alertes',
    standalone: true,
    imports: [CommonModule, AsyncPipe, FormsModule, TableModule, ButtonModule, TagModule, ToastModule, TooltipModule, SkeletonModule, ConfirmDialogModule, SelectModule],
    providers: [MessageService, ConfirmationService],
    templateUrl: './alertes.component.html'
})
export class AlertesComponent implements OnInit, OnDestroy {
    alertes$: Observable<AlerteResponse[]>;
    alertesFiltrees$: Observable<AlerteResponse[]>;
    nbStockBas$: Observable<number>;
    nbAutres$: Observable<number>;

    filtreType: string | null = null;

    typeOptions = [
        { label: 'Tous les types', value: null },
        { label: 'Stock bas matériau', value: 'stock_bas' },
        { label: 'Stock bas produit', value: 'stock_bas_produit' },
        { label: 'Annulation commande', value: 'annulation_commande' },
        { label: 'Rupture produit', value: 'stock_produit_insuffisant' }
    ];

    acquittementEnCours = new Set<number>();

    constructor(
        public alerteService: AlerteService,
        private alerteController: AlerteControllerService,
        private messageService: MessageService,
        private confirmationService: ConfirmationService,
        private cdr: ChangeDetectorRef
    ) {
        this.alertes$ = this.alerteService.alertes$;

        this.nbStockBas$ = this.alertes$.pipe(map((a) => a.filter((x) => x.typeAlerte === 'stock_bas' || x.typeAlerte === 'stock_bas_produit').length));

        this.nbAutres$ = this.alertes$.pipe(map((a) => a.filter((x) => x.typeAlerte !== 'stock_bas' && x.typeAlerte !== 'stock_bas_produit').length));

        this.alertesFiltrees$ = this.buildFiltrees();
    }

    ngOnInit(): void {
        this.alerteService.startPolling();
    }

    ngOnDestroy(): void {}

    onFiltreTypeChange(): void {
        this.alertesFiltrees$ = this.buildFiltrees();
        this.cdr.markForCheck();
    }

    private buildFiltrees(): Observable<AlerteResponse[]> {
        return this.alertes$.pipe(map((a) => (this.filtreType ? a.filter((x) => x.typeAlerte === this.filtreType) : a)));
    }

    confirmerAcquittement(alerte: AlerteResponse): void {
        this.confirmationService.confirm({
            message: `Acquitter cette alerte ?\n\n${alerte.message}`,
            header: "Confirmer l'acquittement",
            icon: 'pi pi-check-circle',
            acceptLabel: 'Acquitter',
            rejectLabel: 'Annuler',
            accept: () => this.acquitter(alerte)
        });
    }

    private acquitter(alerte: AlerteResponse): void {
        if (!alerte.id) return;
        this.acquittementEnCours.add(alerte.id);
        this.cdr.markForCheck();

        this.alerteController.acquitter(alerte.id).subscribe({
            next: () => {
                this.acquittementEnCours.delete(alerte.id!);
                this.messageService.add({
                    severity: 'success',
                    summary: 'Acquittée',
                    detail: 'Alerte acquittée avec succès'
                });
                this.alerteService.refresh();
                this.cdr.markForCheck();
            },
            error: () => {
                this.acquittementEnCours.delete(alerte.id!);
                this.messageService.add({
                    severity: 'error',
                    summary: 'Erreur',
                    detail: "Impossible d'acquitter cette alerte"
                });
                this.cdr.markForCheck();
            }
        });
    }

    isAcquittementEnCours(id: number | undefined): boolean {
        return id != null && this.acquittementEnCours.has(id);
    }

    getTypeLabel(type: string | undefined): string {
        const labels: Record<string, string> = {
            stock_bas: 'Stock bas',
            stock_bas_produit: 'Stock produit',
            annulation_commande: 'Annulation',
            stock_produit_insuffisant: 'Rupture produit'
        };
        return labels[type ?? ''] ?? type ?? '—';
    }

    getTypeSeverity(type: string | undefined): 'danger' | 'warn' | 'info' | 'secondary' {
        switch (type) {
            case 'stock_bas':
            case 'stock_bas_produit':
                return 'danger';
            case 'annulation_commande':
                return 'warn';
            case 'stock_produit_insuffisant':
                return 'info';
            default:
                return 'secondary';
        }
    }
}
