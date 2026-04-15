// ═══════════════════════════════════════════════════════════════
//  product-usage-bar.component.ts
//  Barre d'usage à afficher en haut de la page Produits.
//  Se connecte à GET /api/subscription/usage
// ═══════════════════════════════════════════════════════════════
import { BC_CHECKOUT_URLS, PlanLevel } from '@/app/core/plan.config';
import { SubscriptionService } from '@/app/core/subscription.service';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit, inject } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { ProgressBarModule } from 'primeng/progressbar';
import { TooltipModule } from 'primeng/tooltip';

interface ProductUsage {
    current: number;
    limit: number;
    planLevel: string;
}

@Component({
    selector: 'app-product-usage-bar',
    standalone: true,
    imports: [CommonModule, ButtonModule, ProgressBarModule, TooltipModule],
    template: `
        <div *ngIf="usage" class="usage-bar-wrapper" [class.near-limit]="isNearLimit" [class.at-limit]="isAtLimit">
            <div class="usage-info">
                <span class="usage-label"> Produits BC synchronisés </span>
                <span class="usage-count" [class.count-warning]="isNearLimit" [class.count-danger]="isAtLimit"> {{ usage.current }} / {{ usage.limit }} </span>
            </div>

            <p-progressBar
                [value]="percentUsed"
                [showValue]="false"
                styleClass="usage-progress"
                [ngClass]="{
                    'progress-ok': percentUsed < 75,
                    'progress-warning': percentUsed >= 75 && percentUsed < 100,
                    'progress-danger': percentUsed >= 100
                }"
            />

            <!-- Warning à 85% -->
            <div *ngIf="isNearLimit && !isAtLimit" class="usage-alert usage-alert--warn">
                <i class="pi pi-exclamation-triangle"></i>
                Vous approchez de la limite de votre plan <strong>{{ usage.planLevel | titlecase }}</strong
                >.
                <p-button label="Passer au plan supérieur" styleClass="p-button-link p-button-sm" (onClick)="upgrade()" />
            </div>

            <!-- Bloqué à 100% -->
            <div *ngIf="isAtLimit" class="usage-alert usage-alert--danger">
                <i class="pi pi-ban"></i>
                Limite atteinte — les nouveaux produits BC ne seront <strong>pas synchronisés</strong>
                tant que vous n'avez pas mis à niveau votre plan.
                <p-button label="Débloquer maintenant" styleClass="p-button-link p-button-sm" (onClick)="upgrade()" />
            </div>
        </div>
    `,
    styles: [
        `
            .usage-bar-wrapper {
                display: flex;
                flex-direction: column;
                gap: 6px;
                padding: 12px 16px;
                background: var(--surface-0);
                border: 1px solid var(--surface-200);
                border-radius: 8px;
                margin-bottom: 1rem;
            }
            .usage-bar-wrapper.near-limit {
                border-color: #fac775;
                background: #faeeda22;
            }
            .usage-bar-wrapper.at-limit {
                border-color: #f09595;
                background: #fcebeb22;
            }
            .usage-info {
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            .usage-label {
                font-size: 13px;
                color: var(--text-color-secondary);
            }
            .usage-count {
                font-size: 13px;
                font-weight: 600;
                color: var(--text-color);
            }
            .count-warning {
                color: #ba7517;
            }
            .count-danger {
                color: #a32d2d;
            }

            :host ::ng-deep .usage-progress {
                height: 6px;
                border-radius: 3px;
            }
            :host ::ng-deep .progress-ok .p-progressbar-value {
                background: #1d9e75;
            }
            :host ::ng-deep .progress-warning .p-progressbar-value {
                background: #ef9f27;
            }
            :host ::ng-deep .progress-danger .p-progressbar-value {
                background: #e24b4a;
            }

            .usage-alert {
                display: flex;
                align-items: center;
                gap: 8px;
                font-size: 12px;
                margin-top: 4px;
            }
            .usage-alert--warn {
                color: #854f0b;
            }
            .usage-alert--danger {
                color: #a32d2d;
            }
            .usage-alert i {
                font-size: 13px;
                flex-shrink: 0;
            }
        `
    ]
})
export class ProductUsageBarComponent implements OnInit {
    private http = inject(HttpClient);
    subscription = inject(SubscriptionService);

    usage: ProductUsage | null = null;

    get percentUsed(): number {
        if (!this.usage) return 0;
        return Math.min(100, Math.round((this.usage.current / this.usage.limit) * 100));
    }

    get isNearLimit(): boolean {
        return this.percentUsed >= 85;
    }

    get isAtLimit(): boolean {
        return !!this.usage && this.usage.current >= this.usage.limit;
    }

    ngOnInit(): void {
        this.http.get<ProductUsage>('/api/subscription/usage').subscribe({
            next: (data) => (this.usage = data),
            error: () => {
                /* silencieux si l'endpoint n'existe pas encore */
            }
        });
    }

    upgrade(): void {
        const plan = this.subscription.planLevel();
        const nextPlan: Record<PlanLevel, Exclude<PlanLevel, 'trial'> | null> = {
            trial: 'starter',
            starter: 'pro',
            maker: 'business',
            atelier: null
        };
        const target = nextPlan[plan];
        if (target) {
            window.open(BC_CHECKOUT_URLS[target], '_blank');
        }
    }
}
