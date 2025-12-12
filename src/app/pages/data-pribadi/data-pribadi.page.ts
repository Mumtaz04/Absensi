// import { Component } from '@angular/core';
// import { ProfileService } from '../../services/profile.service';
// import { ToastController } from '@ionic/angular';

// @Component({
//   selector: 'app-data-pribadi',
//   templateUrl: './data-pribadi.page.html'
// })
// export class DataPribadiPage {
//   address = '';
//   token = ''; // ambil dari storage/session sesuai implementasimu
// src/app/pages/data-pribadi/data-pribadi.page.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-data-pribadi',
  templateUrl: './data-pribadi.page.html',
  styleUrls: ['./data-pribadi.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule]
})
export class DataPribadiPage {
  user = {
    name: 'Mumtaz',
    email: 'mail@email.com',
    position: 'Karyawan',
    status: 'Aktif'
  };

  constructor() {}
}
