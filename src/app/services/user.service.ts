import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { BehaviorSubject, Observable } from 'rxjs';

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
  /**
   * environment.apiUrl seharusnya berisi base host, boleh dengan atau tanpa suffix '/api'.
   * Contoh yang valid:
   *  - http://127.0.0.1:8000
   *  - https://api.example.com/api
   */
  private baseUrl = environment.apiUrl || '';

  // BehaviorSubject: komponen lain bisa subscribe untuk sinkronisasi
  private userSubject = new BehaviorSubject<AppUser | null>(this.loadFromStorage());
  public user$ = this.userSubject.asObservable();

  constructor(private http: HttpClient) {}

  // ---------------- Helpers ----------------
  private buildUrl(path: string) {
    // pastikan tidak terjadi double slash atau double "/api"
    // path boleh dikirimkan dalam bentuk 'employee/check-in' atau '/employee/check-in'
    // Jika baseUrl berakhir dengan '/api' dan path dimulai dengan 'api/', kita strip salah satu.
    const trimmedBase = this.baseUrl.replace(/\/+$/, ''); // trim trailing slash(es)
    let trimmedPath = path.replace(/^\/+/, ''); // trim leading slash(es)

    // Jika base mengandung '/api' dan path dimulai dengan 'api/', hapus prefix path 'api/'
    if (/\/api$/i.test(trimmedBase) && /^api\//i.test(trimmedPath)) {
      trimmedPath = trimmedPath.replace(/^api\//i, '');
    }

    // Jika base tidak mengandung '/api' dan path dimulai dengan 'api/', biarkan (karena path eksplisit)
    return `${trimmedBase}/${trimmedPath}`;
  }

  private authHeaders(): { headers: HttpHeaders } {
    const token = localStorage.getItem('token') ?? '';
    const headers = new HttpHeaders({
      Authorization: token ? `Bearer ${token}` : '',
    });
    return { headers };
  }

  // ---------------- API methods ----------------
  // semua method mengembalikan Observable sehingga caller bisa subscribe / firstValueFrom

  checkIn(data: any): Observable<any> {
    return this.http.post(this.buildUrl('api/employee/check-in'), data, this.authHeaders());
  }

  checkOut(data: any): Observable<any> {
    return this.http.post(this.buildUrl('api/employee/check-out'), data, this.authHeaders());
  }

  /**
   * Upload foto profil
   * - formData disiapkan oleh caller (nama field tidak diubah)
   * - endpoint disesuaikan: gunakan path relatif, helper buildUrl menangani base
   */
  updateProfilePhoto(formData: FormData): Observable<any> {
    // Perhatikan: beberapa backend mengharapkan 'multipart/form-data' tanpa header Content-Type eksplisit
    // (HttpClient akan mengatur boundary otomatis). Jadi kita hanya menyertakan Authorization header.
    return this.http.post<any>(this.buildUrl('api/user/photo'), formData, this.authHeaders());
  }

  // ---------------- Shared state helpers ----------------
  // set seluruh user object
  setUser(user: AppUser | null) {
    this.userSubject.next(user);
    this.saveToStorage(user);
  }

  // update hanya foto (dipanggil setelah upload sukses)
// di src/app/services/user.service.ts — ganti setPhoto dengan ini
setPhoto(photoPathOrUrl: string | null) {
  const current = { ...(this.userSubject.value ?? {}) } as AppUser;

  // helper lokal untuk normalisasi
  const normalize = (p: string) => {
    if (!p) return null;
    const s = p.toString().trim();
    if (!s) return null;
    // data URI / blob -> return as-is
    if (/^data:|^blob:/.test(s)) return s;
    // jika http(s) absolut -> perbaiki /api/storage -> /storage
    if (/^https?:\/\//i.test(s)) {
      return s.replace(/\/api\/storage\//i, '/storage/');
    }
    // kalau relatif seperti "photos/..." atau "storage/photos/..." -> prefix baseUrl
    let clean = s.replace(/^\/+/, '');
    // jika mulai dengan 'photos/' -> gunakan storage/photos/
    if (/^photos\//i.test(clean)) {
      clean = clean.replace(/^photos\//i, 'storage/photos/');
    }
    // jika path dimulai dengan 'api/storage/' -> ubah ke storage/
    clean = clean.replace(/^api\/storage\//i, 'storage/');
    // jika sudah 'storage/...' biarkan; sekarang gabungkan dengan base
    const base = this.baseUrl.replace(/\/+$/, '');
    return `${base}/${clean}`;
  };

  try {
    if (photoPathOrUrl) {
      const normalized = normalize(photoPathOrUrl);
      if (normalized) {
        current.photo = normalized;
        current.photo_url = normalized;
        // simpan ke storage: jika data URI simpan ke profileImageBase64, else ke profileImageUrl
        if (/^data:/.test(normalized)) {
          localStorage.setItem('profileImageBase64', normalized);
          localStorage.removeItem('profileImageUrl');
        } else {
          localStorage.setItem('profileImageUrl', normalized);
          localStorage.removeItem('profileImageBase64');
        }
      } else {
        // fallback: simpan original raw
        current.photo = photoPathOrUrl;
        current.photo_url = photoPathOrUrl;
      }
    } else {
      delete current.photo;
      delete current.photo_url;
      try { localStorage.removeItem('profileImageUrl'); localStorage.removeItem('profileImageBase64'); } catch(e) {}
    }
  } catch (e) {
    // jika ada error, tetap lanjutkan dengan raw value
    if (photoPathOrUrl) {
      current.photo = photoPathOrUrl;
      current.photo_url = photoPathOrUrl;
    } else {
      delete current.photo;
      delete current.photo_url;
    }
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
    try {
      localStorage.removeItem('profileImageUrl');
      localStorage.removeItem('profileImageBase64');
    } catch (e) {}
  }

  // ---------------- persistence ----------------
  private saveToStorage(user: AppUser | null) {
    try {
      if (user) localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
      else localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      // ignore storage errors
      console.warn('UserService.saveToStorage error', e);
    }
  }

  private loadFromStorage(): AppUser | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      console.warn('UserService.loadFromStorage error', e);
      return null;
    }
  }
}
