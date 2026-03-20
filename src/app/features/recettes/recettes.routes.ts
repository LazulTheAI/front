import { Routes } from '@angular/router';

export const RECETTES_ROUTES: Routes = [
    {
        path: '',
        loadComponent: () => import('./recettes-list/recettes-list.component').then((m) => m.RecettesListComponent),
        title: 'Recettes'
    },
    {
        path: 'nouvelle',
        loadComponent: () => import('./recette-create/recette-create.component').then((m) => m.RecetteCreateComponent),
        title: 'Creation de la recette'
    }
];
