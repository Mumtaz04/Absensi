import { Component, OnInit, OnDestroy } from '@angular/core';
import { IonicModule, NavController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IzinService } from '../../services/izin.service';

interface FilePendukung {
  nama: string;
  url?: string;
}

interface Izin {
  id?: string | number;
  alasan: string;
  tanggal?: string;
  dari?: string;
  sampai?: string;
  durasi?: string;
  deskripsi?: string;
  status?: 'Disetujui' | 'Ditolak' | 'Menunggu' | string;
  tanggal_tinjau?: string | null;
  alasan_ditolak?: string;
  filePendukung?: FilePendukung[];
  files?: string[];
  createdAt?: string;
  durasiHari?: number;
  __isNew?: boolean;
}

@Component({
  standalone: true,
  selector: 'app-riwayat-izin',
  templateUrl: './riwayat-izin.page.html',
  styleUrls: ['./riwayat-izin.page.scss'],
  imports: [IonicModule, CommonModule, FormsModule],
})
export class RiwayatIzinPage implements OnInit, OnDestroy {

  constructor(
    private navCtrl: NavController,
    private router: Router,
    private izinService: IzinService
  ) {}

  filter: string = 'Semua';
  filters: string[] = ['Semua', 'Disetujui', 'Menunggu', 'Ditolak'];

  daftarIzin: Izin[] = [];
  izinTerpilih: Izin | null = null;

  async ngOnInit(): Promise<void> {
    await this.loadRiwayatIzin();
  }

  ngOnDestroy(): void {
    try {
      document.body.classList.remove('detail-open');
      document.body.style.overflow = '';
    } catch {}
  }

  handleBack() {
    if (window.history.length > 1) {
      this.navCtrl.back();
    } else {
      this.router.navigate(['/beranda']);
    }
  }

  async loadRiwayatIzin() {
    try {
      const res = await this.izinService.getRiwayat();
      const data = res.data || [];

      this.daftarIzin = data.map((i: any) => {
        let statusLabel = 'Menunggu';
        if (i.status === 'approved') statusLabel = 'Disetujui';
        if (i.status === 'rejected') statusLabel = 'Ditolak';

        return {
          id: i.id,
          alasan: i.reason,
          dari: i.start_date,
          sampai: i.end_date,
          tanggal: `${this.formatDateShort(i.start_date)} - ${this.formatDateShort(i.end_date)}`,
          durasi: i.duration,
          status: statusLabel,
          createdAt: i.created_at,
          filePendukung: i.support_file
            ? [{
                nama: i.support_file_original_name,
                url: i.support_file_url
              }]
            : []
        };
      });
    } catch (err) {
      console.error('Gagal memuat riwayat izin', err);
    }
  }

  setFilter(f: string): void {
    this.filter = f;
  }

  filteredIzin(): Izin[] {
    if (!this.filter || this.filter.toLowerCase() === 'semua') {
      return this.daftarIzin;
    }
    return this.daftarIzin.filter(
      izin => (izin.status || '').toLowerCase() === this.filter.toLowerCase()
    );
  }

  toggleDetail(izin: Izin | null): void {
    this.izinTerpilih = izin;
    try {
      if (typeof document !== 'undefined' && document?.body) {
        if (izin) {
          document.body.classList.add('detail-open');
          document.body.style.overflow = 'hidden';
        } else {
          document.body.classList.remove('detail-open');
          document.body.style.overflow = '';
        }
      }
    } catch (err) {
      console.warn('toggleDetail error', err);
    }
  }

  public lihatFile(url?: string | undefined) {
    if (!url) return;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  public formatDateShort(d: string | Date | undefined): string {
    if (!d) return '-';
    const date = typeof d === 'string' ? new Date(d) : d;
    if (isNaN(date.getTime())) return String(d);
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  }

  public formatTimeShort(d: string | Date | undefined): string {
    if (!d) return '-';
    const date = typeof d === 'string' ? new Date(d) : d;
    if (isNaN(date.getTime())) return '-';
    return date.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  }

  public statusIcon(status?: string | null): string {
    const s = (status || 'Menunggu').toLowerCase();
    if (s === 'disetujui' || s === 'approved') {
      return 'checkmark-circle-outline';
    }
    if (s === 'ditolak' || s === 'rejected') {
      return 'close-circle-outline';
    }
    return 'time-outline';
  }

  onBackPressed(): void {
    this.navCtrl.back();
  }
}
