import { Component } from '@angular/core';
import { IonicModule, NavController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface FilePendukung {
  nama: string;
  url: string;
}

interface Izin {
  alasan: string;
  tanggal: string;
  durasi: string;
  deskripsi: string;
  status: 'Disetujui' | 'Ditolak' | 'Menunggu';
  tanggal_tinjau?: string;
  alasan_ditolak?: string;
  filePendukung: FilePendukung[];
}

@Component({
  standalone: true,
  selector: 'app-riwayat-izin',
  templateUrl: './riwayat-izin.page.html',
  styleUrls: ['./riwayat-izin.page.scss'],
  imports: [IonicModule, CommonModule, FormsModule],
})
export class RiwayatIzinPage {

  constructor(private navCtrl: NavController) {}   // ✅ ditambahkan

  /** 🔹 Filter aktif */
  filter: string = 'Semua';
  filters: string[] = ['Semua', 'Disetujui', 'Menunggu', 'Ditolak'];

  /** 🔹 Data izin */
  daftarIzin: Izin[] = [
    {
      alasan: 'Izin Cuti',
      tanggal: '8 Okt 2025 - 10 Okt 2025',
      durasi: '3 hari',
      deskripsi: 'Liburan keluarga',
      status: 'Disetujui',
      tanggal_tinjau: '5 Okt 2025, 14:20',
      filePendukung: [{ nama: 'Surat Cuti.pdf', url: 'assets/surat-cuti.jpg' }],
    },
    {
      alasan: 'Izin Urusan Keluarga',
      tanggal: '2 Okt 2025',
      durasi: '1 hari',
      deskripsi: 'Menghadiri acara keluarga',
      status: 'Ditolak',
      tanggal_tinjau: '1 Okt 2025, 16:45',
      alasan_ditolak: 'Jadwal proyek padat',
      filePendukung: [],
    },
    {
      alasan: 'Izin Sakit',
      tanggal: '12 Okt 2025',
      durasi: '1 hari',
      deskripsi: 'Sakit demam',
      status: 'Menunggu',
      tanggal_tinjau: '-',
      filePendukung: [],
    },
  ];

  izinTerpilih: Izin | null = null;

  /** 🔹 Ganti filter aktif */
  setFilter(f: string): void {
    this.filter = f;
  }

  /** 🔹 Filter daftar izin */
  filteredIzin(): Izin[] {
    if (!this.filter || this.filter.toLowerCase() === 'semua') {
      return this.daftarIzin;
    }

    return this.daftarIzin.filter(
      izin => izin.status.toLowerCase() === this.filter.toLowerCase()
    );
  }

  /** 🔹 Toggle detail */
  toggleDetail(izin: Izin | null): void {
    this.izinTerpilih = izin;
  }

  /** 🔹 Buka file pendukung */
  lihatFile(url: string): void {
    if (url) window.open(url, '_blank');
  }

  /** 🔹 FIX: Fungsi back yg hilang */
  onBackPressed(): void {
    this.navCtrl.back();
    // alternatif jika ingin paksa kembali:
    // window.history.back();
  }
}
