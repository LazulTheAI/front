import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { forkJoin, interval, Subject, takeUntil } from 'rxjs';

import {
    AlerteControllerService,
    BonCommandeControllerService,
    MateriauControllerService,
    MateriauResponse,
    ProductionControllerService
} from '@/app/modules/openapi';

import { CardModule } from 'primeng/card';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { SkeletonModule } from 'primeng/skeleton';
import { TagModule } from 'primeng/tag';

interface KpiCard {
    label: string;
    value: number;
    icon: string;
    severity: 'success' | 'warn' | 'danger' | 'info';
    route: string;
}

@Component({
    selector: 'app-mobile-dashboard',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, CardModule, ProgressSpinnerModule, SkeletonModule, TagModule],
    templateUrl: './mobile-dashboard.component.html',
    styleUrl: './mobile-dashboard.component.scss'
})
export class MobileDashboardComponent implements OnInit, OnDestroy {
    loading = true;
    kpis: KpiCard[] = [];

    private destroy$ = new Subject<void>();

    constructor(
        private materiauService: MateriauControllerService,
        private productionService: ProductionControllerService,
        private bonCommandeService: BonCommandeControllerService,
        private alerteService: AlerteControllerService,
        private router: Router,
        private cdr: ChangeDetectorRef
    ) {}

    ngOnInit(): void {
        this.loadKpis();
        interval(60_000)
            .pipe(takeUntil(this.destroy$))
            .subscribe(() => this.loadKpis());
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    loadKpis(): void {
        forkJoin({
            materiaux: this.materiauService.listerMateriau(false, 0, 200),
            runs: this.productionService.listerProductions(0, 1, undefined, undefined, 'EN_COURS'),
            commandes: this.bonCommandeService.listerBonCommande(0, 1, undefined, undefined, 'ENVOYE'),
            alertes: this.alerteService.count()
        }).subscribe({
            next: ({ materiaux, runs, commandes, alertes }) => {
                const items: MateriauResponse[] = (materiaux as any).content ?? [];
                const today = new Date();
                const in7Days = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

                const ruptures = items.filter((m) => (m.stockTotal ?? 0) <= 0).length;
                const dlcAlerts = items.filter((m) => {
                    if (!m.dlcProchaineExpiration) return false;
                    const dlc = new Date(m.dlcProchaineExpiration);
                    return dlc <= in7Days && dlc >= today;
                }).length;

                this.kpis = [
                    {
                        label: 'Matières en rupture',
                        value: ruptures,
                        icon: 'pi-exclamation-triangle',
                        severity: ruptures > 0 ? 'danger' : 'success',
                        route: '/mobile/stock'
                    },
                    {
                        label: 'Runs en cours',
                        value: (runs as any).totalElements ?? 0,
                        icon: 'pi-cog',
                        severity: 'info',
                        route: '/mobile/fabrication'
                    },
                    {
                        label: 'Commandes en attente',
                        value: (commandes as any).totalElements ?? 0,
                        icon: 'pi-shopping-cart',
                        severity: (commandes as any).totalElements > 0 ? 'warn' : 'success',
                        route: '/mobile/commandes'
                    },
                    {
                        label: 'Alertes DLC < 7 jours',
                        value: dlcAlerts,
                        icon: 'pi-calendar-times',
                        severity: dlcAlerts > 0 ? 'warn' : 'success',
                        route: '/mobile/stock'
                    }
                ];
                this.loading = false;
                this.cdr.markForCheck();
            },
            error: () => {
                this.loading = false;
                this.cdr.markForCheck();
            }
        });
    }

    navigate(route: string): void {
        this.router.navigateByUrl(route);
    }
}
