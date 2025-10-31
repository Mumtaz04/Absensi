import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { HttpClient, HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-profil',
  templateUrl: './profil.page.html',
  styleUrls: ['./profil.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, HttpClientModule],
})
export class ProfilPage implements OnInit {
  profileImage: string = '';
  user: any = {};
  showImage = false;

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.loadUserProfile();
  }

  loadUserProfile() {
    const token = localStorage.getItem('token'); // ambil token login
    this.http.get('http://127.0.0.1:8000/api/user', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }).subscribe({
      next: (data: any) => {
        // Cek apakah data punya properti 'user' atau tidak
        this.user = data.user ? data.user : data;
        
        this.profileImage = this.user.photo
          ? `http://127.0.0.1:8000/storage/${this.user.photo}`
          : 'assets/default-profile.png';
      },
      error: (err) => {
        console.error('Gagal memuat profil:', err);
      }
    });
  }

  openImage() {
    this.showImage = true;
  }

  closeImage() {
    this.showImage = false;
  }
}
