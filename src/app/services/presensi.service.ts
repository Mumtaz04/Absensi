import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PresensiService {

  private apiUrl = 'http://localhost:8000/api/presensi'; // ganti sesuai URL API kamu

  constructor(private http: HttpClient) { }

  getRiwayatPresensi(): Observable<any> {
    return this.http.get<any>(this.apiUrl);
  }
}
