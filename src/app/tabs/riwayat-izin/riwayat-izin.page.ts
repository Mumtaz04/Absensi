import { Component } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  standalone: true,
  selector: 'app-riwayat-izin',
  templateUrl: './riwayat-izin.page.html',
  styleUrls: ['./riwayat-izin.page.scss'],
  imports: [IonicModule, CommonModule, FormsModule],
})
export class RiwayatIzinPage {
  filter: string = 'semua';
  showDetail: boolean = false;
  izinTerpilih: any = null;

  daftarIzin = [
    {
      alasan: 'Izin Cuti',
      tanggal: '8 Okt 2025 - 10 Okt 2025',
      durasi: '3 hari',
      deskripsi: 'Liburan keluarga',
      status: 'Disetujui',
      tanggal_tinjau: '5 Okt 2025, 14:20',
      alasan_ditolak: '',
      filePendukung: [
        { nama: 'Surat Cuti.pdf', url: 'assets/surat-cuti.jpg' },
      ],
    },
    {
      alasan: 'Izin Urusan Keluarga',
      tanggal: '2 Okt 2025',
      durasi: '1 hari',
      deskripsi: 'Menghadiri acara keluarga',
      status: 'Ditolak',
      tanggal_tinjau: '1 Okt 2025, 16:45',
      alasan_ditolak: 'Jadwal proyek padat',
      filePendukung: [
        { nama: 'Undangan Acara.jpg', url: 'assets/files/undangan.jpg' },
      ],
    },
    {
      alasan: 'Izin Sakit',
      tanggal: '12 Okt 2025',
      durasi: '1 hari',
      deskripsi: 'Sakit demam',
      status: 'Menunggu',
      tanggal_tinjau: '-',
      alasan_ditolak: '',
      filePendukung: [],
    },
  ];

  filteredIzin() {
    if (this.filter === 'semua') return this.daftarIzin;
    return this.daftarIzin.filter(
      izin => izin.status.toLowerCase() === this.filter
    );
  }

  lihatDetail(event: Event, izin: any) {
    event.preventDefault();
    event.stopPropagation();
    this.izinTerpilih = izin;
    this.showDetail = true;
  }

  tutupDetail() {
    this.showDetail = false;
    this.izinTerpilih = null;
  }

  lihatFile(url: string) {
    window.open(url, '_blank');
  }
}
