import { Routes } from '@angular/router';
import { ProduitLotsComponent } from './produit-lots/produit-lots.component';

export const PRODUITS_ROUTES: Routes = [
    {
        path: '',
        loadComponent: () => import('./produits-list/produits-list.component').then((m) => m.ProduitsListComponent),
        title: 'Produits'
    },
    { path: ':id/lots', component: ProduitLotsComponent, title: 'Stock produit' }
];
