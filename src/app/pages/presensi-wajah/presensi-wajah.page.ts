import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonIcon
} from '@ionic/angular/standalone';
import { RouterModule } from '@angular/router';
import { addIcons } from 'ionicons';
import {
  logInOutline,
  logOutOutline,
  timeOutline,
  homeOutline,
  personOutline
} from 'ionicons/icons';

@Component({
  selector: 'app-presensi-wajah',
  templateUrl: './presensi-wajah.page.html',
  styleUrls: ['./presensi-wajah.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonIcon
  ]
})
export class PresensiWajahPage implements OnInit {
  constructor() {
    addIcons({
      logInOutline,
      logOutOutline,
      timeOutline,
      homeOutline,
      personOutline
    });
  }

  ngOnInit() {}
}
