import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';

// ✅ Tambahan untuk format tanggal Indonesia
import { LOCALE_ID } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeId from '@angular/common/locales/id';

registerLocaleData(localeId);

bootstrapApplication(AppComponent, {
  providers: [
    ...appConfig.providers,
    { provide: LOCALE_ID, useValue: 'id-ID' }  // ✅ Format tanggal pakai locale Indonesia
  ]
});