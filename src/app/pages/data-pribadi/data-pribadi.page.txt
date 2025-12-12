import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonBackButton } from '@ionic/angular/standalone';

@Component({
  selector: 'app-data-pribadi',
  templateUrl: './data-pribadi.page.html',
  styleUrls: ['./data-pribadi.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule, IonButtons, IonBackButton]
})
export class DataPribadiPage implements OnInit {

  constructor() { }

  ngOnInit() {
  }

}
