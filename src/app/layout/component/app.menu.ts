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
                label: 'Home',
                items: [{ label: 'Dashboard', icon: 'pi pi-fw pi-home', routerLink: ['/'] }]
            },
            {
                label: 'UI Components',
                items: [
                    { label: 'Matériaux', icon: 'pi pi-box', routerLink: ['materiaux'] },
                    { label: 'Recettes', icon: 'pi pi-book', routerLink: ['recettes'] },
                    { label: 'Production', icon: 'pi pi-cog', routerLink: ['production'] },
                    { label: 'Entrepôts', icon: 'pi pi-warehouse', routerLink: ['entrepots'] },
                    { label: 'Ateliers', icon: 'pi pi-building', routerLink: ['lieux-production'] },
                    { label: 'Mon équipe', icon: 'pi pi-users', routerLink: ['utilisateurs'] },
                    { label: 'Fournisseurs', icon: 'pi pi-truck', routerLink: ['fournisseurs'] },
                    { label: 'Produits', icon: 'pi pi-tag', routerLink: ['produits'] },
                    { label: 'Bon de Comomande', icon: 'pi pi-file', routerLink: ['bons-commande'] },
                    { label: 'Rapports', icon: 'pi pi-chart-bar', routerLink: ['rapports'] }
                ]
            }
        ];
    }
}
