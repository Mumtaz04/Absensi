// src/app/pages/presensi/presensi.page.ts
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

  // ----- UI / state -----
  isLoading = false;
  isCheckoutDisabled = false;
  currentTime = '';
  currentDate = '';
  checkInTime: string | null = null;
  checkOutTime: string | null = null;
  today = '';
  canCheckIn = true;
  canCheckOut = false;

  // fallback radius if service has none
  private readonly RADIUS = 500;

  todayRecordId: number | null = null;

  // pending flags
  isCheckInPending = false;
  isCheckOutPending = false;

  // guards untuk mencegah double submit / re-entrancy
  private isProcessingCheckIn = false;
  private isProcessingCheckOut = false;

  private presensiSub?: Subscription;
  private unloadHandler = this.savePresensiData.bind(this);

  // ----- fallback (konstanta titik kantor yang kamu minta) -----
  private readonly OFFICE_LATITUDE = -7.037943980089189;
  private readonly OFFICE_LONGITUDE = 110.47993371532893;
  private readonly OFFICE_RADIUS = 500; // meter (ubah sesuai aturan kantor jika perlu)

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

  private toWIB(dateString: string): Date {
    const d = new Date(dateString);
    return new Date(d.getTime() + 7 * 60 * 60 * 1000);
  }

  private computeDistanceToOffice(lat: number, lon: number): number | null {
  const oLatRaw = Number(this.attendanceService.officeLat || 0);
  const oLonRaw = Number(this.attendanceService.officeLng || 0);
  const oLat = (oLatRaw !== 0 && isFinite(oLatRaw)) ? oLatRaw : this.OFFICE_LATITUDE;
  const oLon = (oLonRaw !== 0 && isFinite(oLonRaw)) ? oLonRaw : this.OFFICE_LONGITUDE;

  if (!isFinite(oLat) || !isFinite(oLon)) {
    console.warn('[computeDistanceToOffice] office coordinates invalid; skipping distance calc.');
    return null;
  }

  try {
    const d = this.attendanceService.computeDistance(oLat, oLon, lat, lon);
    return d;
  } catch (e) {
    console.warn('[computeDistanceToOffice] computeDistance failed', e);
    return null;
  }
}

  private restorePresensiData() {
    this.isCheckInPending = false;
    this.isCheckOutPending = false;

    const today = this.attendanceService.getTodayDateString();

    const pending: any[] = Array.isArray(this.attendanceService.getPendingLocal?.() ?? [])
      ? this.attendanceService.getPendingLocal()
      : [];

    const pendingCheckIn = pending.find((p: any) => p.type === 'check-in' && p.date === today);
    const pendingCheckOut = pending.find((p: any) => p.type === 'check-out' && p.date === today);

    if (pendingCheckIn) this.isCheckInPending = true;
    if (pendingCheckOut) this.isCheckOutPending = true;

    const localTimes = JSON.parse(localStorage.getItem('attendance_times') || '{}');
    const timesForToday = localTimes?.[today] ?? null;

    this.checkInTime = timesForToday?.check_in ?? null;
    this.checkOutTime = timesForToday?.check_out ?? null;

    if (!this.checkInTime) {
      const legacyIn = localStorage.getItem('checkInTime');
      if (legacyIn) this.checkInTime = legacyIn;
    }
    if (!this.checkOutTime) {
      const legacyOut = localStorage.getItem('checkOutTime');
      if (legacyOut) this.checkOutTime = legacyOut;
    }
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

  private async loadTodayAttendance() {
    try {
      const now = new Date();
      const month = now.getMonth() + 1;
      const year = now.getFullYear();
      const today = this.attendanceService.getTodayDateString();

      const data: any = await firstValueFrom(
        this.attendanceService.getAttendanceHistory(month, year)
      );

      const todayRecord = Array.isArray(data)
        ? data.find((x: any) => {
            const created = x.created_at ?? x.check_in ?? x.date;
            return created && String(created).startsWith(today);
          })
        : null;

      if (todayRecord) {
        this.todayRecordId = todayRecord.id ?? null;

        if (todayRecord.check_in) {
          this.checkInTime = new Date(todayRecord.check_in)
            .toLocaleTimeString('id-ID', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
            });

          const date = this.attendanceService.getTodayDateString();
          const local = JSON.parse(localStorage.getItem('attendance_times') || '{}');
          local[date] = local[date] || {};
          local[date].check_in = this.checkInTime;
          localStorage.setItem('attendance_times', JSON.stringify(local));
        }

        if (todayRecord.check_out) {
          this.checkOutTime = new Date(todayRecord.check_out)
            .toLocaleTimeString('id-ID', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
            });

          const date = this.attendanceService.getTodayDateString();
          const local = JSON.parse(localStorage.getItem('attendance_times') || '{}');
          local[date] = local[date] || {};
          local[date].check_out = this.checkOutTime;
          localStorage.setItem('attendance_times', JSON.stringify(local));
        }
      } else {
        const localTimes = JSON.parse(localStorage.getItem('attendance_times') || '{}');
        const timesForToday = localTimes?.[today] ?? null;
        this.checkInTime = timesForToday?.check_in ?? localStorage.getItem('checkInTime');
        this.checkOutTime = timesForToday?.check_out ?? localStorage.getItem('checkOutTime');
      }

      this.restorePresensiData();
      this.syncButtonStates();
    } catch (err) {
      console.warn('⚠️ Gagal memuat presensi hari ini:', err);

      const today = this.attendanceService.getTodayDateString();
      const localTimes = JSON.parse(localStorage.getItem('attendance_times') || '{}');
      const timesForToday = localTimes?.[today] ?? null;
      this.checkInTime = timesForToday?.check_in ?? localStorage.getItem('checkInTime');
      this.checkOutTime = timesForToday?.check_out ?? localStorage.getItem('checkOutTime');

      this.restorePresensiData();
      this.syncButtonStates();
    }
  }

  private syncButtonStates() {
    if (!this.checkInTime && this.isCheckInPending) {
      this.canCheckIn = true;
      this.canCheckOut = false;
      return;
    }

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

  isCheckoutAllowed(): boolean {
    if (!this.checkInTime) return false;
    if (this.checkOutTime) return false;
    if (this.isLoading) return false;
    return true;
  }

  async checkIn() {
    if (this.isProcessingCheckIn) {
      console.debug('[presensi] checkIn ignored: already processing');
      return;
    }
    this.isProcessingCheckIn = true;

    try {
      if (this.isCheckInPending) {
        const res = await this.retryPendingUpload('check-in');
        if (!res.ok) this.showToast(res.message || 'Gagal upload pending.');
        return;
      }
      await this.handlePresensi('check-in');
    } finally {
      setTimeout(() => (this.isProcessingCheckIn = false), 800);
    }
  }

  async checkOut() {
    if (this.isProcessingCheckOut) {
      console.debug('[presensi] checkOut ignored: already processing');
      return;
    }
    this.isProcessingCheckOut = true;

    try {
      if (this.isCheckOutPending) {
        const res = await this.retryPendingUpload('check-out');
        if (!res.ok) this.showToast(res.message || 'Gagal upload pending.');
        return;
      }
      await this.handlePresensi('check-out');
    } finally {
      setTimeout(() => (this.isProcessingCheckOut = false), 800);
    }
  }

// presensi.page.ts — ganti getReliablePosition dengan ini
private async getReliablePosition(maxAttempts = 4, targetAccuracy = 50): Promise<{ latitude: number; longitude: number; accuracy?: number }> {
  let last: { latitude: number; longitude: number; accuracy?: number } | null = null;

  for (let i = 0; i < maxAttempts; i++) {
    try {
      // gunakan attendanceService.getCurrentLocation() yang sudah diperbaiki
      const loc = await this.attendanceService.getCurrentLocation();
      if (!loc) throw new Error('No location (null)');

      const latitude = Number(loc.latitude);
      const longitude = Number(loc.longitude);
      const accuracy = typeof loc.accuracy === 'number' ? Number(loc.accuracy) : undefined;

      last = { latitude, longitude, accuracy };
      console.log(`Position attempt ${i + 1}:`, last);

      if (typeof accuracy === 'number' && accuracy <= targetAccuracy) {
        // cukup akurat
        return last;
      }

      // kalau akurasinya undefined, kita juga terima pada upaya terakhir
      if (i === maxAttempts - 1) {
        return last;
      }

      // tunggu sebentar sebelum retry
      await new Promise((r) => setTimeout(r, 500));
    } catch (e) {
      console.warn('getCurrentPosition attempt failed', e);
      // jika akhir percobaan dan tidak punya last, keluar untuk fallback
      if (i === maxAttempts - 1 && !last) break;
      await new Promise((r) => setTimeout(r, 300));
    }
  }

  // fallback: gunakan office coords yang tersimpan (agar request tetap dikirim dan backend melakukan haversine)
  const fLat = Number(this.attendanceService.officeLat || this.OFFICE_LATITUDE);
  const fLon = Number(this.attendanceService.officeLng || this.OFFICE_LONGITUDE);
  console.warn('[getReliablePosition] using fallback office coords', { fLat, fLon });
  // beri tahu user (opsional)
  this.showToast('Tidak dapat mengambil GPS akurat — menggunakan lokasi kantor sebagai fallback.');

 return { latitude: fLat, longitude: fLon, accuracy: undefined };
}


  private async waitForSensor(timeoutMs = 3000): Promise<void> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const lat = Number(this.attendanceService.officeLat || 0);
      const lng = Number(this.attendanceService.officeLng || 0);
      if (lat !== 0 && lng !== 0) return;
      await new Promise((r) => setTimeout(r, 200));
    }
    console.warn('waitForSensor: timeout waiting office coords; officeLat/lng maybe not set.');
  }

  async retryPendingUpload(type: 'check-in' | 'check-out'): Promise<{ ok: boolean; message?: string }> {
    this.isLoading = true;
    try {
      await this.attendanceService.syncPendingLocal();

      await this.loadTodayAttendance();
      this.restorePresensiData();
      this.syncButtonStates();

      return { ok: true, message: 'Percobaan upload pending selesai. Cek kembali status presensi.' };
    } catch (e: any) {
      console.error('retryPendingUpload failed', e);
      const msg = e?.message ?? (typeof e === 'string' ? e : 'Gagal upload pending. Periksa koneksi atau coba lagi nanti.');
      return { ok: false, message: msg };
    } finally {
      this.isLoading = false;
    }
  }

  private async handlePresensi(type: 'check-in' | 'check-out') {
    this.isLoading = true;

    const extractErrorMessage = (error: unknown): string => {
      if (!error) return 'Terjadi kesalahan saat presensi.';
      if (typeof error === 'string') return error;
      if (error instanceof Error) return error.message || 'Terjadi kesalahan saat presensi.';
      try {
        const anyErr = error as any;
        return anyErr?.error?.message || anyErr?.message || anyErr?.statusText || JSON.stringify(anyErr);
      } catch {
        return 'Terjadi kesalahan saat presensi.';
      }
    };

    try {
      // Pastikan kita punya koordinat kantor (sensor) — tidak wajib sukses
      await this.waitForSensor(3000);

      const pos = await this.getReliablePosition(4, 50);
      const latitude = pos.latitude;
      const longitude = pos.longitude;
      const accuracy = pos.accuracy;

      // jika akurasi terlalu buruk, simpan pending (hindari data noise)
      const MAX_ACCEPTABLE_ACCURACY = 2000; // meter — kamu bisa turunkan ke 200 untuk lebih ketat
      if (typeof accuracy === 'number' && accuracy > MAX_ACCEPTABLE_ACCURACY) {
        const date = this.attendanceService.getTodayDateString();
        this.attendanceService.savePendingLocal(
          type === 'check-in' ? 'check-in' : 'check-out',
          Number(latitude),
          Number(longitude),
          'Hadir',
          date,
          accuracy ?? null
        );
        this.attendanceService.scheduleSyncPendingLocal(300);
        throw new Error(`Akurasi GPS terlalu rendah (${Math.round(accuracy)} m). Data disimpan dan akan dicoba nanti.`);
      }

      // HITUNG JARAK DI CLIENT (METER) MENGGUNAKAN HAVERSINE (SAMA DENGAN PHP)
      const clientDistance = this.computeDistanceToOffice(latitude, longitude);
      console.log('Lokasi client (reliable):', latitude, longitude, 'accuracy:', accuracy, 'clientDistance(m):', clientDistance);

      const now = new Date();
      const formattedNow = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false });
      const month = now.getMonth() + 1;
      const year = now.getFullYear();
      const today = this.attendanceService.getTodayDateString();

      const data: any = await firstValueFrom(this.attendanceService.getAttendanceHistory(month, year));
      const existing = Array.isArray(data) ? data.find((x: any) => {
        const created = x.created_at ?? x.check_in ?? x.date;
        return created && String(created).startsWith(today);
      }) : null;

      const payloadBase: any = {
        latitude,
        longitude,
        accuracy: accuracy ?? null,
        status: 'Hadir',
        month,
        year,
      };
      if (clientDistance !== null) payloadBase.distance = Math.round(clientDistance);

      // ---- CHECK-IN ----
      if (type === 'check-in') {
        if (existing?.check_in) {
          alert('⚠️ Kamu sudah melakukan check-in hari ini.');
          return;
        }

        try {
          const resp: any = await firstValueFrom(this.attendanceService.createAttendance(payloadBase));
          console.log('Response createAttendance:', resp);

          const serverDistance = typeof resp?.distance === 'number' ? resp.distance : undefined;
          const serverAllowedRadius = typeof resp?.allowed_radius === 'number' ? resp.allowed_radius : typeof resp?.radius === 'number' ? resp.radius : undefined;

          if (resp && resp.success === false) {
            alert(resp.message || 'Presensi tidak berhasil.');
            return;
          }

          if (typeof serverDistance === 'number' && typeof serverAllowedRadius === 'number' && resp.success !== true) {
            alert(resp.message || `Anda berada ${Math.round(serverDistance)}m dari kantor (batas ${Math.round(serverAllowedRadius)}m).`);
            return;
          }

          this.checkInTime = formattedNow;
          const local = JSON.parse(localStorage.getItem('attendance_times') || '{}');
          local[today] = local[today] || {};
          local[today].check_in = this.checkInTime;
          localStorage.setItem('attendance_times', JSON.stringify(local));
          localStorage.setItem('presensiDate', today);

          this.navCtrl.navigateRoot('/tabs/beranda');
          alert(resp?.message || 'Presensi berhasil.');

          await this.loadTodayAttendance();
          this.restorePresensiData();
          this.syncButtonStates();
        } catch (err: any) {
          console.error('Check-in failed (await):', err);
          alert(extractErrorMessage(err));
          this.restorePresensiData();
          this.syncButtonStates();
        }

        return;
      }

      // ---- CHECK-OUT ----
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
        if (!attendanceId) {
          alert('⚠️ Tidak menemukan ID presensi untuk update. Coba sinkronisasi ulang.');
          return;
        }

        try {
          const updatePayload = { id: attendanceId, ...payloadBase };

          const resp: any = await firstValueFrom(this.attendanceService.updateAttendance(updatePayload));
          console.log('Response updateAttendance:', resp);

          const serverDistance = typeof resp?.distance === 'number' ? resp.distance : undefined;
          const serverAllowedRadius = typeof resp?.allowed_radius === 'number' ? resp.allowed_radius : typeof resp?.radius === 'number' ? resp.radius : undefined;

          if (resp && resp.success === false) {
            alert(resp.message || 'Presensi tidak berhasil.');
            return;
          }
          if (typeof serverDistance === 'number' && typeof serverAllowedRadius === 'number' && resp.success !== true) {
            alert(resp.message || `Anda berada ${Math.round(serverDistance)}m dari kantor (batas ${Math.round(serverAllowedRadius)}m).`);
            return;
          }

          const local = JSON.parse(localStorage.getItem('attendance_times') || '{}');
          local[today] = local[today] || {};
          local[today].check_out = formattedNow;
          localStorage.setItem('attendance_times', JSON.stringify(local));
          this.checkOutTime = formattedNow;

          this.navCtrl.navigateRoot('/tabs/beranda');
          alert(resp?.message || 'Presensi berhasil.');

          await this.loadTodayAttendance();
          this.restorePresensiData();
          this.syncButtonStates();
        } catch (err: any) {
          console.error('Check-out failed (await):', err);
          alert(extractErrorMessage(err));
          this.restorePresensiData();
          this.syncButtonStates();
        }

        return;
      }

      alert('Tipe presensi tidak dikenal.');
    } catch (caughtErr) {
      console.error('Exception di handlePresensi:', caughtErr);
      const message = ((): string => {
        if (!caughtErr) return 'Terjadi kesalahan saat presensi.';
        if (typeof caughtErr === 'string') return caughtErr;
        if (caughtErr instanceof Error) return caughtErr.message || 'Terjadi kesalahan saat presensi.';
        try {
          const a: any = caughtErr as any;
          return a?.error?.message || a?.message || JSON.stringify(a) || 'Terjadi kesalahan saat presensi.';
        } catch {
          return 'Terjadi kesalahan saat presensi.';
        }
      })();
      alert(message);
    } finally {
      this.isLoading = false;
      this.savePresensiData();
    }
  }

  private showToast(message: string) {
    try {
      alert(message);
    } catch {
      console.log('[toast]', message);
    }
  }
}
