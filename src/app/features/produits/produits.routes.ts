import { Routes } from '@angular/router';

export const PRODUITS_ROUTES: Routes = [
    {
        path: '',
        loadComponent: () => import('./produits-list/produits-list.component').then((m) => m.ProduitsListComponent),
        title: 'Produits'
    }
];
