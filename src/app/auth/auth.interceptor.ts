import { AuthApiService } from '@/app/auth/services/api/auth.service';
import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { EMPTY, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
    const authService = inject(AuthApiService);
    const router = inject(Router);

    // Skip pour les endpoints sans auth
    const skipUrls = [
        '/auth/login',
        '/auth/refresh',
        '/auth/load',
        '/api/bc/', // ← BigCommerce OAuth
        '/api/mobile/auth/login',
        '/api/subscription' // ← ajoute ça
    ];

    if (skipUrls.some((url) => req.url.includes(url))) {
        return next(req);
    }

    const token = authService.getToken();

    if (!token) {
        // Ne pas throw, juste laisser passer — le backend renverra 401
        // et l'utilisateur sera redirigé proprement
        router.navigate(['/authmobile/login']);
        return EMPTY; // ← import { EMPTY } from 'rxjs'
    }

    req = req.clone({
        setHeaders: { Authorization: `Bearer ${token}` }
    });

    return next(req).pipe(
        catchError((error) => {
            if (error.status === 401) {
                authService.logout();
                router.navigate(['/authmobile/login']);
                return EMPTY; // ← au lieu de throwError
            }
            return throwError(() => error);
        })
    );
};
