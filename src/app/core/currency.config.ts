import { environment } from '@/environments/environment';

/**
 * Lit le claim `currency` depuis le JWT stocké en localStorage.
 * Appelé une seule fois au démarrage du module — la devise ne change
 * que lors d'une nouvelle installation marchand (nouveau JWT émis).
 */
function readCurrencyFromJwt(): string {
    try {
        const token = localStorage.getItem('jwt');
        if (!token) return environment.currency;
        const payload = JSON.parse(atob(token.split('.')[1]));
        const c = payload?.currency;
        return c && c.length >= 3 ? c.toUpperCase() : environment.currency;
    } catch {
        return environment.currency;
    }
}

/**
 * Locale BCP 47 associée au code ISO 4217.
 * Utilisée par le CurrencyPipe Angular pour le séparateur et le symbole.
 */
function localeForCurrency(currency: string): string {
    const map: Record<string, string> = {
        EUR: 'fr-FR',
        USD: 'en-US',
        GBP: 'en-GB',
        CHF: 'fr-CH',
        CAD: 'fr-CA',
        AED: 'ar-AE',
        MAD: 'fr-MA',
        XAF: 'fr-FR',
        XOF: 'fr-FR'
    };
    return map[currency] ?? 'fr-FR';
}

export const APP_CURRENCY: string = readCurrencyFromJwt();
export const APP_CURRENCY_LOCALE: string = localeForCurrency(APP_CURRENCY);
