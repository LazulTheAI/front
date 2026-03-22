// alerte.service.ts
import { AlerteControllerService, AlerteResponse } from '@/app/modules/openapi';
import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, interval, startWith, Subscription, switchMap } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AlerteService implements OnDestroy {
    private _alertes$ = new BehaviorSubject<AlerteResponse[]>([]);
    readonly alertes$ = this._alertes$.asObservable();

    private pollSub?: Subscription;

    constructor(private alerteController: AlerteControllerService) {}

    // alerte.service.ts
    startPolling(): void {
        if (this.pollSub) return;
        this.pollSub = interval(30_000)
            .pipe(
                startWith(0),
                switchMap(() =>
                    this.alerteController.listerAlertes(
                        false, // all
                        0, // page
                        100, // size
                        undefined // entrepotId
                    )
                )
            )
            .subscribe({
                next: (data: any) => this._alertes$.next(data.content ?? []),
                error: () => {}
            });
    }

    stopPolling(): void {
        this.pollSub?.unsubscribe();
        this.pollSub = undefined;
    }

    refresh(): void {
        this.alerteController.listerAlertes(false, 0, 100, undefined).subscribe({
            next: (data: any) => this._alertes$.next(data.content ?? []),
            error: () => {}
        });
    }

    ngOnDestroy(): void {
        this.stopPolling();
    }
}
