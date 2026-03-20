import { AlerteStockResponse } from '@/app/modules/openapi';
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { BadgeModule } from 'primeng/badge';
import { ButtonModule } from 'primeng/button';
import { Subscription } from 'rxjs';
import { AlerteService } from './alerte.service';

@Component({
    selector: 'app-alerte-widget',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, RouterModule, BadgeModule, ButtonModule],
    template: `
        @if (alertes.length > 0) {
            <a
                routerLink="/alertes"
                class="flex align-items-center gap-2 px-3 py-2 border-round-lg
               bg-red-50 border-1 border-red-200 no-underline
               cursor-pointer hover:bg-red-100 transition-colors transition-duration-150"
            >
                <i class="pi pi-bell text-red-500"></i>
                <span class="text-red-700 font-semibold text-sm"> {{ alertes.length }} alerte{{ alertes.length > 1 ? 's' : '' }} stock </span>
                <p-badge [value]="alertes.length.toString()" severity="danger" styleClass="ml-1" />
            </a>
        }
    `
})
export class AlerteWidgetComponent implements OnInit, OnDestroy {
    alertes: AlerteStockResponse[] = [];
    private sub?: Subscription;

    constructor(
        public alerteService: AlerteService,
        private cdr: ChangeDetectorRef
    ) {}

    ngOnInit(): void {
        this.alerteService.startPolling();
        this.sub = this.alerteService.alertes$.subscribe((d) => {
            this.alertes = d;
            this.cdr.markForCheck();
        });
    }

    ngOnDestroy(): void {
        this.sub?.unsubscribe();
    }
}
