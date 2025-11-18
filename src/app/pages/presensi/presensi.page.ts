import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { Geolocation } from '@capacitor/geolocation';
import { AttendanceService } from '../../services/attendance.service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-presensi',
  templateUrl: './presensi.page.html',
  styleUrls: ['./presensi.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule],
})
export class PresensiPage implements OnInit, OnDestroy {
  isLoading = false;
  currentTime = '';
  currentDate = '';
  checkInTime: string | null = null;
  checkOutTime: string | null = null;
  today = '';
  canCheckIn = true;
  canCheckOut = false;

  private readonly OFFICE_LAT = -7.037943980089189;
  private readonly OFFICE_LON = 110.47993371532893;

  private unloadHandler = this.savePresensiData.bind(this);

  constructor(private attendanceService: AttendanceService) {}

  ngOnInit() {
    this.getAccuratePosition();
    this.updateDateTime();
    setInterval(() => this.updateDateTime(), 1000);

    this.today = this.attendanceService.getTodayDateString();
    this.clearOldPresensiData();
    this.restorePresensiData();
    this.syncButtonStates();

    window.addEventListener('beforeunload', this.unloadHandler);
    this.loadTodayAttendance();
  }

  ngOnDestroy() {
    window.removeEventListener('beforeunload', this.unloadHandler);
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
    }
  }

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
        ? data.find(
            (x: any) =>
              x.created_at?.startsWith(today) ||
              x.date === today ||
              x.check_in?.startsWith(today)
          )
        : null;

      if (todayRecord) {
        if (todayRecord.check_in) {
          this.checkInTime = new Date(todayRecord.check_in).toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          });
        }

        if (todayRecord.check_out) {
          this.checkOutTime = new Date(todayRecord.check_out).toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          });
        }
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

  private async getAccuratePosition(): Promise<{ latitude: number; longitude: number }> {
    try {
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      });
      console.log('📡 Posisi diperoleh:', position);

      let { latitude, longitude, accuracy } = position.coords;
      console.log(`📍 Lokasi (${accuracy}m):`, latitude, longitude);

      if (!latitude || !longitude || latitude === 0 || longitude === 0) {
        throw new Error('Koordinat tidak valid (0,0). Pastikan GPS aktif.');
      }

      // if (latitude > 0 && longitude > 100 && longitude < 120) {
      //   console.warn('⚠️ Latitude salah tanda — dikoreksi otomatis.');
      //   latitude = -Math.abs(latitude);
      // }

      // if (latitude > 50 && longitude < 0) {
      //   console.warn('⚠️ Koordinat tertukar! Menukar latitude ↔ longitude');
      //   [latitude, longitude] = [longitude, latitude];
      // }

      const dist = this.getDistanceFromOffice(latitude, longitude);
      console.log(`📏 Jarak dari kantor: ${dist.toFixed(2)} meter`);

      return { latitude: Number(latitude), longitude: Number(longitude) };
    } catch (err) {
      console.error('❌ Gagal mendapatkan lokasi:', err);
      alert('Gagal mendapatkan lokasi. Pastikan GPS aktif & izinkan lokasi.');
      throw err;
    }
  }

    private getDistanceFromOffice(lat: number, lon: number): number {
    const R = 6371000; // meter

    const latFrom = this.OFFICE_LAT * Math.PI / 180;
    const lonFrom = this.OFFICE_LON * Math.PI / 180;
    const latTo   = lat * Math.PI / 180;
    const lonTo   = lon * Math.PI / 180;

    const latDelta = latTo - latFrom;
    const lonDelta = lonTo - lonFrom;

    const a =
      Math.pow(Math.sin(latDelta / 2), 2) +
      Math.cos(latFrom) *
        Math.cos(latTo) *
        Math.pow(Math.sin(lonDelta / 2), 2);

    const angle = 2 * Math.asin(Math.sqrt(a));

    return angle * R;
  }

  // private getDistanceFromOffice(lat: number, lon: number): number {
  //   const R = 6371000;
  //   const dLat = ((lat - this.OFFICE_LAT) * Math.PI) / 180;
  //   const dLon = ((lon - this.OFFICE_LON) * Math.PI) / 180;

  //   const a =
  //     Math.sin(dLat / 2) ** 2 +
  //     Math.cos((this.OFFICE_LAT * Math.PI) / 180) *
  //       Math.cos((lat * Math.PI) / 180) *
  //       Math.sin(dLon / 2) ** 2;

  //   const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  //   return R * c;
  // }

  private async handlePresensi(type: 'check-in' | 'check-out') {
    this.isLoading = true;

    try {
      const { latitude, longitude } = await this.getAccuratePosition();

      const now = new Date();
      const nowIso = now.toISOString();
      const month = now.getMonth() + 1;
      const year = now.getFullYear();

      const data: any = await firstValueFrom(
        this.attendanceService.getAttendanceHistory(month, year)
      );

      const today = this.attendanceService.getTodayDateString();
      const existing = Array.isArray(data)
        ? data.find(
            (x: any) =>
              x.created_at?.startsWith(today) ||
              x.date === today ||
              x.check_in?.startsWith(today)
          )
        : null;

      let res: any;

      if (type === 'check-in') {
        if (existing?.check_in) {
          alert('⚠️ Kamu sudah melakukan check-in hari ini.');
          return;
        }

        res = await firstValueFrom(
          this.attendanceService.createAttendance({
            check_in: nowIso,
            latitude,
            longitude,
            status: 'Hadir',
            month,
            year,
          })
        );

        this.checkInTime = now.toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        });

        localStorage.setItem('checkInTime', this.checkInTime);
        localStorage.setItem('presensiDate', today);
      }

      if (type === 'check-out') {
        if (!existing?.check_in) {
          alert('⚠️ Belum ada data check-in hari ini.');
          return;
        }

        if (existing?.check_out) {
          alert('⚠️ Kamu sudah melakukan check-out hari ini.');
          return;
        }

        res = await firstValueFrom(
          this.attendanceService.updateAttendance({
            check_out: nowIso,
            latitude,
            longitude,
            status: 'Hadir',
            month,
            year,
          })
        );

        this.checkOutTime = now.toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        });

        localStorage.setItem('checkOutTime', this.checkOutTime);
      }

      alert(res?.message || `✅ ${type === 'check-in' ? 'Check-in' : 'Check-out'} berhasil.`);
      await this.loadTodayAttendance();
      this.syncButtonStates();
    } catch (err: any) {
      console.error('❌ Error presensi:', err);
      alert(err?.error?.message ?? err?.message ?? 'Terjadi kesalahan saat presensi.');
    } finally {
      this.isLoading = false;
      this.savePresensiData();
    }
  }
}
