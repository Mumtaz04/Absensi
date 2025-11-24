import { Component } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NavController } from '@ionic/angular';
import { ToastController } from '@ionic/angular';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  templateUrl: './forgot-password.page.html',
  styleUrls: ['./forgot-password.page.scss'],
  imports: [
    IonicModule,
    CommonModule,
    FormsModule
  ]
})
export class ForgotPasswordPage {
  email: string = '';

  constructor(
    private navCtrl: NavController,
    private toastCtrl: ToastController
  ) {}

  async sendVerification() {
    if (!this.email) {
      const toast = await this.toastCtrl.create({
        message: 'Email tidak boleh kosong',
        duration: 2000,
        color: 'danger'
      });
      toast.present();
      return;
    }

    // ➜ ini nanti kamu hubungkan ke API (kalau backend siap)
    const toast = await this.toastCtrl.create({
      message: 'Link verifikasi telah dikirim ke email anda',
      duration: 2000,
      color: 'success'
    });
    toast.present();
  }
}
