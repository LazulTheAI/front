import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TranslocoService } from '@jsverse/transloco';
import { MenuItem } from 'primeng/api';
import { AppMenuitem } from './app.menuitem';

@Component({
    selector: 'app-menu',
    standalone: true,
    imports: [CommonModule, AppMenuitem, RouterModule],
    template: `<ul class="layout-menu">
        @for (item of model; track item.label) {
            @if (!item.separator) {
                <li app-menuitem [item]="item" [root]="true"></li>
            } @else {
                <li class="menu-separator"></li>
            }
        }
    </ul>`
})
export class AppMenu implements OnInit {
    model: MenuItem[] = [];

    constructor(private transloco: TranslocoService) {}

    ngOnInit(): void {
        this.transloco.selectTranslation().subscribe(() => {
            this.buildMenu();
        });

        this.transloco.langChanges$.subscribe(() => {
            this.buildMenu();
        });
    }

    private buildMenu(): void {
        this.model = [
            {
                label: this.t('menu.supply'),
                items: [
                    { label: this.t('menu.materials'), icon: 'pi pi-warehouse', routerLink: ['materiaux'] },
                    { label: this.t('menu.suppliers'), icon: 'pi pi-truck', routerLink: ['fournisseurs'] },
                    { label: this.t('menu.orders'), icon: 'pi pi-file-import', routerLink: ['bons-commande'] }
                ]
            },
            {
                label: this.t('menu.production'),
                items: [
                    { label: this.t('menu.runs'), icon: 'pi pi-cog', routerLink: ['production'] },
                    { label: this.t('menu.recipes'), icon: 'pi pi-book', routerLink: ['recettes'] }
                ]
            },
            {
                label: this.t('menu.sales'),
                items: [
                    { label: this.t('menu.products'), icon: 'pi pi-tag', routerLink: ['produits'] },
                    { label: this.t('menu.resellers'), icon: 'pi pi-users', routerLink: ['revendeurs'] },
                    { label: this.t('menu.b2b_orders'), icon: 'pi pi-shopping-bag', routerLink: ['commandes-b2b'] }
                ]
            },
            {
                label: this.t('menu.piloting'),
                items: [
                    { label: this.t('menu.alerts'), icon: 'pi pi-bell', routerLink: ['alertes'] },
                    { label: this.t('menu.reports'), icon: 'pi pi-chart-bar', routerLink: ['rapports'] }
                ]
            },
            {
                label: this.t('menu.settings'),
                items: [
                    { label: this.t('menu.workshops'), icon: 'pi pi-building', routerLink: ['lieux-production'] },
                    { label: this.t('menu.import'), icon: 'pi pi-upload', routerLink: ['import'] },
                    { label: this.t('menu.users'), icon: 'pi pi-users', routerLink: ['utilisateurs'] }
                ]
            }
        ];
    }

    private t(key: string): string {
        return this.transloco.translate(key);
    }
}
