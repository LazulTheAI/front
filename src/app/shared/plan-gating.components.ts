// ─────────────────────────────────────────────────────────────
//  upgrade-banner.component.ts
//  Affiché à la place d'une section verrouillée.
//
//  Usage :
//    <app-upgrade-banner feature="commandes-fournisseurs" />
//
//  Ou avec *appRequiresFeature :
//    <ng-container *appRequiresFeature="'planning-production'; else locked">
//      <app-planning />
//    </ng-container>
//    <ng-template #locked>
//      <app-upgrade-banner feature="planning-production" />
//    </ng-template>
// ─────────────────────────────────────────────────────────────
import { CommonModule } from '@angular/common';
import { Component, inject, Input } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { BC_CHECKOUT_URLS, PLAN_META, PlanLevel } from '../core/plan.config';
import { SubscriptionService } from '../core/subscription.service';

const FEATURE_LABELS: Record<string, string> = {
    'multi-users': 'Gestion multi-utilisateurs',
    'cogs-complet': 'COGS complet (MO + charges)',
    'prix-recommande': 'Prix de vente recommandé',
    'commandes-fournisseurs': 'Commandes fournisseurs',
    'tracabilite-lots': 'Traçabilité des lots',
    'export-comptable': 'Export comptable',
    'allergenes-inci': 'Fiche allergènes & INCI',
    'planning-production': 'Planning de production',
    'rapport-pl': 'Rapport P&L par produit',
    'multi-entrepots': 'Multi-entrepôts',
    'api-publique': 'API publique (Zapier/Make)',
    'multi-devises': 'Multi-devises'
};

@Component({
    selector: 'app-upgrade-banner',
    standalone: true,
    imports: [CommonModule, ButtonModule],
    template: `
        <div class="upgrade-banner">
            <div class="lock-icon">
                <i class="pi pi-lock"></i>
            </div>
            <div class="upgrade-content">
                <p class="upgrade-title">{{ featureLabel }} · Plan {{ planMeta.label }}</p>
                <p class="upgrade-desc">
                    Cette fonctionnalité est disponible à partir du plan
                    <strong>{{ planMeta.label }}</strong
                    >. Passez à la vitesse supérieure depuis votre admin BigCommerce.
                </p>
            </div>
            <p-button label="Passer au plan {{ planMeta.label }}" icon="pi pi-arrow-up-right" iconPos="right" severity="success" [outlined]="true" size="small" (onClick)="upgrade()" />
        </div>
    `,
    styles: [
        `
            .upgrade-banner {
                display: flex;
                align-items: center;
                gap: 1rem;
                padding: 1rem 1.25rem;
                background: var(--surface-50, #fafafa);
                border: 1px dashed var(--surface-300, #dee2e6);
                border-radius: 8px;
            }
            .lock-icon {
                display: flex;
                align-items: center;
                justify-content: center;
                width: 36px;
                height: 36px;
                border-radius: 50%;
                background: var(--surface-100, #f3f4f6);
                color: var(--text-color-secondary);
                flex-shrink: 0;
            }
            .lock-icon .pi {
                font-size: 16px;
            }
            .upgrade-content {
                flex: 1;
            }
            .upgrade-title {
                font-size: 13px;
                font-weight: 600;
                color: var(--text-color);
                margin: 0 0 2px;
            }
            .upgrade-desc {
                font-size: 12px;
                color: var(--text-color-secondary);
                margin: 0;
                line-height: 1.5;
            }
        `
    ]
})
export class UpgradeBannerComponent {
    @Input({ required: true }) feature!: string;

    subscription = inject(SubscriptionService);

    get requiredPlan(): PlanLevel {
        return this.subscription.requiredPlanFor(this.feature) ?? 'maker';
    }

    get planMeta() {
        return PLAN_META[this.requiredPlan];
    }

    get featureLabel(): string {
        return FEATURE_LABELS[this.feature] ?? this.feature;
    }

    upgrade() {
        const url = BC_CHECKOUT_URLS[this.requiredPlan as Exclude<PlanLevel, 'trial'>];
        window.open(url, '_blank');
    }
}
