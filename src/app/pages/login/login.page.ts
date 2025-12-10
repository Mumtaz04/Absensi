import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ToastController, NavController } from '@ionic/angular';
import { AuthService } from '../../core/auth.service';
import { UserService } from '../../services/user.service';
import { firstValueFrom } from 'rxjs';
import { environment } from 'src/environments/environment'; // <-- PASTIKAN import ini ada

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule],
})
export class LoginPage {
  email = '';
  password = '';
  showPassword = false;
  errorMessage = '';
  loading = false;

  constructor(
    private authService: AuthService,
    private userService: UserService,
    private router: Router,
    private toastCtrl: ToastController,
    private navCtrl: NavController
  ) {}

  goToForgotPassword() {
    this.navCtrl.navigateForward('/forgot-password');
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  // ================== GANTI FUNSI login() DENGAN INI ==================
  async login() {
    if (!this.email || !this.password) {
      const t = await this.toastCtrl.create({ message: 'Masukkan email dan password', duration: 1500, color: 'warning' });
      await t.present();
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    // helper lokal: bangun absolute photo URL dari nilai server (relatif atau absolut)
    const buildPhotoUrl = (raw: string | null | undefined) => {
      if (!raw) return null;
      const s = raw.toString().trim();
      if (!s) return null;
      if (/^https?:\/\//i.test(s)) return s; // sudah absolute

      // normalisasi: jika server mengirim "api/storage/..." atau "/api/storage/..." -> ubah ke "storage/..."
      let clean = s.replace(/^\/+/, ''); // hilangkan leading slash

      // jika server hanya mengirim "photos/xxx.jpg", ubah ke "storage/photos/xxx.jpg"
      if (/^photos\//i.test(clean)) {
        clean = clean.replace(/^photos\//i, 'storage/photos/');
      }

      clean = clean.replace(/^api\/storage\//i, 'storage/'); // hapus "api/storage/" jika ada
      clean = clean.replace(/^storage\//i, 'storage/'); // pastikan format storage/...

      const base = (environment.apiUrl || '').replace(/\/+$/, '');
      return `${base}/${clean}?t=${Date.now()}`;
    };

    try {
      // 1) login
      const res: any = await firstValueFrom(this.authService.login(this.email, this.password));

      // 2) ambil token
      const token = res?.token ?? res?.access_token ?? res?.data?.token ?? '';
      if (!token) throw new Error('Token tidak diterima dari server.');

      // 3) simpan token
      if (typeof this.authService.saveToken === 'function') {
        try { this.authService.saveToken(token); } catch { localStorage.setItem('token', token); }
      } else {
        localStorage.setItem('token', token);
      }

      // 4) ambil profile (pastikan getProfile mengirim Authorization header — interceptor direkomendasikan)
      let rawProfile: any = null;
      try {
        rawProfile = await firstValueFrom(this.authService.getProfile());
      } catch (profileErr) {
        console.warn('Gagal ambil profile setelah login:', profileErr);
      }

      // 5) normalisasi struktur profile
      let profile: any = rawProfile ?? null;
      if (profile) profile = profile.data ?? profile.user ?? profile;

      // 6) set user & photo (jika ada) sehingga Beranda langsung dapat
      if (profile) {
        this.userService.setUser(profile);

        // jika server memberikan photo (relatif/absolute) convert => absolute
        const rawPhoto = profile.photo ?? profile.photo_url ?? null;
        const photoUrl = buildPhotoUrl(rawPhoto);
        if (photoUrl) {
          try { localStorage.setItem('profileImageUrl', photoUrl); } catch(e) {}
          try { this.userService.setPhoto(photoUrl); } catch(e) {}
        } else {
          // jika server tidak kirim foto di sini, cek apakah ada profileImageUrl yang tersisa di storage (dari upload sebelumnya)
          const cached = localStorage.getItem('profileImageUrl');
          if (cached) {
            try { this.userService.setPhoto(cached); } catch(e) {}
          }
        }
      } else {
        // jika profile null, coba fallback: ada cached image?
        const cached = localStorage.getItem('profileImageUrl');
        if (cached) {
          try { this.userService.setPhoto(cached); } catch(e) {}
        }
      }

      // 7) navigasi
      const toast = await this.toastCtrl.create({ message: 'Login berhasil!', duration: 1200, color: 'success' });
      await toast.present();
      await this.router.navigate(['/tabs/beranda'], { replaceUrl: true });

    } catch (err: any) {
      console.error('Login gagal:', err);

      let message = 'Email atau password salah.';
      if (err?.status === 422 && err?.error?.errors) {
        const firstKey = Object.keys(err.error.errors)[0];
        message = err.error.errors[firstKey][0];
      } else if (err?.error?.message) message = err.error.message;
      else if (err?.message) message = err.message;

      this.errorMessage = message;
      const toast = await this.toastCtrl.create({ message, duration: 2500, color: 'danger' });
      await toast.present();
    } finally {
      this.loading = false;
    }
  }
  // ===================================================================
}
