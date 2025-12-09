import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./pages/login/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'tabs',
    loadChildren: () =>
      import('./tabs/tabs.routes').then((m) => m.routes),
  },
  {
    path: 'pengajuan-izin',
    loadComponent: () =>
      import('./pages/pengajuan-izin/pengajuan-izin.page').then(
        (m) => m.PengajuanIzinPage
      ),
  },
  {
    path: 'riwayat-izin',
    loadComponent: () =>
      import('./pages/riwayat-izin/riwayat-izin.page').then(
        (m) => m.RiwayatIzinPage
      ),
  },
  {
    path: 'data-pribadi',
    loadComponent: () =>
      import('./pages/data-pribadi/data-pribadi.page').then(
        (m) => m.DataPribadiPage
      ),
  },
  {
    path: 'presensi-wajah',
    loadComponent: () =>
      import('./tabs/presensi/presensi.page').then(
        (m) => m.PresensiPage
      ),
  },
  {
    path: 'riwayat-presensi',
    loadComponent: () =>
      import('./pages/riwayat-presensi/riwayat-presensi.page').then(
        (m) => m.RiwayatPresensiPage
      ),
  },
  {
    path: 'forgot-password',
    loadComponent: () => import('./pages/forgot-password/forgot-password.page').then( m => m.ForgotPasswordPage)
  },
  // ⚠️ Tidak perlu ulang route "profil" di sini
];
