import { Routes } from '@angular/router';

export const ENTREPOTS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./entrepots-list/entrepots-list.component').then(
        (m) => m.EntrepotsListComponent
      ),
    title: 'Entrepôts',
  },
];
