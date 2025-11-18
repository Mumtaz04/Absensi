import { Routes } from '@angular/router';
import { TabsPage } from './tabs.page';

export const routes: Routes = [
  {
    path: '',
    component: TabsPage,
    children: [
      {
        path: 'beranda',
        loadComponent: () =>
          import('./beranda/beranda.page').then((m) => m.BerandaPage),
      },
      {
        path: 'presensi',
        loadComponent: () =>
          import('../pages/presensi/presensi.page').then(
            (m) => m.PresensiPage
          ),
      },
      {
        path: 'riwayat-izin',
        loadComponent: () =>
          import('./riwayat-izin/riwayat-izin.page').then(
            (m) => m.RiwayatIzinPage
          ),
      },
      {
        path: 'akun',
        // ⚙️ jika profil kamu ada di folder pages/profil/
        loadComponent: () =>
          import('../pages/profil/profil.page').then((m) => m.ProfilPage),

        // 🟡 kalau ternyata profil kamu masih di tab3, ganti dengan:
        // loadComponent: () =>
        //   import('../tab3/tab3.page').then((m) => m.Tab3Page),
      },
      {
        path: '',
        redirectTo: 'beranda',
        pathMatch: 'full',
      },
    ],
  },
];
