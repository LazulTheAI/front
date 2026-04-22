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
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { ToolbarModule } from 'primeng/toolbar';
import { AlerteService } from './alerte.service';

@Component({
    selector: 'app-alertes',
    standalone: true,
    imports: [CommonModule, TranslocoModule, ToolbarModule, AsyncPipe, FormsModule, TableModule, ButtonModule, TagModule, ToastModule, TooltipModule, SkeletonModule, ConfirmDialogModule, SelectModule],
    providers: [MessageService, ConfirmationService],
    templateUrl: './alertes.component.html'
})
export class AlertesComponent implements OnInit, OnDestroy {
    alertes$: Observable<AlerteResponse[]>;
    alertesFiltrees$: Observable<AlerteResponse[]>;
    nbUrgentes$: Observable<number>;
    nbPrevisionnelles$: Observable<number>;
    nbAutres$: Observable<number>;

    filtreType: string | null = null;

    typeOptions: { label: string; value: string | null }[] = [];

    acquittementEnCours = new Set<number>();

    constructor(
        public alerteService: AlerteService,
        private alerteController: AlerteControllerService,
        private messageService: MessageService,
        private confirmationService: ConfirmationService,
        private cdr: ChangeDetectorRef,
        private transloco: TranslocoService
    ) {
        this.alertes$ = this.alerteService.alertes$;

        this.nbUrgentes$ = this.alertes$.pipe(map((a) => a.filter((x) => x.typeAlerte === 'stock_bas' || x.typeAlerte === 'stock_bas_produit').length));

        this.nbPrevisionnelles$ = this.alertes$.pipe(map((a) => a.filter((x) => x.typeAlerte === 'stock_previsionnel').length));

        this.nbAutres$ = this.alertes$.pipe(map((a) => a.filter((x) => x.typeAlerte !== 'stock_bas' && x.typeAlerte !== 'stock_bas_produit' && x.typeAlerte !== 'stock_previsionnel').length));

        this.alertesFiltrees$ = this.buildFiltrees();
    }

    ngOnInit(): void {
        this.alerteService.startPolling();
        this.typeOptions = [
            { label: this.transloco.translate('alerte.filter_types'), value: null },
            { label: this.transloco.translate('alerte.type_low_stock_material'), value: 'stock_bas' },
            { label: this.transloco.translate('alerte.type_low_stock_product'), value: 'stock_bas_produit' },
            { label: this.transloco.translate('alerte.type_forecast'), value: 'stock_previsionnel' },
            { label: this.transloco.translate('alerte.type_cancellation'), value: 'annulation_commande' },
            { label: this.transloco.translate('alerte.type_out_of_stock'), value: 'stock_produit_insuffisant' }
        ];
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
            message: `${this.transloco.translate('alerte.acknowledge_message')}\n\n${alerte.message}`,
            header: this.transloco.translate('alerte.confirm_acknowledge'),
            icon: 'pi pi-check-circle',
            acceptLabel: this.transloco.translate('alerte.acknowledge'),
            rejectLabel: this.transloco.translate('common.cancel'),
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
                    summary: this.transloco.translate('alerte.acknowledged'),
                    detail: this.transloco.translate('alerte.acknowledged_success')
                });
                this.alerteService.refresh();
                this.cdr.markForCheck();
            },
            error: () => {
                this.acquittementEnCours.delete(alerte.id!);
                this.messageService.add({
                    severity: 'error',
                    summary: this.transloco.translate('common.error'),
                    detail: this.transloco.translate('alerte.acknowledge_error')
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
            stock_bas: this.transloco.translate('alerte.label_low_stock'),
            stock_bas_produit: this.transloco.translate('alerte.label_product_stock'),
            stock_previsionnel: this.transloco.translate('alerte.label_forecast'),
            annulation_commande: this.transloco.translate('alerte.label_cancellation'),
            stock_produit_insuffisant: this.transloco.translate('alerte.label_out_of_stock')
        };
        return labels[type ?? ''] ?? type ?? '—';
    }

    getTypeSeverity(type: string | undefined): 'danger' | 'warn' | 'info' | 'secondary' {
        switch (type) {
            case 'stock_bas':
            case 'stock_bas_produit':
                return 'danger';
            case 'stock_previsionnel':
            case 'annulation_commande':
                return 'warn';
            case 'stock_produit_insuffisant':
                return 'info';
            default:
                return 'secondary';
        }
    }

    getTypeIcon(type: string | undefined): string {
        switch (type) {
            case 'stock_bas':
            case 'stock_bas_produit':
                return 'pi pi-exclamation-circle';
            case 'stock_previsionnel':
                return 'pi pi-calendar-times';
            case 'annulation_commande':
                return 'pi pi-times-circle';
            case 'stock_produit_insuffisant':
                return 'pi pi-box';
            default:
                return 'pi pi-bell';
        }
    }
}
