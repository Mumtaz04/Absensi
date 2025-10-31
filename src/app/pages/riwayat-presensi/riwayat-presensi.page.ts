import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-riwayat-presensi',
  templateUrl: './riwayat-presensi.page.html',
  styleUrls: ['./riwayat-presensi.page.scss'],
  standalone: true, // ✅ artinya ini tidak butuh module terpisah
  imports: [
    CommonModule,
    FormsModule,
    IonicModule // ✅ ini supaya tag <ion-...> dikenali
  ]
})
export class RiwayatPresensiPage {
  // Contoh data dummy sementara
  riwayatPresensi = [
    { tanggal: '2025-10-28', jamMasuk: '08:00', jamKeluar: '16:00', status: 'Hadir' },
    { tanggal: '2025-10-27', jamMasuk: '08:15', jamKeluar: '16:05', status: 'Hadir' },
    { tanggal: '2025-10-26', jamMasuk: '-', jamKeluar: '-', status: 'Libur' },
  ];

  constructor() {}
}
