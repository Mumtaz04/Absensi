import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../core/auth.service';
import { ToastController } from '@ionic/angular';

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.page.html',
  styleUrls: ['./forgot-password.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, FormsModule, ReactiveFormsModule]
})
export class ForgotPasswordPage {
  public form: FormGroup;
  public loading = false;

  // step: 1 = initial, 2 = sent confirmation, 3 = expiry shown
  public step = 1;
  public canSubmit = false;
  public showExpiredNotice = false;

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private toastCtrl: ToastController
  ) {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  // dipanggil saat user ketik
  public onInput() {
    const email = this.form.value.email || '';
    this.canSubmit = this.isValidEmail(email);
    // jika user mengubah input kembali, reset step
    if (this.step !== 1) {
      this.step = 1;
      this.showExpiredNotice = false;
    }
  }

  // method yang diakses dari template — harus public
  public async sendVerification(): Promise<void> {
    if (this.form.invalid) {
      this.showToast('Masukkan email yang valid');
      return;
    }

    const email = this.form.value.email;
    this.loading = true;

    try {
      // Panggil service nyata di sini; contoh menggunakan auth service kamu
      // Jika masih belum implement, kamu bisa comment line ini sementara.
      await this.auth.sendPasswordResetEmail(email);

      // Step 2: tunjukkan konfirmasi (mirip middle Figma)
      this.step = 2;
      this.canSubmit = true;

      await this.showToast('Link reset password telah dikirim ke email Anda');

      // Simulasikan langkah 3 (pesan merah) setelah delay kecil,
      // sehingga terlihat transisi dari step2 -> step3 seperti di Figma.
      setTimeout(() => {
        this.step = 3;
        this.showExpiredNotice = true;
        // lock input (readonly sudah di template via step>1)
      }, 700);
    } catch (err) {
      console.error('Gagal kirim verifikasi:', err);
      await this.showToast('Gagal mengirim email. Coba lagi.');
    } finally {
      this.loading = false;
    }
  }

  private isValidEmail(email: string): boolean {
    if (!email) return false;
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email.trim());
  }

  private async showToast(message: string) {
    const t = await this.toastCtrl.create({ message, duration: 1800 });
    await t.present();
  }
}
