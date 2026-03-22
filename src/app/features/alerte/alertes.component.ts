import { AsyncPipe, CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { map, Observable } from 'rxjs';

import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
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
    imports: [CommonModule, AsyncPipe, FormsModule, TableModule, ButtonModule, TagModule, ToastModule, TooltipModule, SkeletonModule, ConfirmDialogModule],
    providers: [MessageService, ConfirmationService],
    templateUrl: './alertes.component.html'
})
export class AlertesComponent implements OnInit, OnDestroy {
    alertes$: Observable<AlerteResponse[]>;
    nbCritiques$: Observable<number>;
    stockTotal$: Observable<number>;

    acquittementEnCours = new Set<number>();

    constructor(
        public alerteService: AlerteService,
        private alerteController: AlerteControllerService,
        private messageService: MessageService,
        private confirmationService: ConfirmationService,
        private cdr: ChangeDetectorRef
    ) {
        this.alertes$ = this.alerteService.alertes$;
        this.nbCritiques$ = this.alertes$.pipe(map((a) => a.filter((x) => x.typeAlerte === 'stock_bas').length));
        this.stockTotal$ = this.alertes$.pipe(
            map((a) => a.length) // total alertes actives
        );
    }

    ngOnInit(): void {
        this.alerteService.startPolling();
    }

    ngOnDestroy(): void {
        // polling maintenu pour le widget
    }

    confirmerAcquittement(alerte: AlerteResponse): void {
        this.confirmationService.confirm({
            message: `Acquitter cette alerte ?\n${alerte.message}`,
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
}
