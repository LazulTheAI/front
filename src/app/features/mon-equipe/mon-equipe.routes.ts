import { Routes } from '@angular/router';

export const MON_EQUIPE_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./mon-equipe.component').then(m => m.MonEquipeComponent),
    title: 'Mon équipe',
  },
];
