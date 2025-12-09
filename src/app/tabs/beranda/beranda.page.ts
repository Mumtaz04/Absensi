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
    // subscribe ke shared user state supaya foto & data otomatis sinkron
    this.userSvc.user$
      .pipe(takeUntil(this.destroy$))
      .subscribe(u => {
        this.user = u;
        this.updatePhotoFromUser(u);
      });

    // kalau service masih kosong, load data dari API (init)
    if (!this.userSvc.getCurrentUser()) {
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
        this.userSvc.setUser(fetched);
        try { this.cd.markForCheck(); } catch {}
      },
      error: (err) => {
        console.error('❌ Gagal memuat data user:', err);
      },
    });
  }

  // ---------------- update photo helper (robust) ----------------
  private updatePhotoFromUser(u: AppUser | null) {
    const raw = (u?.photo || u?.photo_url || '')?.toString().trim() ?? '';
    let finalUrl = 'assets/icon/default-profile.png';

    if (raw) {
      if (raw.startsWith('data:') || raw.startsWith('blob:')) {
        finalUrl = raw;
      } else if (/^https?:\/\//i.test(raw)) {
        finalUrl = this.addCacheBuster(raw);
      } else {
      const photoPath = this.user?.photo || this.user?.photo_url || '';
      const cleanPath = photoPath.replace(/^storage\//, '');
      this.userPhotoUrl = `${this.apiUrl}/storage/${cleanPath}`;

      }
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

    // inline SVG fallback agar tidak menghasilkan request 404
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
