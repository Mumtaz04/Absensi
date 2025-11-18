import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { HttpClient, HttpClientModule, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-profil',
  templateUrl: './profil.page.html',
  styleUrls: ['./profil.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, HttpClientModule],
})
export class ProfilPage implements OnInit, OnDestroy {
  profileImage: string = '';
  user: any = {};
  showImage = false;
  apiUrl: string = 'http://127.0.0.1:8000/api';
  private destroy$ = new Subject<void>();
  private isLoading = false; // ⛔ Cegah request berulang

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  ngOnInit() {
    console.log('ProfilPage init');
    this.loadUserProfile();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadUserProfile() {
    // Cegah pemanggilan ganda
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

          // hanya tampilkan foto kalau benar-benar ada
          this.profileImage = this.user.photo
            ? `${this.apiUrl.replace('/api', '')}/storage/${this.user.photo}`
            : '';

          this.isLoading = false;
        },
        error: (err) => {
          this.isLoading = false;
          if (err.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            this.router.navigateByUrl('/login', { replaceUrl: true });
          } else {
            console.warn('Gagal memuat profil:', err.message || err);
          }
        },
      });
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.router.navigateByUrl('/login', { replaceUrl: true });
  }

  openImage() {
    if (this.profileImage) {
      this.showImage = true;
    }
  }

  closeImage() {
    this.showImage = false;
  }

  // ⛔ Kalau foto gagal dimuat, sembunyikan saja
  onImageError(event: any) {
    event.target.style.display = 'none';
  }
}
