import { BigCommerceAuthControllerService } from '@/app/modules/openapi';
import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
    selector: 'app-bc-auth',
    standalone: true,
    imports: [CommonModule],
    template: `
        <div style="display:flex; align-items:center; justify-content:center; height:100vh;">
            <p *ngIf="!error">Installation en cours...</p>
            <p *ngIf="error" style="color:red;">{{ error }}</p>
        </div>
    `
})
export class BcAuthComponent implements OnInit {
    error: string | null = null;

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private bcAuthService: BigCommerceAuthControllerService
    ) {}

    ngOnInit(): void {
        const code = this.route.snapshot.queryParamMap.get('code');
        const context = this.route.snapshot.queryParamMap.get('context');
        const scope = this.route.snapshot.queryParamMap.get('scope') ?? undefined;

        console.log('=== BC AUTH ===');
        console.log('code:', code);
        console.log('context:', context);
        console.log('scope:', scope);
        console.log('all params:', this.route.snapshot.queryParams);

        if (!code || !context) {
            this.error = `Paramètres manquants - code: ${code}, context: ${context}`;
            return;
        }

        this.bcAuthService.auth(code, context, scope).subscribe({
            next: (response: any) => {
                const token = response?.token ?? response?.accessToken;
                if (token) {
                    localStorage.setItem('auth_token', token);
                    this.router.navigate(['/alertes']);
                } else {
                    this.error = 'Token non reçu du backend.';
                }
            },
            error: (err) => {
                console.error('Erreur BC auth', err);
                this.error = "Erreur lors de l'installation.";
            }
        });
    }
}
