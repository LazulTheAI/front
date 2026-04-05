import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
    selector: 'app-auth-callback',
    template: `<p>Connexion en cours...</p>`
})
export class AuthCallbackComponent implements OnInit {
    constructor(
        private route: ActivatedRoute,
        private router: Router
    ) {}

    ngOnInit(): void {
        const token = this.route.snapshot.queryParams['token'];
        const checkout = this.route.snapshot.queryParams['checkout'];

        if (!token) {
            this.router.navigate(['/access-denied']);
            return;
        }

        localStorage.setItem('jwt', token);

        if (checkout) {
            // Checkout en attente → page intermédiaire
            this.router.navigate(['/billing/pending'], {
                queryParams: { checkout },
                replaceUrl: true
            });
            return;
        }

        this.router.navigate(['/alertes'], { replaceUrl: true });
    }
}
