import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { IonicModule, NavController } from '@ionic/angular'; // ✅ Tambahkan NavController

@Component({
  selector: 'app-tab3',
  templateUrl: './tab3.page.html',
  styleUrls: ['./tab3.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule],
})
export class Tab3Page implements OnInit {
  user: any = null;
  apiUrl = 'http://127.0.0.1:8000/api'; // sesuaikan jika backend berbeda

  constructor(
    private http: HttpClient,
    private sanitizer: DomSanitizer,
    private navCtrl: NavController // ✅ Tambahkan NavController di constructor
  ) {}

  ngOnInit() {
    this.getUserData();
  }

  /** Ambil data user dari API */
  getUserData() {
    this.http.get(`${this.apiUrl}/user`).subscribe({
      next: (response: any) => {
        console.log('Response user:', response);
        this.user = response.user ?? response;
      },
      error: (err) => {
        console.error('Gagal memuat user:', err);
      },
    });
  }

  /** Ambil URL foto profil user */
  getUserPhotoUrl(): SafeUrl | string {
    if (!this.user) return 'assets/img/default-profile.png';

    let photoUrl: string;
    if (this.user.photo_url) {
      photoUrl = this.user.photo_url;
    } else if (this.user.photo) {
      photoUrl = `${this.apiUrl.replace('/api', '')}/storage/${this.user.photo}`;
    } else {
      photoUrl = 'assets/img/default-profile.png';
    }

    return this.sanitizer.bypassSecurityTrustUrl(photoUrl);
  }

  /** Jika foto gagal dimuat, pakai default */
  onImageError(event: Event) {
    const element = event.target as HTMLImageElement;
    element.src = 'assets/img/default-profile.png';
  }

  /** ✅ Fungsi Logout */
  logout() {
    // Hapus token login (sesuaikan jika pakai session atau storage lain)
    localStorage.removeItem('token');
    sessionStorage.clear();

    // Arahkan ke halaman login
    this.navCtrl.navigateRoot('/login');
  }
}
