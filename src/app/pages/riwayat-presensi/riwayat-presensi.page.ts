import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, NavController } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { AttendanceService } from '../../services/attendance.service';
import { firstValueFrom, Subscription } from 'rxjs';
import { ChangeDetectorRef } from '@angular/core';

@Component({
  selector: 'app-riwayat-presensi',
  templateUrl: './riwayat-presensi.page.html',
  styleUrls: ['./riwayat-presensi.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule]
})
export class RiwayatPresensiPage implements OnInit, OnDestroy {

  calendar: Array<{
    day: number;
    check_in: string | null;
    check_out: string | null;
    status: string | null;
    description?: string | null;
  }> = [];

  monthLabel = '';
  year = 0;
  month = 0;

  private sub: Subscription | null = null;

  constructor(
    private navCtrl: NavController,
    private attendanceService: AttendanceService,
    private cd: ChangeDetectorRef
  ) {}

  ngOnInit() {
    const now = new Date();
    this.month = now.getMonth() + 1;
    this.year = now.getFullYear();

    this.monthLabel =
      now.toLocaleString('id-ID', { month: 'long' }) + ' ' + this.year;

    this.loadCalendar(this.month, this.year);

    // Subscribe supaya kalender otomatis refresh setelah check-in / check-out
    this.sub = this.attendanceService.presensiChanged$.subscribe(() => {
      console.log('[RiwayatPresensi] presensiChanged event received, reloading calendar');
      this.loadCalendar(this.month, this.year);
    });
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
  }

  //------------------------------------------------------------------
  // Ambil tanggal dari created_at / check_in / check_out
  // dan gabungkan dengan saved lokal jika ada
  //------------------------------------------------------------------
async loadCalendar(month: number, year: number) {
  try {
    const data: any[] = await firstValueFrom(
      this.attendanceService.getAttendanceCalendar(month, year)
    );

    const pad = (n: number) => String(n).padStart(2, '0');

    this.calendar = data.map((d) => {
      // ===== Tentukan tanggal =====
      let dateKey = '';
      let dayNum = 0;

      if (d.date) {
        // format: YYYY-MM-DD
        dateKey = d.date;
        dayNum = Number(d.date.split('-')[2]);
      } else if (d.created_at) {
        const dt = new Date(d.created_at);
        if (!isNaN(dt.getTime())) {
          dateKey = `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
          dayNum = dt.getDate();
        }
      }

      // fallback terakhir (jaga-jaga)
      if (!dateKey) {
        dateKey = `${year}-${pad(month)}-01`;
        dayNum = 1;
      }

      // ===== Merge dengan localStorage =====
      const local = this.attendanceService.getLocalTime(dateKey);

      // cek apakah ini hari ini
      const today = new Date();
      const todayKey = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
      const isToday = dateKey === todayKey;

      // PRIORITAS:
      // - hari ini -> localStorage
      // - selain hari ini -> backend
      const check_in = isToday
        ? (local?.check_in ?? this.formatLocalTime(d.check_in))
        : (d.check_in ? this.formatLocalTime(d.check_in) : null);

      const check_out = isToday
        ? (local?.check_out ?? this.formatLocalTime(d.check_out))
        : (d.check_out ? this.formatLocalTime(d.check_out) : null);


      return {
        day: dayNum,
        check_in,
        check_out,
        status: d.status ?? null,
        description: d.description ?? null,
      };
    });

    this.cd.markForCheck();

  } catch (err) {
    console.warn('❌ Gagal memuat kalender:', err);
    this.calendar = [];
  }
}


  //------------------------------------------------------------------
  // Format jam supaya tidak NaN / Invalid Date
  //  - terima format 'HH:MM' atau 'HH:MM:SS' (time-only)
  //  - terima ISO datetime / 'YYYY-MM-DD HH:MM:SS'
  //------------------------------------------------------------------
  formatLocalTime(timeStr: string | null) {
    if (!timeStr) return null;

    const s = timeStr.trim();

    // Jika format time-only seperti 'HH:MM' atau 'HH:MM:SS'
    const timeOnlyMatch = s.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
    if (timeOnlyMatch) {
      const hh = Number(timeOnlyMatch[1]);
      const mm = Number(timeOnlyMatch[2]);
      if (!isNaN(hh) && !isNaN(mm) && hh >= 0 && hh < 24 && mm >= 0 && mm < 60) {
        return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
      }
      return null;
    }

    // Jika datang sebagai epoch atau full datetime, coba parse dengan Date
    // juga handle 'YYYY-MM-DD HH:MM:SS' (beberapa PHP backend mengirim seperti ini)
    let parsed = new Date(s);
    if (isNaN(parsed.getTime())) {
      // coba replace spasi dengan 'T' untuk format 'YYYY-MM-DD HH:MM:SS'
      const alt = s.replace(' ', 'T');
      parsed = new Date(alt);
    }
    if (isNaN(parsed.getTime())) {
      return null;
    }

    return parsed.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  }

  // ... (method fmtTime() dan statusClass() tetap sama)
  fmtTime(timeStr: string | null | undefined) {
    if (!timeStr) return '-';

    // ubah titik ke kolon bila ada
    const t = String(timeStr).replace('.', ':');

    const parts = t.split(':');
    if (parts.length >= 2) {
      const hh = parts[0], mm = parts[1];
      if (!isNaN(Number(hh)) && !isNaN(Number(mm))) {
        return `${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}`;
      }
    }
    return '-';
  }


  statusClass(status: string | null) {
    if (!status) return '';
    const s = status.toLowerCase();
    if (s.includes('telat') || s.includes('late') || s.includes('terlambat'))
      return 'terlambat';
    if (s.includes('izin') || s.includes('cuti')) return 'cuti';
    if (s.includes('alfa')) return 'alfa';
    if (s.includes('libur') || s.includes('off')) return 'libur';
    return '';
  }
}
