import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { APP_INITIALIZER, ApplicationConfig, LOCALE_ID, isDevMode } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { SubscriptionService } from './app/core/subscription.service';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter, withEnabledBlockingInitialNavigation, withInMemoryScrolling } from '@angular/router';
import { provideTransloco } from '@jsverse/transloco';
import Aura from '@primeuix/themes/aura';
import { providePrimeNG } from 'primeng/config';
import { TranslocoHttpLoader } from './app/core/transloco-loader';
import { appRoutes } from './app.routes';
import { authInterceptor } from './app/auth/auth.interceptor';
import { AuthApiService } from './app/auth/services/api/auth.service';

export const appConfig: ApplicationConfig = {
    providers: [
        provideRouter(appRoutes, withInMemoryScrolling({ anchorScrolling: 'enabled', scrollPositionRestoration: 'enabled' }), withEnabledBlockingInitialNavigation()),
        provideHttpClient(withFetch(), withInterceptors([authInterceptor])),
        provideAnimationsAsync(),
        providePrimeNG({ theme: { preset: Aura, options: { darkModeSelector: '.app-dark' } } }),
        {
            provide: APP_INITIALIZER,
            useFactory: (sub: SubscriptionService) => () =>
                firstValueFrom(sub.load(), { defaultValue: null }).catch(() => null),
            deps: [SubscriptionService],
            multi: true,
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
