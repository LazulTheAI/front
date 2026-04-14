// src/environments/environment.prod.ts
// La valeur de apiUrl est remplacée au build par la variable Netlify.
// Dans Netlify UI : Site settings → Environment variables
//   API_URL = https://ton-backend.railway.app

export const environment = {
    production: true,
    apiUrl: 'https://makerstocks.com',
    currency: 'EUR',
    currencyLocale: 'fr-FR'
};
