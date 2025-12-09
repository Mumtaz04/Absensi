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
    // 1) Jika UserService sudah punya user (mis. dari proses login sebelum navigasi),
    //    gunakan itu segera agar UI tidak tampil kosong lalu menunggu.
    const cached = this.userSvc.getCurrentUser();
    if (cached) {
      this.user = cached;
      this.updatePhotoFromUser(cached);
      try { this.cd.markForCheck(); } catch {}
    }

    // 2) Subscribe ke perubahan user untuk update realtime
    this.userSvc.user$
      .pipe(takeUntil(this.destroy$))
      .subscribe(u => {
        // only update if value present (avoid overwriting with null)
        if (u) {
          this.user = u;
          this.updatePhotoFromUser(u);
          try { this.cd.markForCheck(); } catch {}
        }
      });

    // 3) Hanya load dari API jika benar-benar tidak ada user di service
    //    atau tidak ada cached profile image (fallback).
    const cachedProfileImage = localStorage.getItem('profileImageUrl');
    if (!this.userSvc.getCurrentUser() && !cachedProfileImage) {
      this.loadUserData();
    }

    this.loadStatusHariIni();

    // subscribe presensi change
    this.sub = this.attendanceSvc.presensiChanged$.subscribe(() => {
      this.loadStatusHariIni();
    });
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ---------------- load status hari ini (tetap seperti sebelumnya) ----------------
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

  // ---------------- load user (dipakai saat init jika service kosong) ----------------
  loadUserData() {
    const token = localStorage.getItem('token');
    if (!token) return;

    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });

    this.http.get(`${this.apiUrl}/api/user`, { headers }).subscribe({
      next: (response: any) => {
        const fetched = response.data ?? response.user ?? response;
        // broadcast ke seluruh app lewat UserService
        if (fetched) {
          this.userSvc.setUser(fetched);
          // also update local view immediately
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
    // Always use the provided user 'u' (avoid relying on this.user which may be stale)
    const raw = (u?.photo || u?.photo_url || '')?.toString().trim() ?? '';
    let finalUrl = 'assets/icon/default-profile.png';

    if (raw) {
      if (raw.startsWith('data:') || raw.startsWith('blob:')) {
        finalUrl = raw;
      } else if (/^https?:\/\//i.test(raw)) {
        finalUrl = this.addCacheBuster(raw);
      } else {
        // backend returned relative path like "photos/abc.jpg" or "storage/photos/abc.jpg"
        const cleanPath = raw.replace(/^\/+/, '').replace(/^storage\//, '');
        finalUrl = `${this.apiUrl.replace(/\/+$/, '')}/storage/${cleanPath}`;
      }
    } else {
      // try cached url from localStorage if present
      const cached = localStorage.getItem('profileImageUrl');
      if (cached) finalUrl = cached;
    }

    this.userPhotoUrl = finalUrl;
    try { this.cd.markForCheck(); } catch {}
  }

  // ---------------- util ----------------
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

  private addCacheBuster(url: string) {
    const sep = url.includes('?') ? '&' : '?';
    return `${url}${sep}t=${Date.now()}`;
  }

  // ---------------- navigasi ----------------
  goToProfile() { this.router.navigate(['/tabs/akun']); }
  goToPengajuanIzin() { this.router.navigate(['/pengajuan-izin']); }
  goToRiwayatIzin() { this.router.navigate(['/riwayat-izin']); }
}
