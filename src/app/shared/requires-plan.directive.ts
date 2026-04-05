// ─────────────────────────────────────────────────────────────
//  requires-plan.directive.ts
//
//  Directive structurelle qui cache/affiche un bloc selon le plan.
//
//  Usage 1 — cacher silencieusement :
//    <div *appRequiresPlan="'maker'">...</div>
//
//  Usage 2 — afficher un banner à la place :
//    <div *appRequiresPlan="'maker'; else upgradeBanner">...</div>
//    <ng-template #upgradeBanner>
//      <app-upgrade-banner feature="commandes-fournisseurs" />
//    </ng-template>
//
//  Usage 3 — désactiver un bouton :
//    <p-button [disabled]="!subscription.hasFeature('export-comptable')" />
// ─────────────────────────────────────────────────────────────
import {
  Directive,
  Input,
  OnInit,
  TemplateRef,
  ViewContainerRef,
  inject,
} from '@angular/core';
import { PlanLevel } from '../config/plan.config';
import { SubscriptionService } from '../services/subscription.service';

@Directive({
  selector: '[appRequiresPlan]',
  standalone: true,
})
export class RequiresPlanDirective implements OnInit {
  @Input('appRequiresPlan') requiredPlan!: PlanLevel;

  private template = inject(TemplateRef<any>);
  private viewContainer = inject(ViewContainerRef);
  private subscriptionService = inject(SubscriptionService);

  ngOnInit(): void {
    if (this.subscriptionService.hasAccess(this.requiredPlan)) {
      this.viewContainer.createEmbeddedView(this.template);
    } else {
      this.viewContainer.clear();
    }
  }
}


// ─────────────────────────────────────────────────────────────
//  requires-feature.directive.ts  (inline dans le même fichier)
//
//  Variante basée sur le nom de feature (recommandée dans les templates).
//
//  Usage :
//    <section *appRequiresFeature="'commandes-fournisseurs'">...</section>
// ─────────────────────────────────────────────────────────────
@Directive({
  selector: '[appRequiresFeature]',
  standalone: true,
})
export class RequiresFeatureDirective implements OnInit {
  @Input('appRequiresFeature') feature!: string;

  private template = inject(TemplateRef<any>);
  private viewContainer = inject(ViewContainerRef);
  private subscriptionService = inject(SubscriptionService);

  ngOnInit(): void {
    if (this.subscriptionService.hasFeature(this.feature)) {
      this.viewContainer.createEmbeddedView(this.template);
    } else {
      this.viewContainer.clear();
    }
  }
}
