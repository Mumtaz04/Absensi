import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class UserService {

  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // ======================
  // CHECK IN
  // ======================
checkIn(data: any) {
  const token = localStorage.getItem('token');
  const headers = new HttpHeaders({
    Authorization: `Bearer ${token}`
  });

  return this.http.post(`${this.baseUrl}/employee/check-in`, data, { headers });
}

  // ======================
  // CHECK OUT
  // ======================
checkOut(data: any) {
  const token = localStorage.getItem('token');
  const headers = new HttpHeaders({
    Authorization: `Bearer ${token}`
  });

  return this.http.post(`${this.baseUrl}/employee/check-out`, data, { headers });
  }
}
