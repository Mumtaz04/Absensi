// src/app/pages/profil/profil.page.ts
import { Component, ElementRef, ViewChild, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, NavController, Platform, ToastController } from '@ionic/angular';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';

import { UserService } from '../../services/user.service';

@Component({
  selector: 'app-profil',
  templateUrl: './profil.page.html',
  styleUrls: ['./profil.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule]
})
export class ProfilPage implements OnInit {
  @ViewChild('fileInput', { static: false }) fileInput?: ElementRef<HTMLInputElement>;

  user: any = {
    name: 'mumtaz',
    email: 'mumtaz@example.com',
    position: 'Staff IT',
    phone: '+628192323950',
    address: 'Jl. Klipang Grenn. no 50 Semarang',
    created_at: new Date()
  };

  editPhone = '';
  editAddress = '';

  profileImage = 'assets/icon/asus.jpg';
  previewUrl: string | null = null;
  selectedFile: File | null = null;

  private readonly BACKEND_BASE = 'http://127.0.0.1:8000';
  private readonly PROFILE_URL = `${this.BACKEND_BASE}/api/employee/profile`;

  showImage = false;
  editMode = false;
  saving = false;

  constructor(
    private http: HttpClient,
    private platform: Platform,
    private navCtrl: NavController,
    private cd: ChangeDetectorRef,
    private userSvc: UserService,
    private toastCtrl: ToastController
  ) {}

  private buildPhotoUrl(raw: string | null | undefined): string | null {
    if (!raw) return null;
    const s = raw.toString().trim();
    if (!s) return null;
    if (/^https?:\/\//i.test(s)) return s;
    const base = (this.BACKEND_BASE || '').replace(/\/+$/, '');
    const clean = s.replace(/^\/+/, '').replace(/^storage\//, '');
    return `${base}/storage/${clean}`;
  }

  ngOnInit(): void {
    this.loadProfile();
  }

  ionViewWillEnter(): void {
    this.loadProfile();
  }

  private async urlExists(url: string): Promise<boolean> {
    try {
      const resp = await fetch(url, { method: 'HEAD', mode: 'cors' });
      return resp.ok;
    } catch (err) {
      return false;
    }
  }

  loadProfile() {
    const token = localStorage.getItem('token');
    console.log('DEBUG: token ->', token);
    if (!token) {
      const saved = localStorage.getItem('profileImageBase64');
      if (saved) this.profileImage = saved;
      const savedUser = localStorage.getItem('app_user_v1');
      if (savedUser) {
        try {
          this.user = JSON.parse(savedUser);
        } catch (e) { /* ignore parse error */ }
      }
      this.editPhone = this.user.phone ?? '';
      this.editAddress = this.user.address ?? '';
      return;
    }

    const headers = this.getJsonHeaders();

    this.http.get(this.PROFILE_URL, { headers }).subscribe({
      next: async (res: any) => {
        const data = res.data ?? res.user ?? res;
        if (!data) {
          const saved = localStorage.getItem('profileImageBase64');
          if (saved) this.profileImage = saved;
          return;
        }

        this.user = { ...this.user, ...data };
        try { this.userSvc.setUser(this.user); } catch (e) { /* ignore */ }

        const candidateFromServer = this.buildPhotoUrl(data.photo ?? data.photo_url ?? res.photo_url ?? null);
        console.log('DBG loadProfile candidateFromServer:', candidateFromServer);

        if (candidateFromServer) {
          this.profileImage = candidateFromServer;
          try { localStorage.setItem('profileImageUrl', candidateFromServer); } catch(e) {}
          try { this.userSvc.setPhoto(candidateFromServer); } catch (e) {}
        } else {
          const savedBase64 = localStorage.getItem('profileImageBase64');
          this.profileImage = savedBase64 ?? 'assets/icon/asus.jpg';
        }

        this.editPhone = this.user.phone ?? '';
        this.editAddress = this.user.address ?? '';

        try { localStorage.setItem('app_user_v1', JSON.stringify(this.user)); } catch(e){}
        try { this.cd.markForCheck(); } catch (e) { /* ignore */ }
      },
      error: (err) => {
        console.error('Gagal memuat profil (GET):', err);
        const saved = localStorage.getItem('profileImageBase64');
        if (saved) this.profileImage = saved;
      }
    });
  }

  openImage() { this.showImage = true; }
  closeImage() { this.showImage = false; }

  async toggleEdit() {
    if (!this.editMode) {
      this.editMode = true;
      this.editPhone = this.user.phone ?? '';
      this.editAddress = this.user.address ?? '';
      return;
    }
    await this.saveProfile();
  }

  logout() {
    try {
      localStorage.removeItem('token');
      localStorage.removeItem('profileImageUrl');
      localStorage.removeItem('profileImageBase64');
    } catch (e) {
      console.warn('Gagal membersihkan localStorage:', e);
    }

    try { this.userSvc.setUser(null); } catch (e) { /* ignore */ }
    try { this.userSvc.setPhoto(null); } catch (e) { /* ignore */ }

    this.navCtrl.navigateRoot('/login');
  }

  openPhotoChooser(event?: Event) {
    if (event) { event.stopPropagation(); event.preventDefault(); }
    if (!this.fileInput) {
      console.warn('fileInput tidak tersedia; pastikan <input #fileInput ...> ada di html.' );
      return;
    }
    try { this.fileInput.nativeElement.click(); } catch (e) { console.error(e); }
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input?.files || input.files.length === 0) return;

    const file = input.files[0];
    this.selectedFile = file;

    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.previewUrl = e.target.result;
      this.profileImage = this.previewUrl || this.profileImage;
      try {
        if (this.previewUrl) localStorage.setItem('profileImageBase64', this.previewUrl);
      } catch (e) {
        console.warn('Gagal menyimpan preview ke localStorage', e);
      }
    };
    reader.readAsDataURL(file);

    this.uploadImage();
  }

  async uploadImage() {
    if (!this.selectedFile) {
      console.warn('Tidak ada file untuk diupload.');
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      console.error('Token tidak ditemukan; user mungkin belum login.');
      return;
    }

    const fd = new FormData();
    fd.append('photo', this.selectedFile, this.selectedFile.name);

    try {
      const resp: any = await lastValueFrom(
        this.http.post(this.PROFILE_URL, fd, { headers: this.getFormHeaders(), observe: 'response' as any })
      );

      const body = resp.body ?? resp;

      if (body.photo_url || body.user?.photo || body.photo) {
        const candidate = this.buildPhotoUrl(body.photo_url ?? body.user?.photo ?? body.photo);
        if (candidate) {
          this.profileImage = candidate;
          try { localStorage.setItem('profileImageUrl', candidate); } catch(e) {}
          try { this.userSvc.setPhoto(candidate); } catch (e) {}
        }
        if (body.user) {
          this.user = { ...this.user, ...body.user };
          try { localStorage.setItem('app_user_v1', JSON.stringify(this.user)); } catch (e) {}
          try { this.userSvc.setUser(this.user); } catch (e) {}
          try { this.cd.markForCheck(); } catch (e) {}
        }
      } else {
        await this.loadProfile();
      }

      this.selectedFile = null;
      this.previewUrl = null;
      try { this.cd.markForCheck(); } catch (e) {}

      // kirim data phone & address (FormData kedua)
      const fd2 = new FormData();
      fd2.append('phone', this.editPhone ?? (this.user?.phone ?? ''));
      fd2.append('address', this.editAddress ?? (this.user?.address ?? ''));

try {
  const resp2: any = await lastValueFrom(
    this.http.post(this.PROFILE_URL, fd2, { headers: this.getFormHeaders() })
  );

  // Ambil user dari backend
  const updated = resp2.user ?? resp2.data ?? resp2 ?? {};

  // PATCH: Backend tidak menyimpan address -> gunakan nilai yang dikirim user
  if (!updated.address && (this.editAddress && this.editAddress.trim() !== '')) {
    updated.address = this.editAddress;
  }

  // Gabungkan dengan user lokal
  this.user = { ...this.user, ...updated };

  try { localStorage.setItem('app_user_v1', JSON.stringify(this.user)); } catch (e) {}
  try { this.userSvc.setUser(this.user); } catch (e) {}

} catch (err2) {
  console.warn('POST FormData kedua gagal:', err2);
}


    } catch (err: any) {
      console.error('Upload gagal (POST FormData):', err);
      const toast = await this.toastCtrl.create({ message: 'Upload foto gagal. Periksa koneksi.', duration: 2500, color: 'danger' });
      await toast.present();
    }
  }

  async saveProfile() {
    if (this.saving) return;
    this.saving = true;

    const token = localStorage.getItem('token');
    if (!token) {
      console.error('Token tidak ditemukan; tidak dapat menyimpan profil.');
      this.saving = false;
      return;
    }

    const fd = new FormData();
    fd.append('phone', this.editPhone ?? '');
    fd.append('address', this.editAddress ?? '');

    console.log('FormData sebelum dikirim (saveProfile):', {
      phone: this.editPhone,
      address: this.editAddress
    });

    try {
      const resp: any = await lastValueFrom(
        this.http.post(this.PROFILE_URL, fd, { headers: this.getFormHeaders() })
      );

      await this.handleProfileUpdateResponse(resp);
      return;
    } catch (err: any) {
      console.error('POST FormData /api/employee/profile gagal:', err);
      const toast = await this.toastCtrl.create({
        message: (err?.error?.message) ? `Gagal: ${err.error.message}` : 'Gagal menyimpan profil. Periksa koneksi / endpoint.',
        duration: 2500,
        color: 'danger'
      });
      await toast.present();
    } finally {
      this.saving = false;
      try { this.cd.markForCheck(); } catch (e) {}
    }
  }

  private getJsonHeaders(): HttpHeaders {
    const token = localStorage.getItem('token') ?? '';
    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest'
    });
  }

  private getFormHeaders(): HttpHeaders {
    const token = localStorage.getItem('token') ?? '';
    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'X-Requested-With': 'XMLHttpRequest'
    });
  }

  //melakukan perubahan pada handleProfileUpdateResponse
  // private async handleProfileUpdateResponse(resp: any) {
  //   console.log('Response update profile:', resp);
  //   const updatedUser = resp.user ?? resp.data ?? resp;

  //   this.user = { ...this.user, ...updatedUser };

  //   try {
  //     const existingRaw = localStorage.getItem('app_user_v1');
  //     let merged = this.user;
  //     if (existingRaw) {
  //       try {
  //         const existing = JSON.parse(existingRaw);
  //         merged = { ...existing, ...this.user };
  //       } catch (e) { merged = this.user; }
  //     }
  //     localStorage.setItem('app_user_v1', JSON.stringify(merged));
  //   } catch (e) {
  //     console.warn('Gagal update localStorage app_user_v1', e);
  //   }

  //   try { this.userSvc.setUser(this.user); } catch (e) { /* ignore */ }
  //   try { this.cd.markForCheck(); } catch(e){ /* ignore */ }

  //   const toast = await this.toastCtrl.create({ message: 'Profil berhasil diperbarui', duration: 1500, color: 'success' });
  //   await toast.present();

  //   this.editMode = false;
  // }
  private async handleProfileUpdateResponse(resp: any) {
  console.log('Response update profile:', resp);

  // ambil user dari response (bisa di body.user, body.data, atau body langsung)
  const updatedUser = resp.user ?? resp.data ?? resp ?? {};

  // Jika backend tidak mengembalikan address (null), gunakan editAddress yang dikirim client
  if (!updatedUser.address && (this.editAddress && this.editAddress.trim() !== '')) {
    // pastikan kita tidak menimpa phone/field lain yang valid
    updatedUser.address = this.editAddress;
  }

  // Gabungkan ke this.user
  this.user = { ...this.user, ...updatedUser };

  // Simpan snapshot ke localStorage (agar persist di app)
  try {
    const existingRaw = localStorage.getItem('app_user_v1');
    let merged = this.user;
    if (existingRaw) {
      try {
        const existing = JSON.parse(existingRaw);
        merged = { ...existing, ...this.user };
      } catch (e) {
        merged = this.user;
      }
    }
    localStorage.setItem('app_user_v1', JSON.stringify(merged));
  } catch (e) {
    console.warn('Gagal update localStorage app_user_v1', e);
  }

  // Broadcast ke UserService agar komponen lain update
  try { this.userSvc.setUser(this.user); } catch (e) { /* ignore */ }

  // Refresh view
  try { this.cd.markForCheck(); } catch(e){ /* ignore */ }

  const toast = await this.toastCtrl.create({ message: 'Profil berhasil diperbarui', duration: 1500, color: 'success' });
  await toast.present();

  this.editMode = false;
}

}
