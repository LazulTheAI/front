import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { APP_INITIALIZER, ApplicationConfig, LOCALE_ID, isDevMode } from '@angular/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter, withInMemoryScrolling, withRouterConfig } from '@angular/router';
import { provideTransloco } from '@jsverse/transloco';
import Aura from '@primeuix/themes/aura';
import { providePrimeNG } from 'primeng/config';
import { firstValueFrom } from 'rxjs';
import { appRoutes } from './app.routes';
import { authInterceptor } from './app/auth/auth.interceptor';
import { AuthApiService } from './app/auth/services/api/auth.service';
import { SubscriptionService } from './app/core/subscription.service';
import { TranslocoHttpLoader } from './app/core/transloco-loader';
import { BASE_PATH } from './app/modules/openapi';
import { environment } from './environments/environment';

export const appConfig: ApplicationConfig = {
    providers: [
        provideRouter(appRoutes, withInMemoryScrolling({ anchorScrolling: 'enabled', scrollPositionRestoration: 'enabled' }), withRouterConfig({ onSameUrlNavigation: 'reload' })),
        provideHttpClient(withFetch(), withInterceptors([authInterceptor])),
        provideAnimationsAsync(),
        providePrimeNG({ theme: { preset: Aura, options: { darkModeSelector: '.app-dark' } } }),
        { provide: BASE_PATH, useValue: environment.baseUrl },

        {
            provide: APP_INITIALIZER,
            useFactory: (sub: SubscriptionService, auth: AuthApiService) => () => {
                console.log('APP_INITIALIZER — token:', auth.getToken() ? 'présent' : 'absent');
                if (!auth.getToken()) return Promise.resolve(null);
                console.log('APP_INITIALIZER — appel load()');
                return firstValueFrom(sub.load(), { defaultValue: null }).catch((err) => {
                    console.error('APP_INITIALIZER load() error:', err);
                    return null;
                });
            },
            deps: [SubscriptionService, AuthApiService],
            multi: true
        },
        {
            provide: LOCALE_ID,
            useFactory: (authService: AuthApiService) => authService.getDefaultLang(),
            deps: [AuthApiService]
        },
        provideTransloco({
            config: {
                availableLangs: ['fr', 'en', 'es'],
                defaultLang: (localStorage.getItem('lang') as 'fr' | 'en' | 'es') ?? 'fr',
                reRenderOnLangChange: true,
                prodMode: !isDevMode()
            },
            loader: TranslocoHttpLoader
        })
    ]
};
