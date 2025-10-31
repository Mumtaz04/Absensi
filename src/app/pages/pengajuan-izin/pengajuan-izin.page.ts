import { Component, ChangeDetectorRef } from '@angular/core';
import { IonicModule, ToastController, NavController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-pengajuan-izin',
  templateUrl: './pengajuan-izin.page.html',
  styleUrls: ['./pengajuan-izin.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule],
})
export class PengajuanIzinPage {
  alasan: string = '';
  deskripsi: string = '';
  tanggalMulai: string | null = null;
  tanggalSelesai: string | null = null;

  showCalendarMulai = false;
  showCalendarSelesai = false;

  showBackNotice = false;
  showSubmitNotice = false;

  selectedFileNames: string[] = [];

  minDate: string = new Date().toISOString();
  maxDate: string = new Date(new Date().getFullYear() + 10, 11, 31).toISOString();

  constructor(
    private cdr: ChangeDetectorRef,
    private toastCtrl: ToastController,
    private navCtrl: NavController
  ) {}

  get durationInDays(): number {
    if (!this.tanggalMulai || !this.tanggalSelesai) return 0;
    const s = new Date(this.tanggalMulai);
    const e = new Date(this.tanggalSelesai);
    const diff = Math.floor((e.getTime() - s.getTime()) / (1000 * 3600 * 24));
    return diff >= 0 ? diff + 1 : 0;
  }

  toggleCalendar(type: 'mulai' | 'selesai') {
    if (type === 'mulai') {
      this.showCalendarMulai = !this.showCalendarMulai;
      this.showCalendarSelesai = false;
    } else {
      this.showCalendarSelesai = !this.showCalendarSelesai;
      this.showCalendarMulai = false;
    }
  }

  onDateSelected(event: any, type: 'mulai' | 'selesai') {
    const val = event?.detail?.value;
    if (!val) return;
    if (type === 'mulai') {
      this.tanggalMulai = val;
    } else {
      this.tanggalSelesai = val;
    }
    this.cdr.detectChanges();
  }

  onFileSelected(ev: Event) {
    const input = ev.target as HTMLInputElement;
    if (input.files) {
      this.selectedFileNames = Array.from(input.files).map(f => f.name);
    }
  }

  // 🟩 Popup konfirmasi submit
  openSubmitNotice() {
    this.showSubmitNotice = true;
  }

  cancelSubmit() {
    this.showSubmitNotice = false;
  }

  async confirmSubmit() {
    this.showSubmitNotice = false;

    if (!this.alasan || !this.tanggalMulai || !this.tanggalSelesai) {
      const t = await this.toastCtrl.create({
        message: 'Harap lengkapi Alasan dan Tanggal Izin.',
        duration: 2000,
        color: 'danger',
      });
      await t.present();
      return;
    }

    const payload = {
      alasan: this.alasan,
      deskripsi: this.deskripsi,
      dari: this.tanggalMulai,
      sampai: this.tanggalSelesai,
      durasiHari: this.durationInDays,
      files: this.selectedFileNames,
    };

    console.log('✅ Pengajuan dikirim:', payload);

    const toast = await this.toastCtrl.create({
      message: 'Pengajuan izin berhasil diajukan!',
      duration: 2000,
      color: 'success',
    });
    await toast.present();
  }

  // 🟥 Popup konfirmasi kembali
  async onBackPressed() {
    this.showBackNotice = true;
  }

  cancelNotice() {
    this.showBackNotice = false;
  }

  confirmBack() {
    this.showBackNotice = false;
    this.navCtrl.back();
  }
}
