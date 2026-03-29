import { registerLocaleData } from '@angular/common';
import localeEn from '@angular/common/locales/en';
import localeFr from '@angular/common/locales/fr';
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app.component';
import { appConfig } from './app.config';

registerLocaleData(localeFr);
registerLocaleData(localeEn);

bootstrapApplication(AppComponent, appConfig).catch((err) => console.error(err));
