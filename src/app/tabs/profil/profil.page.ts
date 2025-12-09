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

  // default profile (tetap nama mumtaz sesuai permintaan)
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

  // fallback local image (ganti jika ingin)
  profileImage = 'assets/icon/asus.jpg';
  previewUrl: string | null = null;
  selectedFile: File | null = null;

  // ============ UBAH INI =============
  // ganti sesuai alamat backend (contoh: http://localhost:8000)
  private readonly BACKEND_BASE = 'http://127.0.0.1:8000';
  private readonly PROFILE_URL = `${this.BACKEND_BASE}/api/employee/profile`;
  // ===================================

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

    // ---------------------------
  // helper: bangun absolute URL foto
  // letakkan DI SINI (setelah constructor, sebelum ngOnInit)
  // ---------------------------
  private buildPhotoUrl(raw: string | null | undefined): string | null {
    if (!raw) return null;
    const s = raw.toString().trim();
    if (!s) return null;
    // sudah absolute?
    if (/^https?:\/\//i.test(s)) return s;
    // gabungkan backend base + /storage/ + clean path
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

  // -------------------------
  // helper: cek apakah url image bisa diakses (HEAD)
  // return true jika ok, false bila error
  // menggunakan fetch HEAD (CORS harus diizinkan oleh server)
  // -------------------------
  private async urlExists(url: string): Promise<boolean> {
    try {
      const resp = await fetch(url, { method: 'HEAD', mode: 'cors' });
      return resp.ok;
    } catch (err) {
      return false;
    }
  }

  // ===============================
  //  Load profile from backend with fallback to localStorage
  //  dan broadcast ke UserService supaya Beranda sinkron
  // ===============================
  loadProfile() {
    const token = localStorage.getItem('token');
    console.log('DEBUG: token ->', token);
    if (!token) {
      console.warn('Token tidak ditemukan. Pastikan user login dan token tersimpan di localStorage.');
      // jika token tidak ada, coba gunakan local stored image
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
          // fallback to local saved image if any
          const saved = localStorage.getItem('profileImageBase64');
          if (saved) this.profileImage = saved;
          return;
        }

        // update local user and broadcast to app
        this.user = { ...this.user, ...data };
        try { this.userSvc.setUser(this.user); } catch (e) { /* ignore */ }

        // <<< REPLACE HERE: gunakan buildPhotoUrl() agar hasil selalu absolute URL >>>
        // coba kandidat dari server (photo_url atau photo), fallback ke stored base64 atau default
        const candidateFromServer = this.buildPhotoUrl(data.photo ?? data.photo_url ?? res.photo_url ?? null);
        console.log('DBG loadProfile candidateFromServer:', candidateFromServer);

        if (candidateFromServer) {
          // assign langsung — <img> akan request resource; onPhotoError akan fallback
          this.profileImage = candidateFromServer;
          try { localStorage.setItem('profileImageUrl', candidateFromServer); } catch(e) {}
          try { this.userSvc.setPhoto(candidateFromServer); } catch (e) {}
        } else {
          // fallback ke preview base64 atau default lokal
          const savedBase64 = localStorage.getItem('profileImageBase64');
          this.profileImage = savedBase64 ?? 'assets/icon/asus.jpg';
        }


        // sync editable fields
        this.editPhone = this.user.phone ?? this.editPhone;
        this.editAddress = this.user.address ?? this.editAddress;

        try { this.cd.markForCheck(); } catch (e) { /* ignore */ }
      },
      error: (err) => {
        console.error('Gagal memuat profil (GET):', err);
        // fallback local image if available
        const saved = localStorage.getItem('profileImageBase64');
        if (saved) this.profileImage = saved;
      }
    });
  }

  openImage() { this.showImage = true; }
  closeImage() { this.showImage = false; }
  toggleEdit() { this.editMode = !this.editMode; }
    logout() {
    // Hapus token & data lokal
    try {
      localStorage.removeItem('token');
      localStorage.removeItem('profileImageUrl');
      localStorage.removeItem('profileImageBase64');
    } catch (e) {
      console.warn('Gagal membersihkan localStorage:', e);
    }

    // Reset state user di UserService agar Beranda/Komponen lain update
    try { this.userSvc.setUser(null); } catch (e) { /* ignore */ }
    try { this.userSvc.setPhoto(null); } catch (e) { /* ignore */ }

    // Navigasi ke halaman login (ubah path sesuai app-mu)
    // Gunakan navigateRoot supaya history/stack direset
    this.navCtrl.navigateRoot('/login');
  }


  // open file chooser (calls <input #fileInput>)
  openPhotoChooser(event?: Event) {
    if (event) { event.stopPropagation(); event.preventDefault(); }
    if (!this.fileInput) {
      console.warn('fileInput tidak tersedia; pastikan <input #fileInput ...> ada di html.');
      return;
    }
    try { this.fileInput.nativeElement.click(); } catch (e) { console.error(e); }
  }

  // user picked file -> preview + upload
  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input?.files || input.files.length === 0) return;

    const file = input.files[0];
    this.selectedFile = file;

    // preview as base64
    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.previewUrl = e.target.result;
      this.profileImage = this.previewUrl || this.profileImage; // temporary preview
      // save preview to localStorage as fallback
      try {
        if (this.previewUrl) localStorage.setItem('profileImageBase64', this.previewUrl);
      } catch (e) {
        console.warn('Gagal menyimpan preview ke localStorage', e);
      }
    };
    reader.readAsDataURL(file);

    // immediately upload (atau ubah jika mau tunggu tombol simpan)
    this.uploadImage();
  }

  // upload file to backend and then reload profile to reflect DB
  uploadImage() {
    if (!this.selectedFile) {
      console.warn('Tidak ada file untuk diupload.');
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      console.error('Token tidak ditemukan; user mungkin belum login.');
      return;
    }

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
          console.log('DBG upload candidate:', candidate);
          if (candidate) {
            this.profileImage = candidate;
            try { localStorage.setItem('profileImageUrl', candidate); } catch(e) {}
            try { this.userSvc.setPhoto(candidate); } catch (e) {}
          } else {
            const savedBase64 = localStorage.getItem('profileImageBase64');
            this.profileImage = savedBase64 ?? 'assets/icon/asus.jpg';
          }
          // update local user if server sent user object
          if (body.user) this.user = { ...this.user, ...body.user };
        }

        else if (body.user && body.user.photo) {
          // server returns path (photos/xxx.jpg) -> convert to storage URL
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
          // also broadcast entire user object
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
          // try reload to sync full user data
          this.loadProfile();
        } else {
          // fallback: reload profile from server
          this.loadProfile();
        }

        // clear selected file (preview remains in localStorage as fallback)
        this.selectedFile = null;
        this.previewUrl = null;
        try { this.cd.markForCheck(); } catch (e) {}
      },
      error: (err) => {
        console.error('Upload gagal (POST):', err);
        // if upload fails, keep the local preview (already stored) so UI doesn't lose image
      }
    });
  }

  // removePhoto() -- (opsional) implementasikan jika backend sediakan endpoint hapus
}
