// src/app/app.component.ts
import { Component } from '@angular/core';
import { Platform } from '@ionic/angular';           // <-- pastikan ini ada
import { IonicModule } from '@ionic/angular';       // <-- tambahkan
import { RouterModule } from '@angular/router';     // <-- tambahkan
import { AttendanceService } from './services/attendance.service'; // contoh path

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  standalone: true,                // <-- jadikan standalone component
  imports: [IonicModule, RouterModule] // <-- wajib: beri akses ke tag ion-*
})
export class AppComponent {
  constructor(private platform: Platform, private attendanceSvc: AttendanceService) {
    this.initializeApp();
  }

  initializeApp() {
    this.platform.ready().then(() => {
      // contoh: panggil sinkronisasi pending
      this.attendanceSvc.syncPendingLocal?.();
      // listen online
      window.addEventListener('online', () => this.attendanceSvc.syncPendingLocal?.());
    });
  }
}
