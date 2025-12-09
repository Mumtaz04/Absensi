// import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
// import { HttpClient, HttpHeaders } from '@angular/common/http';
// import { Router } from '@angular/router';
// import { IonicModule } from '@ionic/angular';
// import { CommonModule } from '@angular/common';
// import { FormsModule } from '@angular/forms';

// import { Subscription, Subject } from 'rxjs';
// import { takeUntil } from 'rxjs/operators';
// import { AttendanceService } from '../../services/attendance.service';
// import { UserService, AppUser } from '../../services/user.service';

// @Component({
//   selector: 'app-beranda',
//   standalone: true,
//   imports: [IonicModule, CommonModule, FormsModule],
//   templateUrl: './beranda.page.html',
//   styleUrls: ['./beranda.page.scss'],
// })
// export class BerandaPage implements OnInit, OnDestroy {
//   user: AppUser | null = null;
//   apiUrl = 'http://127.0.0.1:8000';
//   userPhotoUrl = 'assets/icon/default-profile.png';

//   statusPresensi = {
//     status: 'belum' as 'belum' | 'hadir' | 'selesai' | 'hadir_tepat' | 'hadir_telat',
//     jamCheckin: null as string | null,
//     jamCheckout: null as string | null,
//     pesan: 'Anda belum presensi, mohon presensi sekarang.'
//   };

//   private sub: Subscription | null = null;
//   private destroy$ = new Subject<void>();

//   constructor(
//     private http: HttpClient,
//     private router: Router,
//     private attendanceSvc: AttendanceService,
//     private cd: ChangeDetectorRef,
//     private userSvc: UserService
//   ) {}

//   ngOnInit() {
//     // subscribe ke shared user state supaya foto & data otomatis sinkron
//     this.userSvc.user$
//       .pipe(takeUntil(this.destroy$))
//       .subscribe(u => {
//         this.user = u;
//         this.updatePhotoFromUser(u);
//       });

//     // kalau service masih kosong, load data dari API (init)
//     if (!this.userSvc.getCurrentUser()) {
//       this.loadUserData();
//     }

//     this.loadStatusHariIni();

//     // subscribe presensi change
//     this.sub = this.attendanceSvc.presensiChanged$.subscribe(() => {
//       this.loadStatusHariIni();
//     });
//   }

//   ngOnDestroy() {
//     this.sub?.unsubscribe();
//     this.destroy$.next();
//     this.destroy$.complete();
//   }

//   // ---------------- load status hari ini ----------------
//   async loadStatusHariIni() {
//     const token = localStorage.getItem('token');
//     // jika tidak ada token dan anda memakai cookie-based sanctum, Anda mungkin ingin memanggil endpoint juga denganCredentials
//     const headers = token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : undefined;

//     const now = new Date();
//     const month = now.getMonth() + 1;
//     const year = now.getFullYear();

//     const options: any = headers ? { headers } : {};

//     this.http
//       .get(`${this.apiUrl}/api/employee/attendances/history?month=${month}&year=${year}`, options)
//       .subscribe({
//         next: (res: any) => {
//           const list = res?.data ?? res ?? [];
//           const today = new Date().toISOString().slice(0, 10);
//           const todayRecord = list.find((x: any) =>
//             (x.date && x.date === today) || (x.check_in && x.check_in.startsWith(today))
//           );

//           if (!todayRecord) {
//             this.statusPresensi = {
//               status: 'belum',
//               jamCheckin: null,
//               jamCheckout: null,
//               pesan: 'Anda belum presensi, mohon presensi sekarang.'
//             };
//             try { this.cd.markForCheck(); } catch {}
//             return;
//           }

//           this.statusPresensi.jamCheckin = this.formatTime(todayRecord.check_in);

//           const jamKerja = new Date();
//           jamKerja.setHours(9, 0, 0, 0);
//           const waktuCheckin = new Date(todayRecord.check_in);

//           if (waktuCheckin <= jamKerja) {
//             this.statusPresensi.status = 'hadir_tepat';
//             this.statusPresensi.pesan = 'Tepat waktu, selamat bekerja!';
//           } else {
//             this.statusPresensi.status = 'hadir_telat';
//             this.statusPresensi.pesan = 'Anda terlambat presensi.';
//           }

//           if (todayRecord.check_out) {
//             this.statusPresensi.status = 'selesai';
//             this.statusPresensi.jamCheckout = this.formatTime(todayRecord.check_out);
//             this.statusPresensi.pesan = 'Presensi hari ini sudah selesai.';
//           }

//           try { this.cd.markForCheck(); } catch {}
//         },
//         error: (err) => {
//           console.error('❌ Error loadStatusHariIni:', err);
//         }
//       });
//   }

//   // ---------------- load user (dipakai saat init jika service kosong) ----------------
//   loadUserData() {
//     const token = localStorage.getItem('token');

//     // Prioritas: coba panggil /api/user tanpa header (mengandalkan interceptor atau cookie session)
//     this.http.get(`${this.apiUrl}/api/user`, { withCredentials: true }).subscribe({
//       next: (response: any) => {
//         const fetched = this.normalizeUserResponse(response);
//         if (fetched) {
//           this.userSvc.setUser(fetched);
//           try { this.cd.markForCheck(); } catch {}
//           return;
//         }
//         // kalau kosong, lanjut ke token-based attempt di bawah
//         this.tryTokenBasedFetch(token);
//       },
//       error: (err) => {
//         // kalau gagal, coba token-based (jika ada token)
//         console.warn('Gagal load /api/user via cookie/session (atau bukan cookie auth). Mencoba token jika ada.', err);
//         this.tryTokenBasedFetch(token, err);
//       }
//     });
//   }

//   private tryTokenBasedFetch(token: string | null, prevError?: any) {
//     if (!token) {
//       // tidak ada token — fallback ke email stored
//       this.loadUserByEmail();
//       return;
//     }

//     const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
//     this.http.get(`${this.apiUrl}/api/user`, { headers }).subscribe({
//       next: (response: any) => {
//         const fetched = this.normalizeUserResponse(response);
//         if (fetched) {
//           this.userSvc.setUser(fetched);
//           try { this.cd.markForCheck(); } catch {}
//           return;
//         }
//         // jika server tidak memberi user, fallback ke email
//         this.loadUserByEmail();
//       },
//       error: (err) => {
//         console.error('❌ Gagal memuat data user dengan token:', err, prevError ?? '');
//         if (err?.status === 401) {
//           // token invalid/expired
//           localStorage.removeItem('token');
//         }
//         // fallback ke email jika tersedia
//         this.loadUserByEmail();
//       }
//     });
//   }

//   // ---------------- fallback: ambil user berdasarkan email tersimpan ----------------
//   loadUserByEmail() {
//     const email = localStorage.getItem('user_email');
//     if (!email) {
//       // tidak ada email, hentikan
//       return;
//     }

//     // Pastikan backend punya endpoint GET /api/users?email=...
//     this.http.get(`${this.apiUrl}/api/users?email=${encodeURIComponent(email)}`)
//       .subscribe({
//         next: (res: any) => {
//           let fetched = this.normalizeUserResponse(res);
//           if (Array.isArray(fetched)) fetched = fetched[0] ?? null;
//           if (!fetched) {
//             console.warn('User tidak ditemukan via email fallback:', email);
//             return;
//           }
//           this.userSvc.setUser(fetched);
//           try { this.cd.markForCheck(); } catch {}
//         },
//         error: (err) => {
//           console.error('❌ Gagal loadUserByEmail:', err);
//         }
//       });
//   }

//   // ---------------- helper: normalisasi response user ----------------
//   private normalizeUserResponse(response: any) {
//     let fetched = response?.data ?? response?.user ?? response;
//     if (Array.isArray(fetched) && fetched.length === 1) fetched = fetched[0];
//     return fetched ?? null;
//   }

//   // ---------------- update photo helper (robust) ----------------
//   private updatePhotoFromUser(u: AppUser | null) {
//     // default
//     this.userPhotoUrl = 'assets/icon/default-profile.png';

//     if (!u) {
//       try { this.cd.markForCheck(); } catch {}
//       return;
//     }

//     // dukung berbagai properti
//     const raw = (u.photo ?? u.photo_url ?? u.photo ?? '').toString().trim();

//     if (!raw) {
//       try { this.cd.markForCheck(); } catch {}
//       return;
//     }

//     // data URI atau blob
//     if (raw.startsWith('data:') || raw.startsWith('blob:')) {
//       this.userPhotoUrl = raw;
//       try { this.cd.markForCheck(); } catch {}
//       return;
//     }

//     // absolute URL
//     if (/^https?:\/\//i.test(raw)) {
//       this.userPhotoUrl = this.addCacheBuster(raw);
//       try { this.cd.markForCheck(); } catch {}
//       return;
//     }

//     // relative path dari backend (ex: "storage/photos/x.jpg" atau "photos/x.jpg")
//     let clean = raw.replace(/^\/+/, '').replace(/^storage\//i, '');
//     this.userPhotoUrl = `${this.apiUrl}/storage/${clean}`;
//     try { this.cd.markForCheck(); } catch {}
//   }

//   // ---------------- util ----------------
//   formatTime(datetime: string | null): string | null {
//     if (!datetime) return null;
//     const ts = Date.parse(datetime);
//     if (isNaN(ts)) return null;
//     const d = new Date(ts);
//     return `${String(d.getHours()).padStart(2,'0')}.${String(d.getMinutes()).padStart(2,'0')}`;
//   }

//   onPhotoError(event: Event) {
//     const img = event.target as HTMLImageElement;
//     if (img.dataset['fallback'] === 'true') return;
//     img.dataset['fallback'] = 'true';

//     img.src = 'data:image/svg+xml;utf8,' + encodeURIComponent(
//       `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">
//          <rect width="100%" height="100%" fill="#eaeaea"/>
//          <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#777" font-size="20">Foto</text>
//        </svg>`
//     );
//   }

//   private addCacheBuster(url: string) {
//     const sep = url.includes('?') ? '&' : '?';
//     return `${url}${sep}t=${Date.now()}`;
//   }

//   // ---------------- navigasi ----------------
//   goToProfile() { this.router.navigate(['/tabs/akun']); }
//   goToPengajuanIzin() { this.router.navigate(['/pengajuan-izin']); }
//   goToRiwayatIzin() { this.router.navigate(['/riwayat-izin']); }
// }
