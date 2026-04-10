import { AuthApiService } from '@/app/auth/services/api/auth.service';
import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, EMPTY, throwError } from 'rxjs';
import { catchError, filter, switchMap, take } from 'rxjs/operators';

let refreshing = false;
const refreshSubject = new BehaviorSubject<string | null>(null);

export const authInterceptor: HttpInterceptorFn = (req, next) => {
    const authService = inject(AuthApiService);
    const router = inject(Router);

    const skipUrls = ['/auth/login', '/auth/refresh', '/auth/load', '/api/bc/', '/api/mobile/auth/login', '/api/subscription'];

    if (skipUrls.some((url) => req.url.includes(url))) {
        return next(req);
    }

    const token = authService.getToken();

    if (!token) {
        router.navigate(['/authmobile/login']);
        return EMPTY;
    }

    const authReq = req.clone({
        setHeaders: { Authorization: `Bearer ${token}` }
    });

    return next(authReq).pipe(
        catchError((error) => {
            if (error.status !== 401) {
                return throwError(() => error);
            }

            // Tentative de refresh
            if (refreshing) {
                // Attendre que le refresh en cours se termine
                return refreshSubject.pipe(
                    filter((t) => t !== null),
                    take(1),
                    switchMap((newToken) =>
                        next(
                            req.clone({
                                setHeaders: { Authorization: `Bearer ${newToken}` }
                            })
                        )
                    )
                );
            }

            refreshing = true;
            refreshSubject.next(null);

            return authService.refresh().pipe(
                switchMap((response) => {
                    refreshing = false;
                    refreshSubject.next(response.accessToken); // ← extraire le string
                    return next(
                        req.clone({
                            setHeaders: { Authorization: `Bearer ${response.accessToken}` }
                        })
                    );
                }),
                catchError((refreshError) => {
                    refreshing = false;
                    authService.logout();
                    router.navigate(['/authmobile/login']);
                    return EMPTY;
                })
            );
        })
    );
};
