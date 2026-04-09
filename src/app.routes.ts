import { Routes } from '@angular/router';
import { AuthCallbackComponent } from './app/auth/auth-callback.component';
import { BcAuthComponent } from './app/auth/big-commerce/bc-load/bc-auth.component';
import { BcLoadComponent } from './app/auth/big-commerce/bc-load/bc-load.component';
import { BillingPendingComponent } from './app/auth/big-commerce/bc-load/billing-pending.component';
import { authGuard } from './app/auth/guards/guards';
import { AppLayout } from './app/layout/component/app.layout';
import { Notfound } from './app/pages/notfound/notfound';

export const appRoutes: Routes = [
    // Routes publiques
    { path: 'auth/callback', component: AuthCallbackComponent },
    { path: 'authmobile', loadChildren: () => import('./app/features/auth/auth.routes') },
    { path: 'auth', component: BcAuthComponent },
    { path: 'notfound', component: Notfound },
    { path: 'load', component: BcLoadComponent },
    {
        path: 'billing/pending',
        component: BillingPendingComponent
    },

    // Routes protégées sous AppLayout
    {
        path: '',
        component: AppLayout,
        canActivate: [authGuard],
        children: [
            {
                path: '',
                redirectTo: 'alertes',
                pathMatch: 'full'
            },
            { path: 'materiaux', loadChildren: () => import('./app/features/materiaux/materiaux.routes').then((m) => m.MATERIAUX_ROUTES) },
            { path: 'recettes', loadChildren: () => import('./app/features/recettes/recettes.routes').then((r) => r.RECETTES_ROUTES) },
            { path: 'production', loadChildren: () => import('./app/features/production/production.routes').then((m) => m.PRODUCTION_ROUTES) },
            { path: 'lieux-production', loadChildren: () => import('./app/features/lieux-production/lieux-production.routes').then((m) => m.LIEUX_PRODUCTION_ROUTES) },
            { path: 'utilisateurs', loadChildren: () => import('./app/features/mon-equipe/mon-equipe.routes').then((m) => m.MON_EQUIPE_ROUTES) },
            { path: 'produits', loadChildren: () => import('./app/features/produits/produits.routes').then((m) => m.PRODUITS_ROUTES) },
            { path: 'fournisseurs', loadChildren: () => import('./app/features/fournisseurs/fournisseurs.routes').then((m) => m.FOURNISSEURS_ROUTES) },
            { path: 'bons-commande', loadChildren: () => import('./app/features/bons-commande/bons-commande.routes').then((m) => m.BONS_COMMANDE_ROUTES) },
            { path: 'rapports', loadChildren: () => import('./app/features/rapport/prapports.routes').then((m) => m.RAPPORT_ROUTES) },
            { path: 'alertes', loadChildren: () => import('./app/features/alerte/alertes.routes').then((m) => m.Alerte_ROUTES) },
            { path: 'revendeurs', loadChildren: () => import('./app/features/revendeurs/revendeurs.routes').then((m) => m.REVENDEURS_ROUTES) },
            { path: 'import', loadChildren: () => import('./app/features/import-data/import.routes').then((m) => m.IMPORT_ROUTES) },
            { path: 'commandes-b2b', loadChildren: () => import('./app/features/commande/commandes-b2b.routes').then((m) => m.COMMANDES_B2B_ROUTES) },
            { path: 'upgrade', loadComponent: () => import('./app/pages/upgrade/upgrade.component').then((m) => m.UpgradeComponent), title: 'Choisir un plan' }
        ]
    },

    // Module mobile (shell propre, sans AppLayout desktop)
    {
        path: 'mobile',
        canActivate: [authGuard],
        loadChildren: () => import('./app/modules/mobile/mobile.routes').then((m) => m.MOBILE_ROUTES)
    },

    { path: '**', component: Notfound }
];
