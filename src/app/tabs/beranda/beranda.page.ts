import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
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
  apiUrl = 'http://127.0.0.1:8000'; // base URL backend kamu (jangan pakai /api di sini)

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  ngOnInit() {
    this.getUserData();
  }

  // Ambil data user dari backend
  getUserData() {
    const token = localStorage.getItem('token'); // kalau pakai token
    const headers: any = token ? { Authorization: `Bearer ${token}` } : {};

    this.http.get(`${this.apiUrl}/api/user`, { headers }).subscribe({
      next: (response: any) => {
        console.log('Response user:', response);
        // Sesuaikan struktur respon backend (Laravel biasanya kirim "data")
        this.user = response.data ?? response.user ?? response;
      },
      error: (err) => {
        console.error('Gagal memuat user:', err);
        this.user = null;
      },
    });
  }

  // Dapatkan URL foto user
  getUserPhotoUrl(): string {
    if (!this.user) return 'assets/img/default-profile.png';

    let photoPath = this.user.photo || this.user.photo_url;

    if (!photoPath) {
      return 'assets/img/default-profile.png';
    }

    // Jika backend kirim URL lengkap (http...), langsung pakai
    if (photoPath.startsWith('http')) {
      return photoPath;
    }

    // Jika backend hanya kirim nama file di folder storage
    return `${this.apiUrl}/storage/${photoPath}`;
  }

  // Ganti foto default jika error load
  onPhotoError(event: any) {
    event.target.src = 'assets/img/default-profile.png';
  }

  // Navigasi ke halaman lain
  goToProfile() {
    this.router.navigate(['/tabs/akun']);
  }

  goToPengajuanIzin() {
    this.router.navigate(['/pengajuan-izin']);
  }

  goToRiwayatIzin() {
    this.router.navigate(['/riwayat-izin']);
  }
}
