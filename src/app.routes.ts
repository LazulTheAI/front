import { Routes } from '@angular/router';
import { AppLayout } from './app/layout/component/app.layout';
import { Dashboard } from './app/pages/dashboard/dashboard';
import { Documentation } from './app/pages/documentation/documentation';
import { Landing } from './app/pages/landing/landing';
import { Notfound } from './app/pages/notfound/notfound';

export const appRoutes: Routes = [
    { 
        path: '', 
        redirectTo: () => {
            const token = localStorage.getItem('auth_token');
            return token ? '/dashboard' : '/auth/login';
        }, 
        pathMatch: 'full' 
    },
    {
        path: 'dashboard',
        component: AppLayout,
        children: [
            { path: '', component: Dashboard }
        ]
    },
    {
        path: 'uikit',
        component: AppLayout,
        children: [
            { path: '', loadChildren: () => import('./app/pages/uikit/uikit.routes') }
        ]
    },
    {
        path: 'pages',
        component: AppLayout,
        children: [
            { path: '', loadChildren: () => import('./app/pages/pages.routes') }
        ]
    },
    {
        path: 'documentation',
        component: AppLayout,
        children: [
            { path: '', component: Documentation }
        ]
    },
    { path: 'landing', component: Landing },
    { path: 'notfound', component: Notfound },
    { path: 'auth', loadChildren: () => import('./app/features/auth/auth.routes') },
    { path: '**', component: Notfound }
];