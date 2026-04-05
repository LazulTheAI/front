import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import {
    BC_CHECKOUT_URLS,
    PLAN_DESCRIPTION,
    PLAN_FEATURES,
    PLAN_META,
    PLAN_PRICING,
    PlanLevel,
} from '../../core/plan.config';
import { SubscriptionService } from '../../core/subscription.service';

type BillingCycle = 'monthly' | 'annual';

const PAID_PLANS: Exclude<PlanLevel, 'trial'>[] = ['starter', 'maker', 'atelier'];

@Component({
    selector: 'app-upgrade',
    standalone: true,
    imports: [CommonModule, ButtonModule, TooltipModule],
    template: `
        <div class="upgrade-page">

            <!-- Header -->
            <div class="upgrade-header">
                <h1 class="upgrade-title">Choisissez votre plan</h1>
                <p class="upgrade-subtitle">
                    Passez à la vitesse supérieure quand vous êtes prêt.
                    Modifiez ou annulez à tout moment depuis votre admin BigCommerce.
                </p>

                <!-- Billing toggle -->
                <div class="billing-toggle">
                    <button
                        class="toggle-btn"
                        [class.active]="billingCycle() === 'monthly'"
                        (click)="billingCycle.set('monthly')"
                    >Mensuel</button>
                    <button
                        class="toggle-btn"
                        [class.active]="billingCycle() === 'annual'"
                        (click)="billingCycle.set('annual')"
                    >
                        Annuel
                        <span class="annual-badge">2 mois offerts</span>
                    </button>
                </div>
            </div>

            <!-- Cards -->
            <div class="plans-grid">
                @for (plan of plans; track plan) {
                    <div
                        class="plan-card"
                        [class.plan-card--popular]="plan === 'maker'"
                        [class.plan-card--required]="plan === requiredPlan()"
                        [class.plan-card--current]="plan === currentPlan()"
                    >
                        @if (plan === 'maker') {
                            <div class="popular-badge">Le plus populaire</div>
                        }
                        @if (plan === requiredPlan() && plan !== 'maker') {
                            <div class="required-badge">Plan requis</div>
                        }

                        <!-- Plan name -->
                        <div class="plan-header">
                            <span
                                class="plan-label"
                                [style.color]="meta(plan).color"
                                [style.background]="meta(plan).bgColor"
                            >{{ meta(plan).label }}</span>
                            <p class="plan-description">{{ description(plan) }}</p>
                        </div>

                        <!-- Price -->
                        <div class="plan-price">
                            <span class="price-amount">€{{ price(plan) }}</span>
                            <span class="price-period">/mois</span>
                            @if (billingCycle() === 'annual') {
                                <div class="price-note">facturé annuellement</div>
                            } @else {
                                <div class="price-note">
                                    → €{{ annualPrice(plan) }}/mois si annuel
                                </div>
                            }
                        </div>

                        <!-- Features -->
                        <ul class="feature-list">
                            @for (feature of features(plan); track feature.label) {
                                <li class="feature-item" [class.feature-item--locked]="!feature.included">
                                    <i class="pi" [class.pi-check]="feature.included" [class.pi-times]="!feature.included"></i>
                                    <span>{{ feature.label }}</span>
                                </li>
                            }
                        </ul>

                        <!-- CTA -->
                        @if (plan === currentPlan()) {
                            <p-button
                                label="Plan actuel"
                                styleClass="w-full"
                                [outlined]="true"
                                [disabled]="true"
                            />
                        } @else if (isDowngrade(plan)) {
                            <p-button
                                label="Gérer mon abonnement"
                                styleClass="w-full"
                                severity="secondary"
                                [outlined]="true"
                                (onClick)="openCheckout(plan)"
                            />
                        } @else {
                            <p-button
                                [label]="currentPlan() === 'trial' ? 'Démarrer l\u2019essai' : 'Passer au plan ' + meta(plan).label"
                                styleClass="w-full"
                                [severity]="plan === 'maker' ? 'success' : 'primary'"
                                (onClick)="openCheckout(plan)"
                            />
                        }
                    </div>
                }
            </div>

            <!-- Back link -->
            <div class="upgrade-footer">
                <button class="back-link" (click)="goBack()">
                    <i class="pi pi-arrow-left"></i> Retour
                </button>
            </div>
        </div>
    `,
    styles: [`
        .upgrade-page {
            max-width: 1000px;
            margin: 0 auto;
            padding: 2rem 1rem 3rem;
        }

        .upgrade-header {
            text-align: center;
            margin-bottom: 2.5rem;
        }
        .upgrade-title {
            font-size: 1.75rem;
            font-weight: 700;
            color: var(--text-color);
            margin: 0 0 0.5rem;
        }
        .upgrade-subtitle {
            font-size: 0.9rem;
            color: var(--text-color-secondary);
            margin: 0 auto 1.5rem;
            max-width: 520px;
            line-height: 1.6;
        }

        /* Billing toggle */
        .billing-toggle {
            display: inline-flex;
            background: var(--surface-100);
            border-radius: 8px;
            padding: 3px;
            gap: 2px;
        }
        .toggle-btn {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 6px 16px;
            border: none;
            background: transparent;
            border-radius: 6px;
            font-size: 13px;
            font-weight: 500;
            color: var(--text-color-secondary);
            cursor: pointer;
            transition: all 0.15s;
        }
        .toggle-btn.active {
            background: var(--surface-0);
            color: var(--text-color);
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .annual-badge {
            font-size: 10px;
            font-weight: 600;
            background: #e1f5ee;
            color: #0f6e56;
            padding: 1px 6px;
            border-radius: 10px;
        }

        /* Grid */
        .plans-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 1.25rem;
            align-items: start;
        }
        @media (max-width: 768px) {
            .plans-grid { grid-template-columns: 1fr; }
        }

        /* Card */
        .plan-card {
            position: relative;
            background: var(--surface-0);
            border: 1.5px solid var(--surface-200);
            border-radius: 12px;
            padding: 1.5rem;
            display: flex;
            flex-direction: column;
            gap: 1.25rem;
            transition: box-shadow 0.15s;
        }
        .plan-card--popular {
            border-color: #0f6e56;
            box-shadow: 0 4px 20px rgba(15,110,86,0.12);
        }
        .plan-card--required {
            border-color: var(--primary-color);
            box-shadow: 0 4px 20px rgba(0,0,0,0.08);
        }
        .plan-card--current {
            background: var(--surface-50);
        }

        /* Badges */
        .popular-badge, .required-badge {
            position: absolute;
            top: -12px;
            left: 50%;
            transform: translateX(-50%);
            font-size: 11px;
            font-weight: 700;
            padding: 3px 12px;
            border-radius: 20px;
            white-space: nowrap;
        }
        .popular-badge {
            background: #0f6e56;
            color: #fff;
        }
        .required-badge {
            background: var(--primary-color);
            color: #fff;
        }

        /* Plan header */
        .plan-label {
            display: inline-block;
            font-size: 12px;
            font-weight: 700;
            padding: 2px 10px;
            border-radius: 20px;
            margin-bottom: 6px;
        }
        .plan-description {
            font-size: 12px;
            color: var(--text-color-secondary);
            margin: 0;
            line-height: 1.5;
        }

        /* Price */
        .plan-price {
            border-bottom: 1px solid var(--surface-200);
            padding-bottom: 1rem;
        }
        .price-amount {
            font-size: 2rem;
            font-weight: 800;
            color: var(--text-color);
        }
        .price-period {
            font-size: 14px;
            color: var(--text-color-secondary);
            margin-left: 2px;
        }
        .price-note {
            font-size: 11px;
            color: var(--text-color-secondary);
            margin-top: 2px;
        }

        /* Features */
        .feature-list {
            list-style: none;
            margin: 0;
            padding: 0;
            display: flex;
            flex-direction: column;
            gap: 8px;
            flex: 1;
        }
        .feature-item {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 13px;
            color: var(--text-color);
        }
        .feature-item .pi-check {
            color: #0f6e56;
            font-size: 12px;
            flex-shrink: 0;
        }
        .feature-item--locked {
            color: var(--text-color-secondary);
            opacity: 0.5;
        }
        .feature-item--locked .pi-times {
            color: var(--text-color-secondary);
            font-size: 12px;
            flex-shrink: 0;
        }

        /* Footer */
        .upgrade-footer {
            text-align: center;
            margin-top: 2rem;
        }
        .back-link {
            background: none;
            border: none;
            color: var(--text-color-secondary);
            font-size: 13px;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 6px;
        }
        .back-link:hover { color: var(--text-color); }
    `],
})
export class UpgradeComponent {
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private subscriptionService = inject(SubscriptionService);

    readonly plans = PAID_PLANS;
    readonly billingCycle = signal<BillingCycle>('monthly');

    readonly requiredPlan = computed<Exclude<PlanLevel, 'trial'> | null>(() => {
        const param = this.route.snapshot.queryParamMap.get('required') as PlanLevel | null;
        if (param && param !== 'trial') return param as Exclude<PlanLevel, 'trial'>;
        return null;
    });

    readonly currentPlan = computed(() => this.subscriptionService.planLevel());

    meta(plan: Exclude<PlanLevel, 'trial'>) {
        return PLAN_META[plan];
    }

    description(plan: Exclude<PlanLevel, 'trial'>) {
        return PLAN_DESCRIPTION[plan];
    }

    features(plan: Exclude<PlanLevel, 'trial'>) {
        return PLAN_FEATURES[plan];
    }

    price(plan: Exclude<PlanLevel, 'trial'>): number {
        return this.billingCycle() === 'annual'
            ? PLAN_PRICING[plan].annual
            : PLAN_PRICING[plan].monthly;
    }

    annualPrice(plan: Exclude<PlanLevel, 'trial'>): number {
        return PLAN_PRICING[plan].annual;
    }

    isDowngrade(plan: Exclude<PlanLevel, 'trial'>): boolean {
        const current = this.currentPlan();
        if (current === 'trial') return false;
        const hierarchy: Record<string, number> = { starter: 1, maker: 2, atelier: 3 };
        return (hierarchy[plan] ?? 0) < (hierarchy[current] ?? 0);
    }

    openCheckout(plan: Exclude<PlanLevel, 'trial'>): void {
        window.open(BC_CHECKOUT_URLS[plan], '_blank');
    }

    goBack(): void {
        this.router.navigate(['/']);
    }
}
