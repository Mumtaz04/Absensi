import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { firstValueFrom } from 'rxjs';


@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://127.0.0.1:8000/api'; // base URL Laravel kamu

  constructor(private http: HttpClient) {}

  // =========================================================
  // 🔹 LOGIN
  // =========================================================
  login(email: string, password: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/login`, { email, password });
  }

    // =========================================================
  // 🔹 PASSWORD RESET (main.trap)
  // =========================================================
  // base URL khusus main.trap (ubah sesuai alamat main.trap kamu)
  private mainTrapBase = 'https://main.trap'; // <-- ganti dengan URL main.trap

  // Minta main.trap untuk mengirimkan email reset (link berisi token)
  requestPasswordReset(email: string): Observable<any> {
    // contoh path: /api/password/forgot — sesuaikan jika back-end main.trap beda
    return this.http.post(`${this.mainTrapBase}/api/password/forgot`, { email });
  }

  // Kirim password baru bersama token yang didapat dari link email
  resetPasswordWithToken(email: string, password: string, token: string): Observable<any> {
    // contoh path: /api/password/reset — sesuaikan jika beda
    return this.http.post(`${this.mainTrapBase}/api/password/reset`, { email, password, token });
  }

  // Simpan token ke localStorage
  saveToken(token: string): void {
    localStorage.setItem('token', token);
  }

  // Ambil token dari localStorage
  getToken(): string | null {
    return localStorage.getItem('token');
  }

  // Cek apakah user sudah login
  isLoggedIn(): boolean {
    return !!localStorage.getItem('token');
  }

  // Logout dan hapus token
  logout(): void {
    localStorage.removeItem('token');
  }

  // =========================================================
  // 🔹 TAMBAH USER (Karyawan Baru)
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

    /**
   * Mengirimkan request reset password.
   * Dipakai oleh komponen yang menggunakan `await this.auth.sendPasswordResetEmail(email)`.
   * Memanggil endpoint main.trap yang sudah kamu definisikan di requestPasswordReset().
   */
  public async sendPasswordResetEmail(email: string): Promise<void> {
    if (!email) {
      throw new Error('Email kosong.');
    }

    try {
      // requestPasswordReset mengembalikan Observable — ubah ke Promise menggunakan firstValueFrom
      await firstValueFrom(this.requestPasswordReset(email));
      // sukses: tidak perlu return value (komponen hanya menunggu resolve)
    } catch (err) {
      // lemparkan kembali agar komponen bisa menanganinya
      console.error('AuthService.sendPasswordResetEmail error', err);
      throw err;
    }
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
  // 🔹 CONTOH REQUEST DENGAN AUTH HEADER UMUM
  // =========================================================
  private getAuthHeaders(): HttpHeaders {
    const token = this.getToken();
    return new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    });
  }
}
