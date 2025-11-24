import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { HttpClient, HttpClientModule, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-profil',
  templateUrl: './profil.page.html',
  styleUrls: ['./profil.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonicModule,
    HttpClientModule,
    FormsModule
  ],
})
export class ProfilPage implements OnInit, OnDestroy {

  profileImage: string = '';
  user: any = {};
  showImage = false;

  editMode = false;
  editPhone: string = '';
  editAddress: string = '';

  apiUrl: string = 'http://127.0.0.1:8000/api';
  private destroy$ = new Subject<void>();
  private isLoading = false;

  // menyimpan image sementara saat preview
  private previousImage: string | null = null;

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadUserProfile();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // =========================
  // LOAD DATA USER
  // =========================
  loadUserProfile() {
    if (this.isLoading) return;
    this.isLoading = true;

    const token = localStorage.getItem('token');
    if (!token) {
      this.router.navigateByUrl('/login', { replaceUrl: true });
      this.isLoading = false;
      return;
    }

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });

    this.http.get(`${this.apiUrl}/user`, { headers })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: any) => {
          this.user = data.user ? data.user : data;

          this.profileImage = this.user.photo
            ? `${this.apiUrl.replace('/api', '')}/storage/${this.user.photo}`
            : 'assets/default-avatar.png';

          this.isLoading = false;
        },
        error: (err) => {
          this.isLoading = false;
          if (err.status === 401) {
            localStorage.removeItem('token');
            this.router.navigateByUrl('/login', { replaceUrl: true });
          }
        },
      });
  }

  // =========================
  // EDIT MODE
  // =========================
  toggleEdit() {
    if (this.editMode) {
      this.saveProfileChanges();
    } else {
      this.editPhone = this.user?.phone || '';
      this.editAddress = this.user?.address || '';
    }
    this.editMode = !this.editMode;
  }

  saveProfileChanges() {
    const token = localStorage.getItem('token');
    if (!token) return;

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });

    const body = {
      phone: this.editPhone,
      address: this.editAddress
    };

    this.http.put(`${this.apiUrl}/user/update`, body, { headers })
      .subscribe({
        next: () => {
          this.user.phone = this.editPhone;
          this.user.address = this.editAddress;
        },
        error: (err) => {
          console.error('Gagal update profil:', err);
        }
      });
  }

  // =========================
  // MODAL ZOOM FOTO PROFILE
  // =========================
  openImage() {
    // jika sedang memilih foto (openPhotoChooser memanggil file input dan stopPropagation),
    // maka openImage tidak dipanggil. tetap buka zoom hanya saat klik pada area foto.
    this.showImage = true;
  }

  closeImage() {
    this.showImage = false;
  }

  // =========================
  // FOTO EDIT / CHOOSER
  // =========================
  openPhotoChooser(event: Event) {
    // mencegah propagasi supaya tidak memicu openImage()
    event.stopPropagation();
    // langsung trigger file input (kamera atau gallery)
    this.triggerFileInput();
  }

  // =========================
  // UPLOAD FOTO (file picker dynamic)
  // =========================
  triggerFileInput() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.style.display = 'none';

    input.onchange = () => {
      const file = input.files?.[0];
      if (file) {
        // preview sebelum upload
        try {
          this.previousImage = this.profileImage;
          const previewUrl = URL.createObjectURL(file);
          this.profileImage = previewUrl;
        } catch (e) {
          console.warn('Preview tidak tersedia:', e);
        }

        // lakukan upload (async). jika gagal → revert ke previousImage
        this.uploadPhoto(file)
          .catch((err) => {
            console.error('Gagal upload foto (catch):', err);
            if (this.previousImage) {
              this.profileImage = this.previousImage;
            }
            // revoke preview (jika ada)
            try { URL.revokeObjectURL(this.profileImage); } catch(e) {}
          });
      }
      // hapus elemen input dari DOM bila diperlukan
      setTimeout(() => {
        if (input && input.parentNode) input.parentNode.removeChild(input);
      }, 1000);
    };

    // append ke body sehingga beberapa browser mobile bisa memproses
    document.body.appendChild(input);
    input.click();
  }

  // ubah uploadPhoto agar mengembalikan Promise untuk catchable
  uploadPhoto(file: File): Promise<void> {
    return new Promise((resolve, reject) => {
      const token = localStorage.getItem('token');
      if (!token) {
        reject('No token');
        return;
      }

      const formData = new FormData();
      formData.append('photo', file);

      const headers = new HttpHeaders({
        Authorization: `Bearer ${token}`,
      });

      this.http.post(`${this.apiUrl}/user/upload-photo`, formData, { headers })
        .subscribe({
          next: (res: any) => {
            // server bisa mengembalikan path di res.photo atau res.url
            const photoPath = res.photo || res.url || res.data?.photo;
            if (!photoPath) {
              // jika server balik data tidak standar, coba parse lain jika perlu
              console.warn('Respons upload tidak mengandung path foto.', res);
            }

            // set ke url server (storage)
            if (photoPath) {
              this.profileImage = `${this.apiUrl.replace('/api', '')}/storage/${photoPath}`;
              this.user.photo = photoPath;
            }

            // revoke preview object URL jika sebelumnya dibuat
            try { URL.revokeObjectURL(this.previousImage || ''); } catch (e) {}
            this.previousImage = null;
            resolve();
          },
          error: (err) => {
            console.error('Gagal upload foto:', err);
            // revert image preview
            if (this.previousImage) {
              this.profileImage = this.previousImage;
            }
            this.previousImage = null;
            reject(err);
          }
        });
    });
  }

  // =========================
  // LOGOUT
  // =========================
  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.router.navigateByUrl('/login', { replaceUrl: true });
  }
}
