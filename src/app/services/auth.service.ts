import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';


@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://127.0.0.1:8000/api'; // base URL Laravel kamu

  constructor(private http: HttpClient) {}

  // 🔹 Fungsi login
  login(email: string, password: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/login`, { email, password });
  }

  // 🔹 Fungsi tambah user (karyawan baru)
  addUser(token: string): Observable<any> {
    const formData = new FormData();

    formData.append('name', 'Karyawan Baru');
    formData.append('email', 'karyawanbaru@example.com');
    formData.append('password', 'password123');
    formData.append('password_confirmation', 'password123');
    formData.append('role', 'employee');
    formData.append('position', 'Staff IT');
    formData.append('status', 'active');
    formData.append('phone', '081234567890');
    // Jika ingin menambahkan foto, gunakan:
    // formData.append('photo', file);

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`
    });

    return this.http.post(`${this.apiUrl}/admin/users`, formData, { headers });
  }

  // 🔹 Fungsi ambil profil user yang sedang login
  getProfile(token: string): Observable<any> {
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`
    });

    return this.http.get(`${this.apiUrl}/employee/profile`, { headers });
  }
}
