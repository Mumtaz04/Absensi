import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ToastController } from '@ionic/angular';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule], // ✅ wajib
})
export class LoginPage {
  email = '';
  password = '';
  showPassword = false; // ✅ untuk toggle mata
  errorMessage = '';    // ✅ untuk pesan error
  loading = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private toastCtrl: ToastController
  ) {}

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

async login() {
  this.loading = true;
  this.authService.login(this.email, this.password).subscribe({
    next: (res: any) => {
      this.loading = false;
      localStorage.setItem('token', res.token);

      this.router.navigate(['/tabs/beranda']);
    },
    error: async (err: any) => {
      this.loading = false;
      console.error('Login gagal:', err);
      this.errorMessage = 'Email atau password salah.';
      const toast = await this.toastCtrl.create({
        message: this.errorMessage,
        duration: 2000,
        color: 'danger'
      });
      toast.present();
      }
    });
  }
}
