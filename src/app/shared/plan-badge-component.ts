// ─────────────────────────────────────────────────────────────
//  plan-badge.component.ts — Badge du plan actuel (pour la nav)
//
//  Usage dans le layout :
//    <app-plan-badge />
// ─────────────────────────────────────────────────────────────
import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { PLAN_META } from '../core/plan.config';
import { SubscriptionService } from '../core/subscription.service';

@Component({
    selector: 'app-plan-badge',
    standalone: true,
    imports: [CommonModule],
    template: `
        <span class="plan-badge" [style.color]="meta.color" [style.background]="meta.bgColor">
            {{ meta.label }}
            <span *ngIf="subscription.isTrialActive()" class="trial-suffix"> · essai </span>
        </span>
    `,
    styles: [
        `
            .plan-badge {
                display: inline-flex;
                align-items: center;
                gap: 4px;
                font-size: 11px;
                font-weight: 600;
                padding: 3px 10px;
                border-radius: 20px;
                letter-spacing: 0.03em;
                white-space: nowrap;
            }
            .trial-suffix {
                opacity: 0.7;
                font-weight: 400;
            }
        `
    ]
})
export class PlanBadgeComponent {
    subscription = inject(SubscriptionService);

    get meta() {
        return PLAN_META[this.subscription.planLevel()];
    }
}
