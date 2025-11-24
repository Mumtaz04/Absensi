import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { NavController } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { AttendanceService } from '../../services/attendance.service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-riwayat-presensi',
  templateUrl: './riwayat-presensi.page.html',
  styleUrls: ['./riwayat-presensi.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonicModule
  ]
})
export class RiwayatPresensiPage implements OnInit {
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

  constructor(private navCtrl: NavController, private attendanceService: AttendanceService) {}

  ngOnInit() {
    const now = new Date();
    this.month = now.getMonth() + 1;
    this.year = now.getFullYear();
    this.monthLabel = now.toLocaleString('id-ID', { month: 'long' }) + ' ' + this.year;
    this.loadCalendar(this.month, this.year);
  }

  goBack() {
    this.navCtrl.navigateBack('/tabs/presensi');
  }

  async loadCalendar(month: number, year: number) {
    try {
      const data: any[] = await firstValueFrom(this.attendanceService.getAttendanceCalendar(month, year));
      // data expected: array of objects { date: 'YYYY-MM-DD', check_in, check_out, status, description }
      // build calendar array with day number
      this.calendar = data.map((d) => {
        const day = new Date(d.date).getDate();
        return {
          day,
          check_in: d.check_in ?? null,
          check_out: d.check_out ?? null,
          status: d.status ?? null,
          description: d.description ?? null
        };
      });
    } catch (err) {
      console.error('Gagal ambil calendar:', err);
      this.calendar = []; // fallback
    }
  }

  // util untuk format jam (backend format HH:mm:ss)
  fmtTime(timeStr: string | null) {
    if (!timeStr) return '-';
    // jika sudah HH:mm:ss, ambil HH:mm
    const parts = timeStr.split(':');
    if (parts.length >= 2) return `${parts[0].padStart(2,'0')}:${parts[1].padStart(2,'0')}`;
    return timeStr;
  }

  // fungsi WIB
  toWIB(isoString: string | null) {
    if (!isoString) return '-';

    // Backend mengirim format: "2025-11-24 12:58:00"
    // Kita TIDAK BOLEH pakai new Date() karena akan geser timezone.
    // Ambil jam & menit langsung dari string.

    const parts = isoString.split(' ');
    if (parts.length < 2) return '-';

    const time = parts[1]; // "12:58:00"
    const [h, m] = time.split(':');

    // kembalikan format jam:menit
    return `${h.padStart(2, '0')}:${m.padStart(2, '0')}`;
  }
}
