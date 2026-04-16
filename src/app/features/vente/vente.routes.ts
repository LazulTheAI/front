import { Routes } from '@angular/router';

export const COMMANDES_B2B_ROUTES: Routes = [
    {
        path: '',
        loadComponent: () => import('./vente-list/vente-list.component').then((m) => m.CommandesListComponent)
    }
];
