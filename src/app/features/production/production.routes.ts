import { Routes } from '@angular/router';

export const PRODUCTION_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./production-list/production-list.component').then(
        (m) => m.ProductionListComponent
      ),
    title: 'Production',
  },
];
