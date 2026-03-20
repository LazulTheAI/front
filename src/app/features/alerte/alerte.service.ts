import { AlerteStockResponse, ReportControllerService } from '@/app/modules/openapi';
import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, interval, startWith, Subscription, switchMap } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AlerteService implements OnDestroy {
    private _alertes$ = new BehaviorSubject<AlerteStockResponse[]>([]);
    readonly alertes$ = this._alertes$.asObservable();

    private pollSub?: Subscription;

    constructor(private reportService: ReportControllerService) {}

    startPolling(): void {
        if (this.pollSub) return; // déjà actif
        this.pollSub = interval(30_000)
            .pipe(
                startWith(0),
                switchMap(() => this.reportService.alertesAlerteStockResponse())
            )
            .subscribe({
                next: (d) => this._alertes$.next(d),
                error: () => {}
            });
    }

    stopPolling(): void {
        this.pollSub?.unsubscribe();
        this.pollSub = undefined;
    }

    refresh(): void {
        this.reportService.alertesAlerteStockResponse().subscribe({
            next: (d) => this._alertes$.next(d),
            error: () => {}
        });
    }

    get count(): number {
        return this._alertes$.value.length;
    }

    ngOnDestroy(): void {
        this.stopPolling();
    }
}
