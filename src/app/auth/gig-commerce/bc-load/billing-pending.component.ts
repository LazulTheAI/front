import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
    selector: 'app-billing-pending',
    standalone: true,
    imports: [CommonModule],
    template: `
        <div
            style="display:flex; flex-direction:column; align-items:center; 
                justify-content:center; height:100vh; font-family:sans-serif; 
                text-align:center; padding: 2rem;"
        >
            <h2>Finaliser votre abonnement</h2>
            <p>Complétez votre paiement pour accéder à MakerStock.</p>
            <a
                [href]="checkoutUrl"
                target="_top"
                style="margin-top:1rem; padding:12px 24px; background:#3b82f6; 
                color:white; border-radius:6px; text-decoration:none; 
                font-weight:bold;"
            >
                Compléter le paiement →
            </a>
        </div>
    `
})
export class BillingPendingComponent implements OnInit {
    checkoutUrl = '';

    constructor(private route: ActivatedRoute) {}

    ngOnInit() {
        this.checkoutUrl = this.route.snapshot.queryParamMap.get('checkout') || '';
    }
}
