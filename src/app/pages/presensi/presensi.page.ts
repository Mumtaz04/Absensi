import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { Geolocation } from '@capacitor/geolocation';
import { AttendanceService } from '../../services/attendance.service';
import { NavController } from '@ionic/angular';
import { firstValueFrom, Subscription } from 'rxjs';

@Component({
  selector: 'app-presensi',
  templateUrl: './presensi.page.html',
  styleUrls: ['./presensi.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule],
})
export class PresensiPage implements OnInit, OnDestroy {
  constructor(
    private attendanceService: AttendanceService,
    private navCtrl: NavController
  ) {}

  isLoading = false;
  isCheckoutDisabled = false;
  currentTime = '';
  currentDate = '';
  checkInTime: string | null = null;
  checkOutTime: string | null = null;
  today = '';
  canCheckIn = true;
  canCheckOut = false;

  todayRecordId: number | null = null;

  private readonly OFFICE_LAT = -7.037943980089189;
  private readonly OFFICE_LON = 110.47993371532893;

  private presensiSub?: Subscription;
  private unloadHandler = this.savePresensiData.bind(this);

  goToRiwayatPresensi() {
    this.navCtrl.navigateForward('/riwayat-presensi');
  }
  goToPengajuanIzin() {
    this.navCtrl.navigateForward('/pengajuan-izin');
  }

  ngOnInit() {
    this.updateDateTime();
    setInterval(() => this.updateDateTime(), 1000);

    this.today = this.attendanceService.getTodayDateString();
    this.clearOldPresensiData();
    this.restorePresensiData();
    this.syncButtonStates();

    window.addEventListener('beforeunload', this.unloadHandler);

    this.loadTodayAttendance();

    this.presensiSub = this.attendanceService.presensiChanged$.subscribe(() => {
      this.loadTodayAttendance();
    });
  }

  ionViewWillEnter() {
    this.updateDateTime();
    this.restorePresensiData();
    this.loadTodayAttendance();
    this.syncButtonStates();
  }

  ngOnDestroy() {
    window.removeEventListener('beforeunload', this.unloadHandler);
    this.presensiSub?.unsubscribe();
  }

  updateDateTime() {
    const now = new Date();

    this.currentTime = now
      .toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      })
      .replace('.', ' : ');

    this.currentDate = now.toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }

  /** ====================================
   * FIX: Format waktu tanpa ubah timezone
   * ==================================== */
  private formatTimeString(dateStr: string): string {
    if (!dateStr) return '-- : --';

    // Format backend: "2025-11-24 12:58:00"
    const parts = dateStr.split(' ');
    if (parts.length < 2) return '-- : --';
    return parts[1].substring(0, 5); // jam:menit
  }

  private restorePresensiData() {
    this.checkInTime = localStorage.getItem('checkInTime');
    this.checkOutTime = localStorage.getItem('checkOutTime');
  }

  private savePresensiData() {
    if (this.checkInTime) localStorage.setItem('checkInTime', this.checkInTime);
    if (this.checkOutTime) localStorage.setItem('checkOutTime', this.checkOutTime);
  }

  private clearOldPresensiData() {
    const savedDate = localStorage.getItem('presensiDate');
    const today = this.attendanceService.getTodayDateString();

    if (savedDate !== today) {
      localStorage.removeItem('checkInTime');
      localStorage.removeItem('checkOutTime');
      localStorage.setItem('presensiDate', today);
      this.todayRecordId = null;
    }
  }

  /** ================================================
   * LOAD TODAY DATA (tanpa timezone conversion)
   * ================================================ */
  private async loadTodayAttendance() {
    try {
      const now = new Date();
      const month = now.getMonth() + 1;
      const year = now.getFullYear();

      const data: any = await firstValueFrom(
        this.attendanceService.getAttendanceHistory(month, year)
      );

      const today = this.attendanceService.getTodayDateString();

      const todayRecord = Array.isArray(data)
        ? data.find((x: any) => {
            const created = x.created_at ?? x.check_in ?? x.date;
            return created && String(created).startsWith(today);
          })
        : null;

      if (todayRecord) {
        this.todayRecordId = todayRecord.id ?? null;

        if (todayRecord.check_in) {
          this.checkInTime = this.formatTimeString(todayRecord.check_in);
          localStorage.setItem('checkInTime', this.checkInTime);
        }

        if (todayRecord.check_out) {
          this.checkOutTime = this.formatTimeString(todayRecord.check_out);
          localStorage.setItem('checkOutTime', this.checkOutTime);
        }
      } else {
        this.checkInTime = localStorage.getItem('checkInTime');
        this.checkOutTime = localStorage.getItem('checkOutTime');
        this.todayRecordId = null;
      }

      this.syncButtonStates();
    } catch (err) {
      console.warn('⚠️ Gagal memuat presensi hari ini:', err);
    }
  }

  private syncButtonStates() {
    if (!this.checkInTime && !this.checkOutTime) {
      this.canCheckIn = true;
      this.canCheckOut = false;
    } else if (this.checkInTime && !this.checkOutTime) {
      this.canCheckIn = false;
      this.canCheckOut = true;
    } else {
      this.canCheckIn = false;
      this.canCheckOut = false;
    }
  }

  async checkIn() {
    await this.handlePresensi('check-in');
  }

  async checkOut() {
    await this.handlePresensi('check-out');
  }

  /** =======================================
   * GET GPS
   * ======================================= */
  private async getAccuratePosition(): Promise<{ latitude: number; longitude: number }> {
    try {
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      });

      const { latitude, longitude } = position.coords;

      if (!latitude || !longitude || latitude === 0 || longitude === 0) {
        throw new Error('Koordinat tidak valid. Pastikan GPS aktif.');
      }

      return { latitude, longitude };
    } catch (err) {
      alert('Gagal mendapatkan lokasi. Pastikan GPS aktif.');
      throw err;
    }
  }

  private getDistanceFromOffice(lat: number, lon: number): number {
    const R = 6371000;

    const lat1 = this.OFFICE_LAT * Math.PI / 180;
    const lon1 = this.OFFICE_LON * Math.PI / 180;
    const lat2 = lat * Math.PI / 180;
    const lon2 = lon * Math.PI / 180;

    const dLat = lat2 - lat1;
    const dLon = lon2 - lon1;

    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;

    return 2 * R * Math.asin(Math.sqrt(a));
  }

  /** ========================================================
   * HANDLE PRESENSI
   * ======================================================== */
  private async handlePresensi(type: 'check-in' | 'check-out') {
    this.isLoading = true;

    try {
      const { latitude, longitude } = await this.getAccuratePosition();

      const now = new Date();
      const formattedNow = now.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });

      const month = now.getMonth() + 1;
      const year = now.getFullYear();

      const data: any = await firstValueFrom(
        this.attendanceService.getAttendanceHistory(month, year)
      );

      const today = this.attendanceService.getTodayDateString();

      const existing = Array.isArray(data)
        ? data.find((x: any) => {
            const created = x.created_at ?? x.check_in ?? x.date;
            return created && String(created).startsWith(today);
          })
        : null;

      let res: any;

      /** CHECK-IN */
      if (type === 'check-in') {
        if (existing?.check_in) {
          alert('⚠️ Kamu sudah melakukan check-in hari ini.');
          return;
        }

        res = await firstValueFrom(
          this.attendanceService.createAttendance({
            latitude,
            longitude,
            status: 'Hadir',
            month,
            year,
          })
        );

        this.checkInTime = formattedNow;
        localStorage.setItem('checkInTime', this.checkInTime);
        localStorage.setItem('presensiDate', today);

        this.navCtrl.navigateRoot('/tabs/beranda');
      }

      /** CHECK-OUT */
      if (type === 'check-out') {
        if (!existing?.check_in) {
          alert('⚠️ Belum ada data check-in hari ini.');
          return;
        }

        if (existing?.check_out) {
          alert('⚠️ Kamu sudah melakukan check-out hari ini.');
          return;
        }

        const attendanceId = existing?.id ?? this.todayRecordId;
        if (!attendanceId) await this.loadTodayAttendance();

        res = await firstValueFrom(
          this.attendanceService.updateAttendance({
            id: attendanceId,
            latitude,
            longitude,
            status: 'Hadir',
            month,
            year,
          })
        );

        this.checkOutTime = formattedNow;
        localStorage.setItem('checkOutTime', this.checkOutTime);

        this.navCtrl.navigateRoot('/tabs/beranda');
      }

      alert(res?.message || 'Presensi berhasil.');

      await this.loadTodayAttendance();
      this.syncButtonStates();
    } catch (err: any) {
      alert(err?.error?.message ?? err?.message ?? 'Terjadi kesalahan saat presensi.');
    } finally {
      this.isLoading = false;
      this.savePresensiData();
    }
  }

  isCheckoutAllowed(): boolean {
    const now = new Date();
    const cutoff = new Date();
    cutoff.setHours(17, 1, 0, 0);
    return now < cutoff;
  }
}
