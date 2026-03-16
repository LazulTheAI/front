import { Routes } from '@angular/router';

export const RECETTES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./recettes-list/recettes-list.component').then(
        (m) => m.RecettesListComponent
      ),
    title: 'Recettes',
  },
];
