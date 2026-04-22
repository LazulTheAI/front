import { AlerteWidgetComponent } from '@/app/features/alerte/alerte-widget.component';
import { AlerteService } from '@/app/features/alerte/alerte.service';
import { EntrepotResponse } from '@/app/modules/openapi';
import { MobileEntrepotService } from '@/app/modules/mobile/services/mobile-entrepot.service';
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { SelectModule } from 'primeng/select';
import { FormsModule } from '@angular/forms';

@Component({
    selector: 'app-mobile-shell',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, FormsModule, RouterModule, AlerteWidgetComponent, SelectModule],
    templateUrl: './mobile-shell.component.html',
    styleUrl: './mobile-shell.component.scss'
})
export class MobileShellComponent implements OnInit, OnDestroy {
    private appStateListener: any = null;
    private destroy$ = new Subject<void>();

    entrepots: EntrepotResponse[] = [];
    selectedEntrepot: EntrepotResponse | null = null;

    constructor(
        private alerteService: AlerteService,
        private mobileEntrepotService: MobileEntrepotService,
        private cdr: ChangeDetectorRef
    ) {}

    ngOnInit(): void {
        this.mobileEntrepotService.load();

        this.mobileEntrepotService.entrepots$
            .pipe(takeUntil(this.destroy$))
            .subscribe((list) => {
                this.entrepots = list;
                this.cdr.markForCheck();
            });

        this.mobileEntrepotService.selected$
            .pipe(takeUntil(this.destroy$))
            .subscribe((e) => {
                this.selectedEntrepot = e;
                this.cdr.markForCheck();
            });

        this.alerteService.startPolling();

        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) this.alerteService.refresh();
        });

        import('@capacitor/app')
            .then(({ App }) => {
                App.addListener('appStateChange', ({ isActive }) => {
                    if (isActive) this.alerteService.refresh();
                }).then((handle) => {
                    this.appStateListener = handle;
                });
            })
            .catch(() => {});
    }

    ngOnDestroy(): void {
        this.appStateListener?.remove();
        this.alerteService.stopPolling();
        this.destroy$.next();
        this.destroy$.complete();
    }

    get entrepotOptions() {
        return this.entrepots.map((e) => ({ label: e.nom!, value: e }));
    }

    onEntrepotChange(entrepot: EntrepotResponse): void {
        if (entrepot) this.mobileEntrepotService.select(entrepot);
    }
}
