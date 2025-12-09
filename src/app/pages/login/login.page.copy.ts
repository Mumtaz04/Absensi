// import { Component } from '@angular/core';
// import { Router } from '@angular/router';
// import { CommonModule } from '@angular/common';
// import { FormsModule } from '@angular/forms';
// import { IonicModule, ToastController, NavController } from '@ionic/angular';
// import { AuthService } from '../../core/auth.service';
// // optional: kalau mau langsung broadcast user ke app
// // import { UserService } from '../../services/user.service';

// @Component({
//   selector: 'app-login',
//   templateUrl: './login.page.html',
//   styleUrls: ['./login.page.scss'],
//   standalone: true,
//   imports: [CommonModule, FormsModule, IonicModule],
// })
// export class LoginPage {
//   email = '';
//   password = '';
//   showPassword = false;
//   errorMessage = '';
//   loading = false;

//   constructor(
//     private authService: AuthService,
//     private router: Router,
//     private toastCtrl: ToastController,
//     private navCtrl: NavController,   // wajib
//     // private userSvc: UserService   // uncomment bila ingin langsung set user di app
//   ) {}

//   goToForgotPassword() {
//     this.navCtrl.navigateForward('/forgot-password');
//   }

//   togglePasswordVisibility() {
//     this.showPassword = !this.showPassword;
//   }

//   async login() {
//     this.loading = true;
//     this.errorMessage = '';

//     this.authService.login(this.email, this.password).subscribe({
//       next: async (res: any) => {
//         this.loading = false;

//         // ambil token jika backend mengembalikan token (nama bisa token / access_token)
//         const token = res?.token ?? res?.access_token ?? '';

//         if (token) {
//           localStorage.setItem('token', token);
//         } else {
//           // jika tidak ada token (mis. Anda pakai cookie-based sanctum),
//           // pastikan authService.login telah mengatur cookie (withCredentials)
//           // dan tidak perlu menyimpan token.
//         }

//         // ambil email user dari response jika tersedia, jika tidak gunakan email yg dimasukkan
//         const emailFromResp =
//           res?.user?.email ?? res?.data?.user?.email ?? res?.email ?? null;
//         const emailToSave = emailFromResp ?? this.email ?? '';

//         if (emailToSave) {
//           localStorage.setItem('user_email', emailToSave);
//         }

//         // optional: jika backend mengembalikan objek user lengkap dan Anda ingin
//         // langsung mengulangi state UserService supaya UI update segera:
//         // const userObj = res?.user ?? res?.data?.user ?? null;
//         // if (userObj) this.userSvc.setUser(userObj);

//         const toast = await this.toastCtrl.create({
//           message: 'Login berhasil!',
//           duration: 1500,
//           color: 'success',
//         });
//         toast.present();

//         // navigasi ke beranda
//         this.router.navigate(['/tabs/beranda']);
//       },
//       error: async (err: any) => {
//         this.loading = false;
//         console.error('Login gagal:', err);

//         // tampilkan pesan yang lebih informatif bila backend mengirim pesan error
//         const serverMsg = err?.error?.message ?? '';
//         this.errorMessage = serverMsg || 'Email atau password salah.';

//         const toast = await this.toastCtrl.create({
//           message: this.errorMessage,
//           duration: 2000,
//           color: 'danger',
//         });
//         toast.present();
//       },
//     });
//   }
// }
