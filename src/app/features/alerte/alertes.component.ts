// alertes.component.ts
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

import { AlerteControllerService, AlerteStockResponse } from '@/app/modules/openapi';
import { AlerteService } from './alerte.service';

@Component({
    selector: 'app-alertes',
    standalone: true,
    imports: [CommonModule, AsyncPipe, FormsModule, TableModule, ButtonModule, TagModule, ToastModule, TooltipModule, SkeletonModule, ConfirmDialogModule],
    providers: [MessageService, ConfirmationService],
    templateUrl: './alertes.component.html'
})
export class AlertesComponent implements OnInit, OnDestroy {
    alertes$: Observable<AlerteStockResponse[]>;
    nbCritiques$: Observable<number>;
    stockTotal$: Observable<number>;

    acquittementEnCours = new Set<number>();

    constructor(
        public alerteService: AlerteService,
        private reportService: AlerteControllerService,
        private messageService: MessageService,
        private confirmationService: ConfirmationService,
        private cdr: ChangeDetectorRef
    ) {
        this.alertes$ = this.alerteService.alertes$;
        this.nbCritiques$ = this.alertes$.pipe(map((a) => a.filter((x) => Number(x.manqueMax ?? 0) > 5).length));
        this.stockTotal$ = this.alertes$.pipe(map((a) => a.reduce((s, x) => s + Number(x.manqueMax ?? 0), 0)));
    }

    ngOnInit(): void {
        this.alerteService.startPolling();
    }

    ngOnDestroy(): void {
        // le polling continue pour le widget — on ne l'arrête pas ici
    }

    confirmerAcquittement(alerte: AlerteStockResponse): void {
        this.confirmationService.confirm({
            message: `Acquitter l'alerte pour "${alerte.nom}" ? Le stock sera considéré comme traité jusqu'à la prochaine vérification.`,
            header: "Confirmer l'acquittement",
            icon: 'pi pi-check-circle',
            acceptLabel: 'Acquitter',
            rejectLabel: 'Annuler',
            accept: () => this.acquitter(alerte)
        });
    }

    private acquitter(alerte: AlerteStockResponse): void {
        if (!alerte.materiauId) return;
        this.acquittementEnCours.add(alerte.materiauId);
        this.cdr.markForCheck();

        this.reportService.acquitter(alerte.materiauId).subscribe({
            next: () => {
                this.acquittementEnCours.delete(alerte.materiauId!);
                this.messageService.add({
                    severity: 'success',
                    summary: 'Acquittée',
                    detail: `Alerte "${alerte.nom}" acquittée`
                });
                this.alerteService.refresh();
                this.cdr.markForCheck();
            },
            error: () => {
                this.acquittementEnCours.delete(alerte.materiauId!);
                this.messageService.add({
                    severity: 'error',
                    summary: 'Erreur',
                    detail: "Impossible d'acquitter cette alerte"
                });
                this.cdr.markForCheck();
            }
        });
    }

    isAcquittementEnCours(materiauId: number | undefined): boolean {
        return materiauId != null && this.acquittementEnCours.has(materiauId);
    }
}
