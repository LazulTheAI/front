import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SubscriptionService } from '../core/subscription.service';

@Component({
    selector: 'app-auth-callback',
    standalone: true,
    template: `<p>Connexion en cours...</p>`
})
export class AuthCallbackComponent implements OnInit {
    constructor(
        private route: ActivatedRoute,
        private router: Router
    ) {}

    private subscriptionService = inject(SubscriptionService);

    ngOnInit(): void {
        const token = this.route.snapshot.queryParams['token'];
        const checkout = this.route.snapshot.queryParams['checkout'];
        const from = this.route.snapshot.queryParams['from'];
        console.log('AuthCallback params:', { token: !!token, checkout, from }); // ← log

        if (!token) {
            this.router.navigate(['/access-denied']);
            return;
        }

        localStorage.setItem('jwt', token);

        if (checkout) {
            this.router.navigate(['/billing/pending'], {
                queryParams: { checkout },
                replaceUrl: true
            });
            return;
        }

        if (from === 'checkout') {
            this.subscriptionService.load().subscribe({
                next: () => {
                    console.log('Plan rechargé:', this.subscriptionService.planLevel());
                    window.location.replace('/alertes');
                },
                error: () => window.location.replace('/alertes')
            });
            return;
        }

        this.router.navigate(['/alertes'], { replaceUrl: true });
    }
}
