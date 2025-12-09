import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { BehaviorSubject } from 'rxjs';

export interface AppUser {
  id?: number;
  name?: string;
  email?: string;
  position?: string;
  photo?: string;
  photo_url?: string;
  [key: string]: any;
}

const STORAGE_KEY = 'app_user_v1';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private baseUrl = environment.apiUrl; // pastikan value ini sesuai (tanpa /api ganda)

  // BehaviorSubject: komponen lain bisa subscribe untuk sinkronisasi
  private userSubject = new BehaviorSubject<AppUser | null>(this.loadFromStorage());
  public user$ = this.userSubject.asObservable();

  constructor(private http: HttpClient) {}

  // ---------------- API methods (tetap ada) ----------------
  checkIn(data: any) {
    const token = localStorage.getItem('token') ?? '';
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    return this.http.post(`${this.baseUrl}/api/employee/check-in`, data, { headers });
  }

  checkOut(data: any) {
    const token = localStorage.getItem('token') ?? '';
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    return this.http.post(`${this.baseUrl}/api/employee/check-out`, data, { headers });
  }

  updateProfilePhoto(formData: FormData) {
    const token = localStorage.getItem('token') ?? '';
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    return this.http.post<any>(`${this.baseUrl}/api/user/photo`, formData, { headers });
  }

  // ---------------- Shared state helpers ----------------
  // set seluruh user object
  setUser(user: AppUser | null) {
    this.userSubject.next(user);
    this.saveToStorage(user);
  }

  // update hanya foto (dipanggil setelah upload sukses)
  setPhoto(photoPathOrUrl: string | null) {
    const current = { ...(this.userSubject.value ?? {}) } as AppUser;
    if (photoPathOrUrl) {
      current.photo = photoPathOrUrl;
      current.photo_url = photoPathOrUrl;
    } else {
      delete current.photo;
      delete current.photo_url;
    }
    this.userSubject.next(current);
    this.saveToStorage(current);
  }

  getCurrentUser(): AppUser | null {
    return this.userSubject.value;
  }

  clear() {
    this.userSubject.next(null);
    localStorage.removeItem(STORAGE_KEY);
  }

  // ---------------- persistence ----------------
  private saveToStorage(user: AppUser | null) {
    try {
      if (user) localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
      else localStorage.removeItem(STORAGE_KEY);
    } catch (e) { /* ignore */ }
  }

  private loadFromStorage(): AppUser | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }
}
