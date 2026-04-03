// app/features/bc-load/bc-load.component.ts
import { BigCommerceAuthControllerService } from '@/app/modules/openapi';
import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
    selector: 'app-bc-load',
    standalone: true,
    imports: [CommonModule],
    template: `
        <div style="display:flex; align-items:center; justify-content:center; height:100vh;">
            <p *ngIf="!error">Chargement...</p>
            <p *ngIf="error" style="color:red;">{{ error }}</p>
        </div>
    `
})
export class BcLoadComponent implements OnInit {
    error: string | null = null;

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private bcAuthService: BigCommerceAuthControllerService
    ) {}

    ngOnInit(): void {
        const signedPayloadJwt = this.route.snapshot.queryParamMap.get('signed_payload_jwt');

        if (!signedPayloadJwt) {
            this.error = 'Paramètre signed_payload_jwt manquant.';
            return;
        }

        this.bcAuthService.load(signedPayloadJwt).subscribe({
            next: (response: any) => {
                // Adapte selon ce que ton backend retourne
                const token = response?.token ?? response?.accessToken ?? response;

                if (token) {
                    localStorage.setItem('auth_token', token);
                    this.router.navigate(['/alertes']);
                } else {
                    this.error = 'Token non reçu du backend.';
                }
            },
            error: (err) => {
                console.error('Erreur BC load', err);
                this.error = "Erreur lors du chargement de l'application.";
            }
        });
    }
}
