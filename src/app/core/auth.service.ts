import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  // Base API (sesuaikan bila backend di host/port lain)
  private apiUrl = 'http://127.0.0.1:8000/api';

  constructor(private http: HttpClient) {}

  // =========================================================
  // 🔹 LOGIN
  // =========================================================
  login(email: string, password: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/login`, { email, password });
  }

  // =========================================================
  // 🔹 FORGOT PASSWORD (KIRIM EMAIL)
  //   Laravel route: POST /api/forgot-password
  // =========================================================
  requestPasswordReset(email: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/forgot-password`, { email });
  }

  // =========================================================
  // 🔹 RESET PASSWORD (TOKEN DARI MAILTRAP)
  //   Laravel route: POST /api/reset-password
  // =========================================================
  resetPasswordWithToken(
    email: string,
    password: string,
    token: string
  ): Observable<any> {

    const payload = {
      email,
      password,
      token,
      password_confirmation: password // Laravel usually requires it
    };

    return this.http.post(`${this.apiUrl}/reset-password`, payload);
  }

  /**
   * Dipakai halaman forgot-password
   */
  public async sendPasswordResetEmail(email: string): Promise<void> {
    if (!email) {
      throw new Error('Email kosong.');
    }

    try {
      await firstValueFrom(this.requestPasswordReset(email));
    } catch (err) {
      console.error('AuthService.sendPasswordResetEmail error', err);
      throw err;
    }
  }

  // =========================================================
  // 🔹 TOKEN HELPERS
  // =========================================================
  saveToken(token: string): void {
    localStorage.setItem('token', token);
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  isLoggedIn(): boolean {
    return !!localStorage.getItem('token');
  }

  logout(): void {
    localStorage.removeItem('token');
  }

  // =========================================================
  // 🔹 TAMBAH USER (FORM DATA TIDAK DIUBAH)
  // =========================================================
  addUser(): Observable<any> {
    const token = this.getToken();
    if (!token) {
      throw new Error('Token tidak ditemukan. Silakan login ulang.');
    }

    const formData = new FormData();
    formData.append('name', 'Karyawan Baru');
    formData.append('email', 'karyawanbaru@example.com');
    formData.append('password', 'password123');
    formData.append('password_confirmation', 'password123');
    formData.append('role', 'employee');
    formData.append('position', 'Staff IT');
    formData.append('status', 'active');
    formData.append('phone', '081234567890');

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`
    });

    return this.http.post(`${this.apiUrl}/admin/users`, formData, { headers });
  }

  // =========================================================
  // 🔹 GET PROFILE USER
  // =========================================================
  getProfile(): Observable<any> {
    const token = this.getToken();
    if (!token) {
      throw new Error('Token tidak ditemukan. Silakan login ulang.');
    }

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`
    });

    return this.http.get(`${this.apiUrl}/employee/profile`, { headers });
  }

  // =========================================================
  // 🔹 COMMON AUTH HEADER
  // =========================================================
  private getAuthHeaders(): HttpHeaders {
    const token = this.getToken();
    return new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    });
  }
}
