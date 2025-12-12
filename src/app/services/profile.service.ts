import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class ProfileService {
  private baseUrl = 'http://127.0.0.1:8000/api/employee';

  constructor(private http: HttpClient) {}

  private getHeaders(contentIsFormData = false): HttpHeaders {
    const token = localStorage.getItem('token') ?? '';
    let headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    });

    if (!contentIsFormData) {
      headers = headers.set('Content-Type', 'application/json');
    }

    return headers;
  }

  updateProfile(payload: any, isFormData = false): Observable<any> {
    const headers = this.getHeaders(isFormData);

    return this.http.post(`${this.baseUrl}/profile`, payload, { headers })
      .pipe(
        catchError(err => {
          console.error(isFormData ? 'Gagal update profile (FormData):' : 'Gagal update profile (JSON):', err);
          return throwError(() => err);
        })
      );
  }

  getProfile(): Observable<any> {
    const headers = this.getHeaders(false);
    return this.http.get(`${this.baseUrl}/profile`, { headers })
      .pipe(
        catchError(err => {
          console.error('Gagal mengambil profil:', err);
          return throwError(() => err);
        })
      );
  }
}
