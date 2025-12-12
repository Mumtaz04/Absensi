import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class PresensiService {

  private apiUrl = 'http://127.0.0.1:8000/api/employee'; // ✅ sesuai prefix Laravel

  constructor(private http: HttpClient) {}

  /**
   * Membuat header autentikasi.
   * Jika token tidak ada, header Authorization akan berisi string kosong.
   * Jika ingin mengirim FormData di masa depan, hindari men-set 'Content-Type' sehingga browser
   * dapat menambahkan boundary secara otomatis.
   */
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

  /** ✅ Check-In */
  checkIn(latitude: number, longitude: number): Observable<any> {
    // ===============================
    // MODE TESTING (UNTUK LOCALHOST)
    // Hapus atau comment block ini jika sudah di perangkat HP
    // ===============================
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      console.warn('🧭 Mode Testing Aktif: gunakan lokasi kantor simulasi.');
      // Contoh koordinat kantor (ganti sesuai lokasi sebenarnya)
      latitude = -7.037943980089189;   // koordinat kantor
      longitude = 110.47993371532893; // koordinat kantor
    }
    // ===============================

    const body = { latitude, longitude };
    return this.http.post(`${this.apiUrl}/check-in`, body, { headers: this.getHeaders(false) })
      .pipe(
        catchError(err => {
          console.error('Gagal check-in:', err);
          return throwError(() => err);
        })
      );
  }

  /** ✅ Check-Out */
  checkOut(latitude: number, longitude: number): Observable<any> {
    // ===============================
    // MODE TESTING (UNTUK LOCALHOST)
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      console.warn('🧭 Mode Testing Aktif: gunakan lokasi kantor simulasi.');
      latitude = -7.037943980089189; // koordinat kantor
      longitude = 110.47993371532893; // koordinat kantor
    }
    // ===============================

    const body = { latitude, longitude };
    return this.http.post(`${this.apiUrl}/check-out`, body, { headers: this.getHeaders(false) })
      .pipe(
        catchError(err => {
          console.error('Gagal check-out:', err);
          return throwError(() => err);
        })
      );
  }

  /** ✅ Ambil Riwayat Presensi */
  getRiwayatPresensi(): Observable<any> {
    return this.http.get(`${this.apiUrl}/attendances/history`, { headers: this.getHeaders(false) })
      .pipe(
        catchError(err => {
          console.error('Gagal mengambil riwayat presensi:', err);
          return throwError(() => err);
        })
      );
  }
}
