import { Routes } from '@angular/router';

export const COMMANDES_B2B_ROUTES: Routes = [
    {
        path: '',
        loadComponent: () => import('./commande-list/commandes-b2b-list.component').then((m) => m.CommandesB2BListComponent)
    }
];
