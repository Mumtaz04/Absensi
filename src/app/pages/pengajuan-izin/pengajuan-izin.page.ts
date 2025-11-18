import {
  Component,
  ChangeDetectorRef,
  OnInit,
  ElementRef,
  ViewChild,
  Renderer2,
  OnDestroy,
} from '@angular/core';
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
export class PengajuanIzinPage implements OnInit, OnDestroy {
  alasan = '';
  deskripsi = '';
  tanggalMulai: string | null = null;
  tanggalSelesai: string | null = null;

  showCalendarMulai = false;
  showCalendarSelesai = false;

  showBackNotice = false;
  showSubmitNotice = false;

  selectedFileNames: string[] = [];

  minDate = '1950-01-01';
  maxDate = '2100-12-31';

  todayDay = '';
  todayDate = '';

  private injectedMulai = false;
  private injectedSelesai = false;
  private dateInterval: any;

  @ViewChild('kalenderMulai', { read: ElementRef }) kalenderMulaiEl?: ElementRef;
  @ViewChild('kalenderSelesai', { read: ElementRef }) kalenderSelesaiEl?: ElementRef;

  constructor(
    private cdr: ChangeDetectorRef,
    private toastCtrl: ToastController,
    private navCtrl: NavController,
    private renderer: Renderer2
  ) {}

  ngOnInit() {
    this.updateToday();
    this.dateInterval = setInterval(() => this.updateToday(), 60000);
  }

  ngOnDestroy() {
    if (this.dateInterval) clearInterval(this.dateInterval);
  }

  private updateToday() {
    const now = new Date();
    const dayNames = [
      'Minggu',
      'Senin',
      'Selasa',
      'Rabu',
      'Kamis',
      'Jumat',
      'Sabtu',
    ];
    const newDay = dayNames[now.getDay()];
    const newDate = now.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    if (this.todayDay !== newDay || this.todayDate !== newDate) {
      this.todayDay = newDay;
      this.todayDate = newDate;
      this.injectedMulai = false;
      this.injectedSelesai = false;

      if (this.showCalendarMulai) {
        setTimeout(() => this.tryInjectToday('mulai'), 200);
      }
      if (this.showCalendarSelesai) {
        setTimeout(() => this.tryInjectToday('selesai'), 200);
      }

      this.cdr.detectChanges();
    }
  }

  toggleCalendar(type: 'mulai' | 'selesai') {
    if (type === 'mulai') {
      this.showCalendarMulai = !this.showCalendarMulai;
      this.showCalendarSelesai = false;
      if (this.showCalendarMulai) {
        this.injectedMulai = false;
        setTimeout(() => this.tryInjectToday('mulai'), 120);
      }
    } else {
      this.showCalendarSelesai = !this.showCalendarSelesai;
      this.showCalendarMulai = false;
      if (this.showCalendarSelesai) {
        this.injectedSelesai = false;
        setTimeout(() => this.tryInjectToday('selesai'), 120);
      }
    }
  }

  private tryInjectToday(which: 'mulai' | 'selesai', attempt = 0) {
    const MAX_ATTEMPTS = 8;
    if (attempt > MAX_ATTEMPTS) return;

    const elRef = which === 'mulai' ? this.kalenderMulaiEl : this.kalenderSelesaiEl;
    if (!elRef) {
      setTimeout(() => this.tryInjectToday(which, attempt + 1), 150);
      return;
    }

    const native = elRef.nativeElement as HTMLElement | undefined;
    if (!native) {
      setTimeout(() => this.tryInjectToday(which, attempt + 1), 150);
      return;
    }

    const shadow = (native as any).shadowRoot as ShadowRoot | null;
    if (!shadow) {
      setTimeout(() => this.tryInjectToday(which, attempt + 1), 150);
      return;
    }

    const header =
      shadow.querySelector('.calendar-month-year') ||
      shadow.querySelector('.calendar-header') ||
      shadow.querySelector('.calendar-toolbar');

    if (!header) {
      setTimeout(() => this.tryInjectToday(which, attempt + 1), 150);
      return;
    }

    const oldInfo = shadow.querySelector('.today-info');
    if (oldInfo) oldInfo.remove();

    const info = this.renderer.createElement('div');
    this.renderer.addClass(info, 'today-info');
    const text = this.renderer.createText(`Hari ini: ${this.todayDay}, ${this.todayDate}`);
    this.renderer.appendChild(info, text);

    this.renderer.setStyle(info, 'fontSize', '13px');
    this.renderer.setStyle(info, 'color', '#000000ff');
    this.renderer.setStyle(info, 'marginTop', '6px');
    this.renderer.setStyle(info, 'fontWeight', '500');
    this.renderer.setStyle(info, 'textAlign', 'center');
    this.renderer.setStyle(info, 'whiteSpace', 'nowrap');

    try {
      header.appendChild(info);
      if (which === 'mulai') this.injectedMulai = true;
      else this.injectedSelesai = true;
    } catch {
      setTimeout(() => this.tryInjectToday(which, attempt + 1), 150);
    }
  }

  // 🗓️ Otomatis tutup kalender setelah pilih tanggal
  onDateSelected(event: any, type: 'mulai' | 'selesai') {
    const val = event?.detail?.value;
    if (!val) return;

    if (type === 'mulai') {
      this.tanggalMulai = val;
      this.showCalendarMulai = false; // ⬅️ tutup otomatis
    } else {
      this.tanggalSelesai = val;
      this.showCalendarSelesai = false; // ⬅️ tutup otomatis
    }

    this.cdr.detectChanges();
  }

  get durationInDays(): number {
    if (!this.tanggalMulai || !this.tanggalSelesai) return 0;
    const s = new Date(this.tanggalMulai);
    const e = new Date(this.tanggalSelesai);
    const diff = Math.floor((e.getTime() - s.getTime()) / (1000 * 3600 * 24));
    return diff >= 0 ? diff + 1 : 0;
  }

  onFileSelected(ev: Event) {
    const input = ev.target as HTMLInputElement;
    if (input.files) {
      this.selectedFileNames = Array.from(input.files).map((f) => f.name);
    }
  }

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
