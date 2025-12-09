// src/app/pages/profil/profil.page.ts
import { Component, ElementRef, ViewChild, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, NavController, Platform } from '@ionic/angular';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ChangeDetectorRef } from '@angular/core';

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

  editPhone = this.user.phone || '';
  editAddress = this.user.address || '';

  profileImage = 'assets/icon/asus.jpg';
  previewUrl: string | null = null;
  selectedFile: File | null = null;

  private readonly BACKEND_BASE = 'http://127.0.0.1:8000';
  private readonly PROFILE_URL = `${this.BACKEND_BASE}/api/employee/profile`;

  showImage = false;
  editMode = false;
  showOptions = false;

  constructor(
    private http: HttpClient,
    private platform: Platform,
    private navCtrl: NavController,
    private cd: ChangeDetectorRef,
    private userSvc: UserService
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
      return;
    }

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'X-Requested-With': 'XMLHttpRequest'
    });

    this.http.get(this.PROFILE_URL, { headers }).subscribe({
      next: async (res: any) => {
        const data = res.data ?? res.user ?? res;
        if (!data) {
          const saved = localStorage.getItem('profileImageBase64');
          if (saved) this.profileImage = saved;
          return;
        }

        // update local user and broadcast to app
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

        this.editPhone = this.user.phone ?? this.editPhone;
        this.editAddress = this.user.address ?? this.editAddress;

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
  toggleEdit() { this.editMode = !this.editMode; }
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

  // file chooser & upload handlers remain unchanged...
  openPhotoChooser(event?: Event) {
    if (event) { event.stopPropagation(); event.preventDefault(); }
    if (!this.fileInput) {
      console.warn('fileInput tidak tersedia; pastikan <input #fileInput ...> ada di html.');
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
    if (!this.selectedFile) { console.warn('Tidak ada file untuk diupload.'); return; }
    const token = localStorage.getItem('token');
    if (!token) { console.error('Token tidak ditemukan; user mungkin belum login.'); return; }

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'X-Requested-With': 'XMLHttpRequest'
    });

    const fd = new FormData();
    fd.append('photo', this.selectedFile, this.selectedFile.name);

    this.http.post(this.PROFILE_URL, fd, { headers, observe: 'response' }).subscribe({
      next: async (resp: any) => {
        const body = resp.body ?? resp;
        if (body.photo_url || body.user?.photo || body.photo) {
          const candidate = this.buildPhotoUrl(body.photo_url ?? body.user?.photo ?? body.photo);
          if (candidate) {
            this.profileImage = candidate;
            try { localStorage.setItem('profileImageUrl', candidate); } catch(e) {}
            try { this.userSvc.setPhoto(candidate); } catch (e) {}
          } else {
            const savedBase64 = localStorage.getItem('profileImageBase64');
            this.profileImage = savedBase64 ?? 'assets/icon/asus.jpg';
          }
          if (body.user) this.user = { ...this.user, ...body.user };
        } else if (body.user && body.user.photo) {
          const clean = body.user.photo.toString().replace(/^\/+/, '').replace(/^storage\//, '');
          const serverUrl = `${this.BACKEND_BASE.replace(/\/+$/, '')}/storage/${clean}`;
          if (await this.urlExists(serverUrl)) {
            this.profileImage = serverUrl;
            localStorage.setItem('profileImageUrl', serverUrl);
            try { this.userSvc.setPhoto(serverUrl); } catch (e) {}
          } else {
            const savedBase64 = localStorage.getItem('profileImageBase64');
            if (savedBase64) this.profileImage = savedBase64;
          }
          this.user = { ...this.user, ...body.user };
          try { this.userSvc.setUser(this.user); } catch (e) {}
        } else if (body.photo) {
          const clean = body.photo.toString().replace(/^\/+/, '').replace(/^storage\//, '');
          const serverUrl = `${this.BACKEND_BASE.replace(/\/+$/, '')}/storage/${clean}`;
          if (await this.urlExists(serverUrl)) {
            this.profileImage = serverUrl;
            localStorage.setItem('profileImageUrl', serverUrl);
            try { this.userSvc.setPhoto(serverUrl); } catch (e) {}
          } else {
            const savedBase64 = localStorage.getItem('profileImageBase64');
            if (savedBase64) this.profileImage = savedBase64;
          }
          this.loadProfile();
        } else {
          this.loadProfile();
        }

        this.selectedFile = null;
        this.previewUrl = null;
        try { this.cd.markForCheck(); } catch (e) {}
      },
      error: (err) => {
        console.error('Upload gagal (POST):', err);
      }
    });
  }
}
