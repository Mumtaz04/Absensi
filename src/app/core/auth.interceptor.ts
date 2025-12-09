// src/app/core/auth.interceptor.ts
import { Injectable } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HTTP_INTERCEPTORS,
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { Router } from '@angular/router';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private auth: AuthService, private router: Router) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return next.handle(req).pipe(
      catchError((err) => {
        // Jika request diberi header X-Background-Sync maka anggap sebagai background job:
        // jangan logout user (sinkronisasi/pending), biarkan service menanganinya.
        const isBackground = req.headers.has('X-Background-Sync') || req.headers.get('X-Background-Sync') === '1';

        // Untuk 401/403: default = logout bagi request UI-critical (tanpa header background)
        if ((err?.status === 401 || err?.status === 403) && !isBackground) {
          try {
            // panggil logout di AuthService jika tersedia
            this.auth.logout?.();
          } catch (e) { /* ignore */ }

          try {
            this.router.navigateByUrl('/login');
          } catch (e) { /* ignore */ }
        } else {
          // Background request gagal: hanya logging agar service bisa retry/cleanup
          console.warn('[AuthInterceptor] background request failed (no logout):', err);
        }

        return throwError(() => err);
      })
    );
  }
}

/**
 * Export provider bernama `authInterceptor` supaya kode lama yang import
 * `authInterceptor` dari './core/auth.interceptor' tetap bekerja.
 */
export const authInterceptor = {
  provide: HTTP_INTERCEPTORS,
  useClass: AuthInterceptor,
  multi: true,
};
