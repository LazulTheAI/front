// ─────────────────────────────────────────────────────────────
//  plan.guard.ts — Route guard basé sur le plan
//
//  Usage dans les routes :
//    {
//      path: 'planning',
//      canActivate: [planGuard('atelier')],
//      component: PlanningComponent
//    }
// ─────────────────────────────────────────────────────────────
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { PlanLevel } from './plan.config';
import { SubscriptionService } from './subscription.service';
export const planGuard = (requiredPlan: PlanLevel): CanActivateFn => {
    return () => {
        const subscription = inject(SubscriptionService);
        const router = inject(Router);

        if (subscription.hasAccess(requiredPlan)) {
            return true;
        }

        // Redirige vers la page d'upgrade en transmettant le plan requis
        return router.createUrlTree(['/upgrade'], {
            queryParams: { required: requiredPlan }
        });
    };
};
