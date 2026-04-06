import { Routes } from '@angular/router';
import { MobileShellComponent } from './shell/mobile-shell.component';

export const MOBILE_ROUTES: Routes = [
    {
        path: '',
        component: MobileShellComponent,
        children: [
            { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
            {
                path: 'dashboard',
                loadComponent: () => import('./dashboard/mobile-dashboard.component').then((m) => m.MobileDashboardComponent),
                title: 'Dashboard'
            },
            {
                path: 'stock',
                loadComponent: () => import('./stock/mobile-stock.component').then((m) => m.MobileStockComponent),
                title: 'Stock'
            },
            {
                path: 'scanner',
                loadComponent: () => import('./scanner/mobile-scanner.component').then((m) => m.MobileScannerComponent),
                title: 'Scanner'
            },
            {
                path: 'reception',
                loadComponent: () => import('./reception/mobile-reception.component').then((m) => m.MobileReceptionComponent),
                title: 'Réception'
            },
            {
                path: 'fabrication',
                loadComponent: () => import('./fabrication/mobile-fabrication.component').then((m) => m.MobileFabricationComponent),
                title: 'Fabrication'
            },
            {
                path: 'ajustement',
                loadComponent: () => import('./ajustement/mobile-ajustement.component').then((m) => m.MobileAjustementComponent),
                title: 'Ajustement'
            },
            {
                path: 'commandes',
                loadComponent: () => import('./commandes/mobile-commandes.component').then((m) => m.MobileCommandesComponent),
                title: 'Commandes'
            }
        ]
    }
];
