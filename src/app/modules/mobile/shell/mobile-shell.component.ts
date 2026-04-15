import { AlerteWidgetComponent } from '@/app/features/alerte/alerte-widget.component';
import { AlerteService } from '@/app/features/alerte/alerte.service';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
    selector: 'app-mobile-shell',
    standalone: true,
    imports: [RouterModule, AlerteWidgetComponent],
    templateUrl: './mobile-shell.component.html',
    styleUrl: './mobile-shell.component.scss'
})
export class MobileShellComponent implements OnInit, OnDestroy {
    private appStateListener: any = null;

    constructor(private alerteService: AlerteService) {}

    ngOnInit(): void {
        this.alerteService.startPolling();

        // Rafraîchit les alertes quand l'app revient au premier plan (web fallback)
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                this.alerteService.refresh();
            }
        });

        // Capacitor (Android/iOS) — chargé dynamiquement si disponible
        import('@capacitor/app')
            .then(({ App }) => {
                App.addListener('appStateChange', ({ isActive }) => {
                    if (isActive) this.alerteService.refresh();
                }).then((handle) => {
                    this.appStateListener = handle;
                });
            })
            .catch(() => {
                /* web — pas de Capacitor, visibilitychange suffira */
            });
    }

    ngOnDestroy(): void {
        this.appStateListener?.remove();
        this.alerteService.stopPolling();
    }
}
