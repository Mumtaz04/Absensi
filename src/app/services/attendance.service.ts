import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Attendance } from './attendance.model';
import { Observable, of, throwError, Subject } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class AttendanceService {
  /** 🌐 Base URL API Laravel */
  private baseUrl = 'http://127.0.0.1:8000/api/employee';

  /** 🔔 Broadcast perubahan presensi (Check In / Check Out) */
  private presensiChanged = new Subject<void>();
  presensiChanged$ = this.presensiChanged.asObservable();

  constructor(private http: HttpClient) {}

  notifyPresensiChanged() {
    this.presensiChanged.next();
  }

  /** 🔑 Header autentikasi */
  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token') ?? '';
    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });
  }

  /** 📆 Utility — tanggal hari ini */
  getTodayDateString(): string {
    const d = new Date();
    return [
      d.getFullYear(),
      String(d.getMonth() + 1).padStart(2, '0'),
      String(d.getDate()).padStart(2, '0')
    ].join('-');
  }

  /** 📅 Riwayat Presensi */
  getAttendanceHistory(month?: number, year?: number): Observable<Attendance[]> {
    const now = new Date();
    const m = month ?? now.getMonth() + 1;
    const y = year ?? now.getFullYear();

    const url = `${this.baseUrl}/attendances/history?month=${m}&year=${y}`;

    return this.http.get<any>(url, { headers: this.getHeaders() }).pipe(
      map((res) => Array.isArray(res?.data) ? res.data : []),
      catchError((err) => {
        console.error('❌ getAttendanceHistory error:', err);
        return of([]);
      })
    );
  }

  /** 🟢 Check-In */
  createAttendance(record: Partial<Attendance>): Observable<Attendance> {
    const url = `${this.baseUrl}/check-in`;
    const now = new Date();

    const latitude = Number(record.latitude);
    const longitude = Number(record.longitude);

    const formData = new FormData();
    formData.append('check_in', record.check_in ?? now.toISOString());
    formData.append('latitude', isNaN(latitude) ? '0' : latitude.toString());
    formData.append('longitude', isNaN(longitude) ? '0' : longitude.toString());
    formData.append('status', record.status ?? 'Hadir');

    const debugPayload: any = {};
    (formData as any).forEach((v: any, k: string) => (debugPayload[k] = v));
    console.log('📤 Payload Check-In:', debugPayload);

    return this.http.post<any>(url, formData, { headers: this.getHeaders() }).pipe(
      map((res) => res?.data ?? res),
      catchError((err) => {
        console.error('❌ createAttendance error:', err);
        return throwError(
          () => new Error(err?.error?.message || 'Gagal melakukan check-in.')
        );
      })
    );
  }

  /** 🔴 Check-Out */
  updateAttendance(payload: Partial<Attendance>): Observable<Attendance> {
    const url = `${this.baseUrl}/check-out`;
    const now = new Date();

    const latitude = Number(payload.latitude);
    const longitude = Number(payload.longitude);

    const formData = new FormData();
    formData.append('check_out', payload.check_out ?? now.toISOString());
    formData.append('latitude', isNaN(latitude) ? '0' : latitude.toString());
    formData.append('longitude', isNaN(longitude) ? '0' : longitude.toString());
    formData.append('status', payload.status ?? 'Hadir');

    const debugPayload: any = {};
    (formData as any).forEach((v: any, k: string) => (debugPayload[k] = v));
    console.log('📤 Payload Check-Out:', debugPayload);

    return this.http.post<any>(url, formData, { headers: this.getHeaders() }).pipe(
      map((res) => {
        this.notifyPresensiChanged(); // 👉 real-time refresh
        return res?.data ?? res;
      }),
      catchError((err) => {
        console.error('❌ updateAttendance error:', err);
        return throwError(
          () => new Error(err?.error?.message || 'Gagal melakukan check-out.')
        );
      })
    );
  }
}
