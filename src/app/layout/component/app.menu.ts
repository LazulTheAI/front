import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
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
    </ul> `
})
export class AppMenu {
    model: MenuItem[] = [];

    ngOnInit() {
        this.model = [
            {
                label: 'Stock & approvisionnement',
                items: [
                    { label: 'Matériaux', icon: 'pi pi-box', routerLink: ['materiaux'] },
                    { label: 'Fournisseurs', icon: 'pi pi-truck', routerLink: ['fournisseurs'] },
                    { label: 'Bons de commande', icon: 'pi pi-shopping-cart', routerLink: ['bons-commande'] }
                ]
            },
            {
                label: 'Production',
                items: [
                    { label: 'Recettes', icon: 'pi pi-book', routerLink: ['recettes'] },
                    { label: 'Production', icon: 'pi pi-cog', routerLink: ['production'] }
                ]
            },
            {
                label: 'Catalogue',
                items: [{ label: 'Produits', icon: 'pi pi-tag', routerLink: ['produits'] }]
            },
            {
                label: 'Organisation',
                items: [
                    { label: 'Utilisateurs', icon: 'pi pi-users', routerLink: ['utilisateurs'] },
                    { label: 'Ateliers', icon: 'pi pi-warehouse', routerLink: ['lieux-production'] }
                ]
            },
            {
                label: 'Analyse',
                items: [
                    { label: 'Rapports', icon: 'pi pi-chart-bar', routerLink: ['rapports'] },
                    { label: 'Alertes', icon: 'pi pi-bell', routerLink: ['alertes'] }
                ]
            }
        ];
    }
}
