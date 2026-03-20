import { Routes } from '@angular/router';

export const Alerte_ROUTES: Routes = [
    {
        path: '',
        loadComponent: () => import('./alertes.component').then((m) => m.AlertesComponent),
        title: 'Alertes'
    }
];
