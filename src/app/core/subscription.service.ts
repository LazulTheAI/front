// ─────────────────────────────────────────────────────────────
//  subscription.service.ts
//  Lit le plan depuis le JWT ou /api/subscription.
//  Expose des helpers réactifs utilisables partout dans l'app.
// ─────────────────────────────────────────────────────────────
import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs/operators';
import {
  PlanLevel,
  PLAN_HIERARCHY,
  FEATURE_PLAN_REQUIREMENTS,
  BC_CHECKOUT_URLS,
} from '../config/plan.config';

export interface SubscriptionInfo {
  planLevel: PlanLevel;
  status: 'active' | 'trial' | 'cancelled' | 'expired';
  trialEndsAt?: string;       // ISO date — null si pas en trial
  currentPeriodEnd?: string;  // ISO date
  maxUsers: number;
}

const PLAN_MAX_USERS: Record<PlanLevel, number> = {
  trial:   1,
  starter: 1,
  maker:   3,   // +9€/user supplémentaire géré côté BC
  atelier: 10,  // +8€/user supplémentaire géré côté BC
};

@Injectable({ providedIn: 'root' })
export class SubscriptionService {
  private http = inject(HttpClient);

  // ── State ────────────────────────────────────────────────────
  private _subscription = signal<SubscriptionInfo>({
    planLevel: 'trial',
    status: 'trial',
    maxUsers: 1,
  });

  // ── Selectors publics (readonly) ─────────────────────────────
  readonly subscription = this._subscription.asReadonly();

  readonly planLevel = computed(() => this._subscription().planLevel);

  readonly isTrialActive = computed(() =>
    this._subscription().status === 'trial'
  );

  readonly isActive = computed(() =>
    ['active', 'trial'].includes(this._subscription().status)
  );

  // ── Chargement ───────────────────────────────────────────────

  /**
   * À appeler dans APP_INITIALIZER ou au bootstrap de l'app.
   * Lit /api/subscription et hydrate le signal.
   */
  load() {
    return this.http.get<SubscriptionInfo>('/api/subscription').pipe(
      tap((info) => {
        this._subscription.set({
          ...info,
          maxUsers: PLAN_MAX_USERS[info.planLevel],
        });
      })
    );
  }

  // ── Helpers d'accès ──────────────────────────────────────────

  /** Vérifie si le plan courant est >= au plan requis */
  hasAccess(requiredPlan: PlanLevel): boolean {
    return (
      PLAN_HIERARCHY[this._subscription().planLevel] >=
      PLAN_HIERARCHY[requiredPlan]
    );
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
