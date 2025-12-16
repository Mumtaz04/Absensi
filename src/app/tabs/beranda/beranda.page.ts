import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { Subscription, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AttendanceService } from '../../services/attendance.service';
import { UserService, AppUser } from '../../services/user.service';


// ⬇️ TAMBAHKAN DI SINI
interface MonthlyStats {
  hadir: number;
  terlambat: number;
  cuti: number;
  alfa: number;
}

@Component({
  selector: 'app-beranda',
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule],
  templateUrl: './beranda.page.html',
  styleUrls: ['./beranda.page.scss'],
})
export class BerandaPage implements OnInit, OnDestroy {
  user: AppUser | null = null;
  apiUrl = 'http://127.0.0.1:8000';
  userPhotoUrl = 'assets/icon/default-profile.png';

  statusPresensi = {
    status: 'belum' as 'belum' | 'hadir' | 'selesai' | 'hadir_tepat' | 'hadir_telat',
    jamCheckin: null as string | null,
    jamCheckout: null as string | null,
    pesan: 'Anda belum presensi, mohon presensi sekarang.'
  };

    // ⬇️ TAMBAHKAN DI SINI
  monthlyStats: MonthlyStats = {
    hadir: 0,
    terlambat: 0,
    cuti: 0,
    alfa: 0,
  };

  private sub: Subscription | null = null;
  private destroy$ = new Subject<void>();

  constructor(
    private http: HttpClient,
    private router: Router,
    private attendanceSvc: AttendanceService,
    private cd: ChangeDetectorRef,
    private userSvc: UserService
  ) {}

  ngOnInit() {
    // Jika ada user cached di service gunakan segera
    const cached = this.userSvc.getCurrentUser();
    if (cached) {
      this.user = cached;
      this.updatePhotoFromUser(cached);
      try { this.cd.markForCheck(); } catch {}
    }

    // tetap subscribe ke user changes
    this.userSvc.user$
      .pipe(takeUntil(this.destroy$))
      .subscribe(u => {
        if (u) {
          this.user = u;
          this.updatePhotoFromUser(u);
          try { this.cd.markForCheck(); } catch {}
          return;
        }

        // bila user null -> coba fallback ke localStorage
        const cachedFromStorage = localStorage.getItem('profileImageUrl') || localStorage.getItem('profileImageBase64');
        if (cachedFromStorage) {
          this.userPhotoUrl = this.normalizePhotoCandidate(cachedFromStorage);
          try { this.cd.markForCheck(); } catch {}
        }
      });

    this.loadStatusHariIni();
    this.loadMonthlyStats(); // ✅ BENAR DI SINI

    // subscribe presensi change
    this.sub = this.attendanceSvc.presensiChanged$.subscribe(() => {
      this.loadStatusHariIni();
    });
  }

  // Penting: jalankan setiap kali halaman muncul (Ionic tab lifecycle)
  ionViewWillEnter() {
    // cek localStorage terlebih dahulu - panggilan ini akan menampilkan gambar segera
    const cachedImage = localStorage.getItem('profileImageUrl') || localStorage.getItem('profileImageBase64');
    if (cachedImage) {
      this.userPhotoUrl = this.normalizePhotoCandidate(cachedImage);
      console.log('ionViewWillEnter using cachedImage ->', this.userPhotoUrl);
      try { this.cd.markForCheck(); } catch {}
    } else {
      // jika tidak ada cached image, dan service juga kosong, muat dari API
      if (!this.userSvc.getCurrentUser()) {
        this.loadUserData();
      }
    }
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ---------------- util helper ----------------
  // Normalize candidate (relative -> absolute), handle /api/storage -> /storage and add cache-buster
private normalizePhotoCandidate(candidate: string | null | undefined): string {
  if (!candidate) return 'assets/icon/default-profile.png';
  const s = candidate.toString().trim();
  if (!s) return 'assets/icon/default-profile.png';

  if (/^data:|^blob:/.test(s)) return s;

  // absolut http(s)
  if (/^https?:\/\//i.test(s)) {
    let url = s.replace(/\/api\/storage\//i, '/storage/');
    const sep = url.includes('?') ? '&' : '?';
    return `${url}${sep}t=${Date.now()}`;
  }

  // relatif: tangani 'photos/..' atau 'storage/photos/..' atau 'api/storage/...'
  let clean = s.replace(/^\/+/, '');
  if (/^photos\//i.test(clean)) {
    clean = clean.replace(/^photos\//i, 'storage/photos/');
  }
  clean = clean.replace(/^api\/storage\//i, 'storage/').replace(/^storage\//i, 'storage/');
  const base = this.apiUrl.replace(/\/+$/, '');
  return `${base}/${clean}?t=${Date.now()}`;
}


  // ---------------- load user (dipakai saat init jika service kosong) ----------------
  loadUserData() {
    const token = localStorage.getItem('token');
    if (!token) return;

    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });

    this.http.get(`${this.apiUrl}/api/user`, { headers }).subscribe({
      next: (response: any) => {
        const fetched = response.data ?? response.user ?? response;
        if (fetched) {
          // broadcast ke seluruh app lewat UserService
          this.userSvc.setUser(fetched);

          // simpan candidate photo ke storage (normalisasi)
          try {
            const candidate = (fetched.photo ?? fetched.photo_url ?? null);
            if (candidate) {
              const normalized = this.normalizePhotoCandidate(candidate.toString());
              localStorage.setItem('profileImageUrl', normalized);
            }
          } catch (e) { /* ignore */ }

          // update view
          this.user = fetched;
          this.updatePhotoFromUser(fetched);
          try { this.cd.markForCheck(); } catch {}
        }
      },
      error: (err) => {
        console.error('❌ Gagal memuat data user:', err);
      },
    });
  }

  // ---------------- update photo helper (robust) ----------------
  private updatePhotoFromUser(u: AppUser | null) {
    try {
      const rawCandidate = (u?.photo ?? u?.photo_url ?? '')?.toString().trim() ?? '';
      console.log('updatePhotoFromUser rawCandidate ->', rawCandidate);

      // prefer candidate from user, fallback to localStorage
      const fallback = localStorage.getItem('profileImageUrl') || localStorage.getItem('profileImageBase64') || '';

      let finalUrl = 'assets/icon/default-profile.png';

      if (rawCandidate) {
        finalUrl = this.normalizePhotoCandidate(rawCandidate);
      } else if (fallback) {
        finalUrl = this.normalizePhotoCandidate(fallback);
      }

      console.log('updatePhotoFromUser finalUrl ->', finalUrl);
      this.userPhotoUrl = finalUrl;
      try { this.cd.markForCheck(); } catch (e) { /* ignore */ }
    } catch (e) {
      console.warn('updatePhotoFromUser error', e);
      this.userPhotoUrl = 'assets/icon/default-profile.png';
      try { this.cd.markForCheck(); } catch(e) {}
    }
  }

  // ---------------- remaining methods (status presensi, util, navigasi) ----------------
  async loadStatusHariIni() {
    
    const token = localStorage.getItem('token');
    if (!token) return;

    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });

    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    this.http
      .get(`${this.apiUrl}/api/employee/attendances/history?month=${month}&year=${year}`, { headers })
      .subscribe({
        next: (res: any) => {
          const list = res?.data ?? res ?? [];
          const today = new Date().toISOString().slice(0, 10);
          const todayRecord = list.find((x: any) =>
            (x.date && x.date === today) || (x.check_in && x.check_in.startsWith(today))
          );

          if (!todayRecord) {
            this.statusPresensi = {
              status: 'belum',
              jamCheckin: null,
              jamCheckout: null,
              pesan: 'Anda belum presensi, mohon presensi sekarang.'
            };
            try { this.cd.markForCheck(); } catch {}
            return;
          }

          this.statusPresensi.jamCheckin = this.formatTime(todayRecord.check_in);

          const jamKerja = new Date();
          jamKerja.setHours(9, 0, 0, 0);
          const waktuCheckin = new Date(todayRecord.check_in);

          if (waktuCheckin <= jamKerja) {
            this.statusPresensi.status = 'hadir_tepat';
            this.statusPresensi.pesan = 'Tepat waktu, selamat bekerja!';
          } else {
            this.statusPresensi.status = 'hadir_telat';
            this.statusPresensi.pesan = 'Anda terlambat presensi.';
          }

          if (todayRecord.check_out) {
            this.statusPresensi.status = 'selesai';
            this.statusPresensi.jamCheckout = this.formatTime(todayRecord.check_out);
            this.statusPresensi.pesan = 'Presensi hari ini sudah selesai.';
          }

          try { this.cd.markForCheck(); } catch {}
        },
        error: (err) => {
          console.error('❌ Error loadStatusHariIni:', err);
        }
      });
  }

  // =====================
// 📊 LOAD STATISTIK BULANAN
// =====================
loadMonthlyStats() {
  const token = localStorage.getItem('token');
  if (!token) return;

  const headers = new HttpHeaders({
    Authorization: `Bearer ${token}`
  });

  this.http
    .get(`${this.apiUrl}/api/employee/stats`, { headers })
    .subscribe({
      next: (res: any) => {
        const data = res?.data ?? res;

        this.monthlyStats = {
          hadir: data?.hadir ?? 0,
          terlambat: data?.terlambat ?? 0,
          cuti: data?.cuti ?? 0,
          alfa: data?.alfa ?? 0,
        };

        try { this.cd.markForCheck(); } catch {}
      },
      error: (err) => {
        console.error('❌ Gagal load statistik bulanan:', err);
      }
    });
}


  formatTime(datetime: string | null): string | null {
    if (!datetime) return null;
    const d = new Date(datetime);
    return `${String(d.getHours()).padStart(2,'0')}.${String(d.getMinutes()).padStart(2,'0')}`;
  }

  onPhotoError(event: Event) {
    const img = event.target as HTMLImageElement;
    if (img.dataset['fallback'] === 'true') return;
    img.dataset['fallback'] = 'true';

    img.src = 'data:image/svg+xml;utf8,' + encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">
         <rect width="100%" height="100%" fill="#eaeaea"/>
         <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#777" font-size="20">Foto</text>
       </svg>`
    );
  }

  goToProfile() { this.router.navigate(['/tabs/akun']); }
  goToPengajuanIzin() { this.router.navigate(['/pengajuan-izin']); }
  goToRiwayatIzin() { this.router.navigate(['/riwayat-izin']); }
}
