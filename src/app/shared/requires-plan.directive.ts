import {
  Directive,
  Input,
  OnInit,
  TemplateRef,
  ViewContainerRef,
  inject,
} from '@angular/core';
import { PlanLevel } from '../core/plan.config';
import { SubscriptionService } from '../core/subscription.service';

@Directive({
  selector: '[appRequiresPlan]',
  standalone: true,
})
export class RequiresPlanDirective implements OnInit {
  @Input('appRequiresPlan') requiredPlan!: PlanLevel;
  @Input('appRequiresPlanElse') elseTemplate?: TemplateRef<any>;

  private template = inject(TemplateRef<any>);
  private viewContainer = inject(ViewContainerRef);
  private subscriptionService = inject(SubscriptionService);

  ngOnInit(): void {
    if (this.subscriptionService.hasAccess(this.requiredPlan)) {
      this.viewContainer.createEmbeddedView(this.template);
    } else {
      this.viewContainer.clear();
      if (this.elseTemplate) {
        this.viewContainer.createEmbeddedView(this.elseTemplate);
      }
    }
  }
}


@Directive({
  selector: '[appRequiresFeature]',
  standalone: true,
})
export class RequiresFeatureDirective implements OnInit {
  @Input('appRequiresFeature') feature!: string;
  @Input('appRequiresFeatureElse') elseTemplate?: TemplateRef<any>;

  private template = inject(TemplateRef<any>);
  private viewContainer = inject(ViewContainerRef);
  private subscriptionService = inject(SubscriptionService);

  ngOnInit(): void {
    if (this.subscriptionService.hasFeature(this.feature)) {
      this.viewContainer.createEmbeddedView(this.template);
    } else {
      this.viewContainer.clear();
      if (this.elseTemplate) {
        this.viewContainer.createEmbeddedView(this.elseTemplate);
      }
    }
  }
}
