import { Routes } from '@angular/router';

export const REVENDEURS_ROUTES: Routes = [
    {
        path: '',
        loadComponent: () => import('./revendeur-list/revendeurs-list.component').then((m) => m.RevendeursListComponent)
    }
];
