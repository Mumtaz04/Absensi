import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },
  {
    path: 'tabs',
    loadChildren: () => import('./tabs/tabs.routes').then(m => m.routes)
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.page').then( m => m.LoginPage)
  },
  {
    path: 'pengajuan-izin',
    loadComponent: () => import('./pages/pengajuan-izin/pengajuan-izin.page').then(m => m.PengajuanIzinPage),
  },
  {
    path: 'riwayat-izin',
    loadComponent: () => import('./tabs/riwayat-izin/riwayat-izin.page').then(m => m.RiwayatIzinPage)
  },
  {
    path: 'profil',
    loadComponent: () => import('./pages/profil/profil.page').then( m => m.ProfilPage)
  },
  {
    path: 'data-pribadi',
    loadComponent: () => import('./pages/data-pribadi/data-pribadi.page').then( m => m.DataPribadiPage)
  },
  {
    path: 'presensi-wajah',
    loadComponent: () => import('./pages/presensi-wajah/presensi-wajah.page').then( m => m.PresensiWajahPage)
  },
  {
  path: 'riwayat-presensi',
  loadComponent: () => import('./pages/riwayat-presensi/riwayat-presensi.page').then(m => m.RiwayatPresensiPage)
  },
  {
  path: 'profil',
  loadComponent: () => import('./pages/profil/profil.page').then(m => m.ProfilPage)
},
];
