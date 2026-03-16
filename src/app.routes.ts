import { Routes } from '@angular/router';
import { authGuard } from './app/auth/guards/guards';
import { AppLayout } from './app/layout/component/app.layout';
import { Dashboard } from './app/pages/dashboard/dashboard';
import { Documentation } from './app/pages/documentation/documentation';
import { Landing } from './app/pages/landing/landing';
import { Notfound } from './app/pages/notfound/notfound';
import { AuthCallbackComponent } from './component/auth-callback.component';

export const appRoutes: Routes = [
    // Routes publiques
    { path: 'auth/callback', component: AuthCallbackComponent },
    { path: 'auth', loadChildren: () => import('./app/features/auth/auth.routes') },
    { path: 'landing', component: Landing },
    { path: 'notfound', component: Notfound },

    // Routes protégées sous AppLayout
    {
        path: '',
        component: AppLayout,
        canActivate: [authGuard],
        children: [
            {
                path: '',
                redirectTo: 'dashboard',
                pathMatch: 'full'
            },
            { path: 'dashboard', component: Dashboard },
            { path: 'materiaux', loadChildren: () => import('./app/features/materiaux/materiaux.routes').then(m => m.MATERIAUX_ROUTES) },
            { path: 'uikit', loadChildren: () => import('./app/pages/uikit/uikit.routes') },
            { path: 'pages', loadChildren: () => import('./app/pages/pages.routes') },
            { path: 'documentation', component: Documentation },
        ]
    },

    { path: '**', component: Notfound }
];