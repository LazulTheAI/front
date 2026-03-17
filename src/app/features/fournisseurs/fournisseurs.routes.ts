import { Routes } from '@angular/router';

export const FOURNISSEURS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./fournisseurs-list/fournisseurs-list.component').then(
        (m) => m.FournisseursListComponent
      ),
    title: 'Fournisseurs',
  },
];
