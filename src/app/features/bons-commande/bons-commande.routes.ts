import { Routes } from '@angular/router';

export const BONS_COMMANDE_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./bons-commande-list/bons-commande-list.component').then(
        (m) => m.BonsCommandeListComponent
      ),
    title: 'Bons de commande',
  },
];
