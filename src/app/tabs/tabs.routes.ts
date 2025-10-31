import { Routes } from '@angular/router';
import { TabsPage } from './tabs.page';

export const routes: Routes = [
  {
    path: '',
    component: TabsPage,
    children: [
      {
        path: 'beranda',
        loadComponent: () => import('./beranda/beranda.page').then(m => m.BerandaPage),
      },
      {
        path: 'presensi',
        loadComponent: () =>
          import('../tab2/tab2.page').then((m) => m.Tab2Page),
      },
      {
        path: 'akun',
        loadComponent: () =>
          import('../tab3/tab3.page').then((m) => m.Tab3Page),
      },
      {
        path: '',
        redirectTo: '/tabs/beranda',
        pathMatch: 'full',
      },
    ],
  },
  {
    path: '',
    redirectTo: '/tabs/beranda',
    pathMatch: 'full',
  },
  {
    path: 'riwayat-izin',
    loadComponent: () => import('./riwayat-izin/riwayat-izin.page').then( m => m.RiwayatIzinPage)
  },
];
