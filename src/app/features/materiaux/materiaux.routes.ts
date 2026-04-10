import { Routes } from '@angular/router';
import { MateriauLotsComponent } from './materiau-lots/materiau-lots.component';

/**
 * Routes du module Matériaux.
 * À intégrer dans votre routing Sakai, par exemple :
 *
 * {
 *   path: 'materiaux',
 *   loadChildren: () => import('./materiaux/materiaux.routes').then(m => m.MATERIAUX_ROUTES)
 * }
 */
export const MATERIAUX_ROUTES: Routes = [
    {
        path: '',
        loadComponent: () => import('./materiaux-list/materiaux-list.component').then((m) => m.StockMateriauxComponent),
        title: 'Matériaux & Stock'
    },
    { path: ':id/lots', component: MateriauLotsComponent }
];
