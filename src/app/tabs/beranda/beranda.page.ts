import { Component, OnInit } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-beranda',
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule],
  templateUrl: './beranda.page.html',
  styleUrls: ['./beranda.page.scss'],
})
export class BerandaPage implements OnInit {
  user: any = null;
  apiUrl = 'http://127.0.0.1:8000';
  userPhotoUrl = 'assets/icon/default-profile.png';

  /** Status Presensi Hari Ini */
  statusPresensi: {
    status: 'belum' | 'hadir' | 'selesai' | 'hadir_tepat' | 'hadir_telat';
    jamCheckin: string | null;
    jamCheckout: string | null;
    pesan: string;
  } = {
    status: 'belum',
    jamCheckin: null,
    jamCheckout: null,
    pesan: 'Anda belum presensi, mohon presensi sekarang.'
  };

  statistikBulanan = [
    { label: 'Hadir', count: 20, class: 'hadir', width: '80%' },
    { label: 'Terlambat', count: 5, class: 'terlambat', width: '40%' },
    { label: 'Cuti', count: 2, class: 'cuti', width: '20%' },
    { label: 'Alfa', count: 1, class: 'alfa', width: '10%' },
  ];

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit() {
    this.loadUserData();
    this.loadStatusHariIni();
  }

  // ============================================================
  // 🔹 AMBIL DATA PRESENSI HARI INI
  // ============================================================
  async loadStatusHariIni() {
    const token = localStorage.getItem('token');
    if (!token) return;

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });

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
            (x.date && x.date === today) ||
            (x.check_in && x.check_in.startsWith(today))
          );

          if (!todayRecord) {
            this.statusPresensi = {
              status: 'belum',
              jamCheckin: null,
              jamCheckout: null,
              pesan: 'Anda belum presensi, mohon presensi sekarang.'
            };
            return;
          }

          // ===============================
          // CEK TEPAT WAKTU / TERLAMBAT
          // ===============================
          // Sudah check-in
          this.statusPresensi.jamCheckin = this.formatTime(todayRecord.check_in);

          // Tentukan jam kerja
          const jamKerja = new Date();
          jamKerja.setHours(9, 0, 0, 0);

          // Waktu check-in user
          const waktuCheckin = new Date(todayRecord.check_in);

          // Tentukan tepat waktu / terlambat
          if (waktuCheckin <= jamKerja) {
            this.statusPresensi.status = 'hadir_tepat';
            this.statusPresensi.pesan = 'Tepat waktu, selamat bekerja!';
          } else {
            this.statusPresensi.status = 'hadir_telat';
            this.statusPresensi.pesan = 'Anda terlambat presensi.';
          }

          // Kalau sudah checkout → status selesai
          if (todayRecord.check_out) {
            this.statusPresensi.status = 'selesai';
            this.statusPresensi.jamCheckout = this.formatTime(todayRecord.check_out);
            this.statusPresensi.pesan = 'Presensi hari ini sudah selesai.';
          }
        },

        error: (err) => {
          console.error('❌ Error loadStatusHariIni:', err);
        }
      });
  }

  // ============================================================
  // 🔹 AMBIL DATA USER
  // ============================================================
  loadUserData() {
    const token = localStorage.getItem('token');

    if (!token) {
      console.warn('Token tidak ditemukan, hentikan load user.');
      return;
    }

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });

    this.http.get(`${this.apiUrl}/api/user`, { headers }).subscribe({
      next: (response: any) => {
        this.user = response.data ?? response.user ?? response;

        const photoPath = this.user?.photo || this.user?.photo_url;

        if (photoPath) {
          if (photoPath.startsWith('http')) {
            this.userPhotoUrl = photoPath;
          } else {
            const cleanPath = photoPath.replace(/^storage\//, '');
            this.userPhotoUrl = `${this.apiUrl}/storage/${cleanPath}`;
          }
        } else {
          this.userPhotoUrl = 'assets/icon/default-profile.png';
        }
      },
      error: (err) => {
        console.error('❌ Gagal memuat data user:', err);
        this.userPhotoUrl = 'assets/icon/default-profile.png';
      },
    });
  }

  // ============================================================
  // 🔹 Format Time — FIX TANPA DETIK
  // ============================================================
  formatTime(datetime: string | null): string | null {
    if (!datetime) return null;

    const d = new Date(datetime);

    let h = String(d.getHours()).padStart(2, '0');
    let m = String(d.getMinutes()).padStart(2, '0');

    return `${h}.${m}`;   // ✔ Hanya jam dan menit
  }

  // ============================================================
  // 🔹 FALLBACK FOTO
  // ============================================================
  onPhotoError(event: any) {
    event.target.src = 'assets/icon/default-profile.png';
  }

  // ============================================================
  // 🔹 NAVIGASI
  // ============================================================
  goToProfile() {
    this.router.navigate(['/tabs/akun']);
  }

  goToPengajuanIzin() {
    this.router.navigate(['/pengajuan-izin']);
  }

  goToRiwayatIzin() {
    this.router.navigate(['/riwayat-izin']);
  }

  trackByLabel(index: number, item: any) {
    return item.label;
  }
}
