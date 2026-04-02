import { Routes } from '@angular/router';

export const IMPORT_ROUTES: Routes = [
    {
        path: '',
        loadComponent: () => import('./import.component').then((m) => m.ImportComponent),
        title: 'Import'
    }
];
