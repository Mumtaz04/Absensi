import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class IzinService {
  private baseUrl = 'http://localhost:8000/api';

  private get headers() {
    const token = localStorage.getItem('token');
    return {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    };
  }

  /** 🔹 Riwayat izin karyawan */
  async getRiwayat() {
    const res = await fetch(
      `${this.baseUrl}/employee/leave-requests/history`,
      { headers: this.headers }
    );

    if (!res.ok) throw new Error('Gagal ambil riwayat izin');
    return res.json();
  }

  /** 🔹 Ajukan izin (WAJIB FormData) */
  async ajukan(payload: {
    reason: string;
    description: string;
    start_date: string;
    end_date: string;
    duration: string;
    files?: File[];
  }) {
    const form = new FormData();

    form.append('reason', payload.reason);
    form.append('duration', payload.duration); // ⬅️ INI WAJIB
    form.append('start_date', payload.start_date);
    form.append('end_date', payload.end_date);

    // optional
    if (payload.files && payload.files.length) {
      form.append('support_file', payload.files[0]); 
    }

    const res = await fetch(
      `${this.baseUrl}/employee/leave-request`,
      {
        method: 'POST',
        headers: {
          Authorization: this.headers.Authorization,
          Accept: 'application/json',
        },
        body: form,
      }
    );

    const json = await res.json();
    if (!res.ok) throw json;

    return json;
  }
}
