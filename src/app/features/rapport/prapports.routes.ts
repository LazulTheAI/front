import { Routes } from '@angular/router';

export const RAPPORT_ROUTES: Routes = [
    {
        path: '',
        loadComponent: () => import('./rapports.component').then((m) => m.RapportsComponent),
        title: 'Rapport'
    }
];
