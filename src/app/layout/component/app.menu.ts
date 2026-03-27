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
                label: 'Approvisionnement',
                items: [
                    { label: 'Stock matières', icon: 'pi pi-warehouse', routerLink: ['materiaux'] },
                    { label: 'Fournisseurs', icon: 'pi pi-truck', routerLink: ['fournisseurs'] },
                    { label: 'Bons de commande', icon: 'pi pi-file-import', routerLink: ['bons-commande'] }
                ]
            },
            {
                label: 'Production',
                items: [
                    { label: 'Runs de production', icon: 'pi pi-cog', routerLink: ['production'] },
                    { label: 'Recettes', icon: 'pi pi-book', routerLink: ['recettes'] }
                ]
            },
            {
                label: 'Ventes',
                items: [{ label: 'Produits & stock', icon: 'pi pi-tag', routerLink: ['produits'] }]
            },
            {
                label: 'Pilotage',
                items: [
                    { label: 'Alertes', icon: 'pi pi-bell', routerLink: ['alertes'] },
                    { label: 'Rapports', icon: 'pi pi-chart-bar', routerLink: ['rapports'] }
                ]
            },
            {
                label: 'Configuration',
                items: [
                    { label: 'Ateliers', icon: 'pi pi-building', routerLink: ['lieux-production'] },
                    { label: 'Utilisateurs', icon: 'pi pi-users', routerLink: ['utilisateurs'] }
                ]
            }
        ];
    }
}
