import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const authGuard: CanActivateFn = (route) => {
    const router = inject(Router);
    const token = localStorage.getItem('jwt');

    console.log('authGuard — url:', route.url, 'token:', token ? 'présent' : 'absent');

    if (!token) {
        router.navigate(['/authmobile/login']);
        return false;
    }
    return true;
};
