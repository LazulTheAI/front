// ─────────────────────────────────────────────────────────────
//  subscription.service.ts
//  Lit le plan depuis le JWT ou /api/subscription.
//  Expose des helpers réactifs utilisables partout dans l'app.
// ─────────────────────────────────────────────────────────────
import { environment } from '@/environments/environment';
import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { BC_CHECKOUT_URLS, FEATURE_PLAN_REQUIREMENTS, PLAN_HIERARCHY, PlanLevel } from './plan.config';

export interface SubscriptionInfo {
    planLevel: PlanLevel;
    status: 'active' | 'trial' | 'cancelled' | 'expired';
    trialEndsAt?: string; // ISO date — null si pas en trial
    currentPeriodEnd?: string; // ISO date
    maxUsers: number;
}

const PLAN_MAX_USERS: Record<PlanLevel, number> = {
    trial: 1,
    starter: 1,
    pro: 3,
    business: 10
};

@Injectable({ providedIn: 'root' })
export class SubscriptionService {
    private http = inject(HttpClient);

    // ── State ────────────────────────────────────────────────────
    private _subscription = signal<SubscriptionInfo>({
        planLevel: 'trial',
        status: 'trial',
        maxUsers: 1
    });

    reload() {
        return this.load().subscribe();
    }

    // ── Selectors publics (readonly) ─────────────────────────────
    readonly subscription = this._subscription.asReadonly();

    readonly planLevel = computed(() => this._subscription().planLevel);

    readonly isTrialActive = computed(() => this._subscription().status === 'trial');

    readonly isActive = computed(() => ['active', 'trial'].includes(this._subscription().status));

    // ── Chargement ───────────────────────────────────────────────

    /**
     * À appeler dans APP_INITIALIZER ou au bootstrap de l'app.
     * Lit /api/subscription et hydrate le signal.
     */
    load() {
        return this.http.get<SubscriptionInfo>(`${environment.baseUrl}/api/subscription`).pipe(
            tap((info) => {
                console.log('Subscription reçue:', info);
                this._subscription.set({
                    ...info,
                    maxUsers: PLAN_MAX_USERS[info.planLevel] ?? 1
                });
            }),
            catchError((err) => {
                console.error('Erreur load subscription — status:', err.status, 'body:', err.error);
                // Garder le plan trial par défaut sans bloquer l'app
                return of({
                    planLevel: 'trial' as PlanLevel,
                    status: 'trial' as const,
                    maxUsers: 1
                });
            })
        );
    }

    // ── Helpers d'accès ──────────────────────────────────────────

    /** Vérifie si le plan courant est >= au plan requis */
    hasAccess(requiredPlan: PlanLevel): boolean {
        return PLAN_HIERARCHY[this._subscription().planLevel] >= PLAN_HIERARCHY[requiredPlan];
    }

    /** Vérifie si une feature nommée est débloquée */
    hasFeature(feature: string): boolean {
        const required = FEATURE_PLAN_REQUIREMENTS[feature];
        if (!required) return true; // feature non listée = accessible à tous
        return this.hasAccess(required);
    }

    /** Retourne l'URL de checkout BC pour upgrader vers un plan */
    checkoutUrl(targetPlan: Exclude<PlanLevel, 'trial'>): string {
        return BC_CHECKOUT_URLS[targetPlan];
    }

    /** Retourne le plan minimum suggéré pour débloquer une feature */
    requiredPlanFor(feature: string): PlanLevel | null {
        return FEATURE_PLAN_REQUIREMENTS[feature] ?? null;
    }
}
