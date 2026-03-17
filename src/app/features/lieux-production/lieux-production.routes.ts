import { Routes } from '@angular/router';

export const LIEUX_PRODUCTION_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./lieux-production.component').then(m => m.LieuxProductionComponent),
    title: 'Lieux de production',
  },
];
