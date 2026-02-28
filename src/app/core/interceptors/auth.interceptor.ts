
import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { AuthApiService } from '@/app/auth/services/api/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
    const authService = inject(AuthApiService);
    const router = inject(Router);
    const token = authService.getToken();

    // Skip interceptor logic for auth endpoints (login, register, refresh)
    if (req.url.includes('/auth/login') || req.url.includes('/auth/register') || req.url.includes('/auth/refresh')) {
        return next(req).pipe(
            catchError((error) => {
                return throwError(() => error);
            })
        );
    }

    // If no token and trying to access protected routes, redirect to login
    if (!token) {
        router.navigate(['/auth/login']);
        return throwError(() => new Error('No authentication token found'));
    }

    // Clone request and add Authorization header with Bearer token
    req = req.clone({
        setHeaders: {
            Authorization: `Bearer ${token}`
        }
    });

    return next(req).pipe(
        catchError((error) => {
            // If 401 Unauthorized, clear localStorage and redirect to login
            if (error.status === 401) {
                authService.logout();
                router.navigate(['/auth/login']);
                return throwError(() => new Error('Session expired. Please login again.'));
            }
            return throwError(() => error);
        })
    );
};