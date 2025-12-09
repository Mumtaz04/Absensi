// src/app/services/attendance.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Attendance } from './attendance.model';
import { Observable, of, throwError, Subject, firstValueFrom } from 'rxjs';
import { map, catchError, tap, timeout as rxTimeout } from 'rxjs/operators';
import { Platform } from '@ionic/angular';
import { Geolocation } from '@capacitor/geolocation';

@Injectable({
  providedIn: 'root',
})
export class AttendanceService {
  computeDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000; // meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private baseUrl = 'http://127.0.0.1:8000/api/employee';
  private presensiChanged = new Subject<void>();
  presensiChanged$ = this.presensiChanged.asObservable();

  officeLat: number = -7.037943980089189;
  officeLng: number = 110.47993371532893;
  officeRadius: number = 500;

  private routeMap = {
    history: '/attendances/history',
    calendar: '/attendances/calendar',
    checkIn: '/check-in',
    checkOut: '/check-out',
    sync: '/attendances/sync',
  };

  private _isSyncingPendingLocal = false;
  private minSyncIntervalMs = 3000;
  private _lastSyncAt = 0;
  private _scheduledSync: any = null;
  private maxRetriesPerEntry = 3;

  constructor(private http: HttpClient, private platform: Platform) {
    this.loadSensorSetting();
    window.addEventListener('online', () => {
      console.log('[AttendanceService] online -> scheduling syncPendingLocal');
      this.scheduleSyncPendingLocal(200);
    });
  }

  notifyPresensiChanged() {
    this.presensiChanged.next();
  }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token') ?? '';
    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    });
  }

  private getBackgroundHeaders(): HttpHeaders {
    return this.getHeaders().set('X-Background-Sync', '1');
  }

  private async tryPostWithFallback(urls: string[], body: any, options: any, perAttemptTimeoutMs = 5000): Promise<any> {
    let lastErr: any = null;
    for (const u of urls) {
      const full = this.baseUrl + u;
      const started = Date.now();
      try {
        console.debug(`[AttendanceService] tryPostWithFallback -> trying ${full}`);
        const obs = this.http.post<any>(full, body, options).pipe((rxTimeout as any)(perAttemptTimeoutMs)) as Observable<any>;
        const res = await firstValueFrom(obs);
        console.debug(`[AttendanceService] tryPostWithFallback -> success ${full} (${Date.now() - started}ms)`);
        return res;
      } catch (e: any) {
        const took = Date.now() - started;
        console.warn(`[AttendanceService] tryPostWithFallback -> failed ${full} (${took}ms)`, e);
        lastErr = e;
      }
    }
    throw lastErr;
  }

  private async tryGetWithFallback(urls: string[], options: any, perAttemptTimeoutMs = 5000): Promise<any> {
    let lastErr: any = null;
    for (const u of urls) {
      const full = this.baseUrl + u;
      const started = Date.now();
      try {
        console.debug(`[AttendanceService] tryGetWithFallback -> trying ${full}`);
        const obs = this.http.get<any>(full, options).pipe((rxTimeout as any)(perAttemptTimeoutMs)) as Observable<any>;
        const res = await firstValueFrom(obs);
        console.debug(`[AttendanceService] tryGetWithFallback -> success ${full} (${Date.now() - started}ms)`);
        return res;
      } catch (e: any) {
        const took = Date.now() - started;
        console.warn(`[AttendanceService] tryGetWithFallback -> failed ${full} (${took}ms)`, e);
        lastErr = e;
      }
    }
    throw lastErr;
  }

  getTodayDateString(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }

  getAttendanceHistory(month?: number, year?: number): Observable<Attendance[]> {
    const now = new Date();
    const m = month ?? now.getMonth() + 1;
    const y = year ?? now.getFullYear();

    const primary = `${this.routeMap.history}?month=${m}&year=${y}`;
    const alt = `/attendances?month=${m}&year=${y}`;

    return new Observable<Attendance[]>((sub) => {
      (async () => {
        try {
          const res = await this.tryGetWithFallback([primary, alt], { headers: this.getHeaders() });
          const body = res as any;
          if (Array.isArray(body)) sub.next(body);
          else if (Array.isArray(body?.data)) sub.next(body.data);
          else sub.next([]);
          sub.complete();
        } catch (err) {
          console.error('❌ getAttendanceHistory error (fallback failed):', err);
          sub.next([]);
          sub.complete();
        }
      })();
    });
  }

  getAttendanceCalendar(month?: number, year?: number): Observable<any[]> {
    const now = new Date();
    const m = month ?? now.getMonth() + 1;
    const y = year ?? now.getFullYear();

    const primary = `${this.routeMap.calendar}?month=${m}&year=${y}`;
    const alt = `/attendances/calendar?month=${m}&year=${y}`;

    return new Observable<any[]>((sub) => {
      (async () => {
        try {
          const res = await this.tryGetWithFallback([primary, alt], { headers: this.getHeaders() });
          const body = res as any;
          if (Array.isArray(body)) sub.next(body);
          else if (Array.isArray(body?.data)) sub.next(body.data);
          else sub.next([]);
          sub.complete();
        } catch (err) {
          console.error('❌ getAttendanceCalendar error (fallback failed):', err);
          sub.next([]);
          sub.complete();
        }
      })();
    });
  }

  formatLocalTime(date: string | null) {
    if (!date) return null;
    const d = new Date(date);
    if (d.toString() === 'Invalid Date') return null;
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  }

  // --- getCurrentLocation returns null on failure instead of throwing
  async getCurrentLocation(): Promise<{ latitude: number; longitude: number; accuracy?: number } | null> {
    try {
      if (this.platform && (this.platform as any).is && (this.platform as any).is('hybrid')) {
        await Geolocation.requestPermissions();
        const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 15000 });
        return {
          latitude: Number(pos.coords.latitude),
          longitude: Number(pos.coords.longitude),
          accuracy: pos.coords.accuracy,
        };
      }

      if ('geolocation' in navigator) {
        return await new Promise((resolve, reject) => {
          const timer = setTimeout(() => {
            clearTimeout(timer);
            reject(new Error('Timeout expired'));
          }, 15000);

          navigator.geolocation.getCurrentPosition(
            (pos) => {
              clearTimeout(timer);
              resolve({
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
                accuracy: pos.coords.accuracy,
              });
            },
            (err) => {
              clearTimeout(timer);
              reject(err);
            },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
          );
        });
      }

      return null;
    } catch (err) {
      console.warn('[AttendanceService] getCurrentLocation failed:', err);
      return null;
    }
  }

  savePendingLocal(type: 'check-in' | 'check-out', lat: number, lng: number, status: string, date?: string, accuracy?: number, distance?: number | null): string | null {
    try {
      const key = 'attendance_pending';
      const raw = localStorage.getItem(key) || '[]';
      const data = Array.isArray(JSON.parse(raw)) ? JSON.parse(raw) : [];
      const entry: any = {
        id: String(Date.now()) + '-' + Math.random().toString(36).slice(2, 8),
        type,
        date: date ?? this.getTodayDateString(),
        latitude: Number(lat),
        longitude: Number(lng),
        status,
        accuracy: accuracy ?? null,
        distance: distance ?? null,
        uploaded: false,
        retries: 0,
        lastAttempt: null,
      };
      data.push(entry);
      localStorage.setItem(key, JSON.stringify(data));
      console.log('[AttendanceService] Saved pending attendance local:', entry);
      return entry.id;
    } catch (e) {
      console.warn('[AttendanceService] Failed to save pending attendance locally', e);
      return null;
    }
  }

  removePendingLocalById(id: string) {
    try {
      const key = 'attendance_pending';
      const raw = localStorage.getItem(key) || '[]';
      const data = Array.isArray(JSON.parse(raw)) ? JSON.parse(raw) : [];
      const filtered = data.filter((d: any) => String(d.id) !== String(id));
      localStorage.setItem(key, JSON.stringify(filtered));
      console.log('[AttendanceService] removePendingLocalById removed:', id);
    } catch (e) {
      console.warn('[AttendanceService] removePendingLocalById error', e);
    }
  }

  removePendingLocal(type: 'check-in' | 'check-out', date: string) {
    try {
      const key = 'attendance_pending';
      const raw = localStorage.getItem(key) || '[]';
      const data = Array.isArray(JSON.parse(raw)) ? JSON.parse(raw) : [];
      const filtered = data.filter((d: any) => !(d.type === type && d.date === date));
      localStorage.setItem(key, JSON.stringify(filtered));
      console.log('[AttendanceService] removePendingLocal removed by type/date:', type, date);
    } catch (e) {
      /* ignore */
    }
  }

  getPendingLocal(): any[] {
    try {
      const key = 'attendance_pending';
      const raw = localStorage.getItem(key) || '[]';
      const arr = JSON.parse(raw);
      if (!Array.isArray(arr)) return [];
      return arr;
    } catch (e) {
      return [];
    }
  }

  private updatePendingEntry(entry: any) {
    try {
      const key = 'attendance_pending';
      const raw = localStorage.getItem(key) || '[]';
      const data = Array.isArray(JSON.parse(raw)) ? JSON.parse(raw) : [];
      const idx = data.findIndex((d: any) => String(d.id) === String(entry.id));
      if (idx >= 0) {
        data[idx] = entry;
        localStorage.setItem(key, JSON.stringify(data));
      }
    } catch (e) {
      console.warn('[AttendanceService] updatePendingEntry failed', e);
    }
  }

  scheduleSyncPendingLocal(delay = 500) {
    const now = Date.now();
    if (now - this._lastSyncAt < this.minSyncIntervalMs) {
      if (!this._scheduledSync) {
        const remaining = this.minSyncIntervalMs - (now - this._lastSyncAt) + 50;
        this._scheduledSync = setTimeout(() => {
          this._scheduledSync = null;
          this.syncPendingLocal().catch(() => {});
        }, Math.max(50, remaining));
      }
      return;
    }

    if (this._scheduledSync) {
      clearTimeout(this._scheduledSync);
      this._scheduledSync = null;
    }

    this._scheduledSync = setTimeout(() => {
      this._scheduledSync = null;
      this.syncPendingLocal().catch(() => {});
    }, delay);
  }

  async syncPendingLocal(): Promise<void> {
    const now = Date.now();
    if (this._isSyncingPendingLocal) {
      console.debug('[AttendanceService] syncPendingLocal ignored: already running');
      return;
    }
    if (now - this._lastSyncAt < this.minSyncIntervalMs) {
      console.debug('[AttendanceService] syncPendingLocal ignored: too-frequent run');
      return;
    }

    this._isSyncingPendingLocal = true;
    this._lastSyncAt = now;

    try {
      const pending = Array.isArray(this.getPendingLocal()) ? this.getPendingLocal() : [];
      if (!pending || pending.length === 0) {
        console.debug('[AttendanceService] syncPendingLocal: no pending entries');
        return;
      }

      console.log('[AttendanceService] syncPendingLocal: found', pending.length, 'entries ->', pending.map(p => ({ id: p.id, type: p.type, date: p.date })));

      for (const entry of [...pending]) {
        if (!entry || !entry.id) {
          console.warn('[AttendanceService] syncPendingLocal: malformed entry, removing', entry);
          try { this.removePendingLocal(entry?.type ?? 'check-in', entry?.date ?? this.getTodayDateString()); } catch {}
          continue;
        }

        entry.retries = Number(entry.retries ?? 0);
        if (entry.retries >= this.maxRetriesPerEntry) {
          console.warn('[AttendanceService] syncPendingLocal: max retries exceeded, removing pending id', entry.id);
          this.removePendingLocalById(entry.id);
          this.notifyPresensiChanged();
          continue;
        }

        const id = String(entry.id);
        const type = entry.type === 'check-out' ? 'check-out' : 'check-in';
        const url = this.baseUrl + (type === 'check-in' ? this.routeMap.checkIn : this.routeMap.checkOut);

        const form = new FormData();
        form.append('latitude', String(entry.latitude ?? 0));
        form.append('longitude', String(entry.longitude ?? 0));
        if (entry.status) form.append('status', entry.status);
        if (entry.accuracy !== undefined && entry.accuracy !== null) form.append('accuracy', String(entry.accuracy));

        if (entry.distance !== undefined && entry.distance !== null) {
          form.append('distance', String(entry.distance));
        } else {
          const oLat = Number(this.officeLat || localStorage.getItem('office_lat') || 0);
          const oLng = Number(this.officeLng || localStorage.getItem('office_lng') || 0);
          if (oLat && oLng && entry.latitude && entry.longitude) {
            const d = this.computeDistance(oLat, oLng, Number(entry.latitude), Number(entry.longitude));
            form.append('distance', String(Math.round(d)));
          }
        }

        const userId = localStorage.getItem('user_id') ?? '';
        if (userId) form.append('user_id', String(userId));

        try {
          const resp = await firstValueFrom(this.http.post<any>(url, form, { headers: this.getBackgroundHeaders() }));
          console.log('[AttendanceService] syncPendingLocal: uploaded', id, 'resp:', resp);

          this.removePendingLocalById(id);
          this.notifyPresensiChanged();

          await this.sleep(200);
        } catch (err: any) {
          const status = err?.status ?? null;
          console.warn('[AttendanceService] syncPendingLocal: failed to upload', id, 'status=', status, err);

          if (status === 409) {
            console.warn('[AttendanceService] syncPendingLocal: server 409 -> removing pending id', id);
            this.removePendingLocalById(id);
            this.notifyPresensiChanged();
            await this.sleep(200);
            continue;
          }

          if (status >= 400 && status < 500) {
            console.warn('[AttendanceService] syncPendingLocal: client error -> removing pending id', id, status);
            this.removePendingLocalById(id);
            this.notifyPresensiChanged();
            await this.sleep(200);
            continue;
          }

          entry.retries = (entry.retries ?? 0) + 1;
          entry.lastAttempt = Date.now();
          this.updatePendingEntry(entry);

          const backoffMs = Math.min(2000 * entry.retries, 10000);
          console.log(`[AttendanceService] will retry entry ${id} later, backoff ${backoffMs}ms (retries=${entry.retries})`);
          await this.sleep(backoffMs);
          continue;
        }
      }
    } catch (err) {
      console.error('[AttendanceService] syncPendingLocal error', err);
    } finally {
      this._isSyncingPendingLocal = false;
    }
  }

  private sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

  createAttendance(record: Partial<Attendance>): Observable<Attendance> {
    this.loadSensorSetting();

    const ensureLocationThenSend = async () => {
      let lat = Number(record.latitude ?? 0);
      let lng = Number(record.longitude ?? 0);
      let accuracy = (record as any).accuracy ?? undefined;

      // <-- handle nullable loc safely
      if (!this.isLatLngValid(lat, lng)) {
        const loc = await this.getCurrentLocation();
        if (loc) {
          lat = Number(loc.latitude);
          lng = Number(loc.longitude);
          accuracy = (loc.accuracy !== undefined && loc.accuracy !== null) ? loc.accuracy : accuracy;
          record.latitude = lat;
          record.longitude = lng;
          console.debug('[AttendanceService] getCurrentLocation success', { lat, lng, accuracy });
        } else {
          console.warn('[AttendanceService] getCurrentLocation returned null - using office coords fallback if available');
          const savedLat = Number(localStorage.getItem('office_lat') ?? this.officeLat);
          const savedLng = Number(localStorage.getItem('office_lng') ?? this.officeLng);
          if (this.isLatLngValid(savedLat, savedLng)) {
            lat = savedLat;
            lng = savedLng;
            accuracy = accuracy ?? undefined;
            record.latitude = lat;
            record.longitude = lng;
            console.warn('[AttendanceService] using office coords as fallback', { lat, lng });
          }
        }
      } else {
        console.debug('[AttendanceService] used provided coords', { lat, lng, accuracy });
      }

      let distanceToSend: number | null = null;
      const oLat = Number(this.officeLat || localStorage.getItem('office_lat') || 0);
      const oLng = Number(this.officeLng || localStorage.getItem('office_lng') || 0);
      if (oLat && oLng && this.isLatLngValid(lat, lng)) {
        distanceToSend = Math.round(this.computeDistance(oLat, oLng, lat, lng));
      }

      if (!this.isLatLngValid(lat, lng)) {
        lat = oLat || lat;
        lng = oLng || lng;
        console.warn('[AttendanceService] coords still invalid after attempts; forced to office coords', { lat, lng });
      }

      if (!this.isUserInsideRadius(lat, lng)) {
        const date = this.getTodayDateString();
        this.savePendingLocal('check-in', Number(lat), Number(lng), record.status ?? 'Hadir', date, accuracy ?? null, distanceToSend);
        this.scheduleSyncPendingLocal(300);
        throw new Error('Anda berada di luar radius kantor.');
      }

      const url = this.baseUrl + this.routeMap.checkIn;
      const formData = new FormData();
      formData.append('latitude', String(lat));
      formData.append('longitude', String(lng));
      const userId = record.user_id ?? localStorage.getItem('user_id') ?? '';
      if (userId) formData.append('user_id', String(userId));
      formData.append('status', record.status ?? 'Hadir');
      if (accuracy !== undefined && accuracy !== null) formData.append('accuracy', String(accuracy));
      if (distanceToSend !== null) formData.append('distance', String(distanceToSend));

      console.debug('[AttendanceService] createAttendance -> will POST', { url, entries: Array.from((formData as any).entries()) });

      return this.http.post<any>(url, formData, { headers: this.getBackgroundHeaders() }).pipe(
        tap((res) => {
          this.notifyPresensiChanged();
          const date = this.getTodayDateString();
          const jam = this.formatLocalTime((res as any)?.data?.check_in ?? (res as any)?.check_in);
          this.saveLocalTime(date, jam, null);
          try { this.removePendingLocal('check-in', date); } catch {}
        }),
        map((res) => (res as any)?.data ?? res),
        catchError((err) => {
          console.error('❌ createAttendance error:', err);
          if (err?.status === 403) {
            try {
              const date = this.getTodayDateString();
              this.savePendingLocal('check-in', Number(lat), Number(lng), record.status ?? 'Hadir', date, accuracy ?? null, distanceToSend);
              this.scheduleSyncPendingLocal(300);
            } catch (e) { /* ignore */ }
          }
          return throwError(() => new Error(err?.error?.message || 'Gagal melakukan check-in.'));
        })
      );
    };

    return new Observable<Attendance>((subscriber) => {
      ensureLocationThenSend()
        .then((obs: any) => {
          obs.subscribe({
            next: (v: any) => { subscriber.next(v); subscriber.complete(); },
            error: (e: any) => subscriber.error(e)
          });
        })
        .catch((e) => subscriber.error(e));
    });
  }

  updateAttendance(payload: Partial<Attendance>): Observable<Attendance> {
    this.loadSensorSetting();

    const ensureLocationThenSend = async () => {
      let lat = Number(payload.latitude ?? 0);
      let lng = Number(payload.longitude ?? 0);
      let accuracy = (payload as any).accuracy ?? undefined;

      if (!this.isLatLngValid(lat, lng)) {
        const loc = await this.getCurrentLocation();
        if (loc) {
          lat = Number(loc.latitude);
          lng = Number(loc.longitude);
          accuracy = (loc.accuracy !== undefined && loc.accuracy !== null) ? loc.accuracy : accuracy;
          payload.latitude = lat;
          payload.longitude = lng;
          console.debug('[AttendanceService] getCurrentLocation success (checkout)', { lat, lng, accuracy });
        } else {
          console.warn('[AttendanceService] getCurrentLocation failed (checkout), fallback to office coords');
          const savedLat = Number(localStorage.getItem('office_lat') ?? this.officeLat);
          const savedLng = Number(localStorage.getItem('office_lng') ?? this.officeLng);
          if (this.isLatLngValid(savedLat, savedLng)) {
            lat = savedLat;
            lng = savedLng;
            payload.latitude = lat;
            payload.longitude = lng;
            console.warn('[AttendanceService] using office coords as fallback (checkout)', { lat, lng });
          }
        }
      }

      let distanceToSend: number | null = null;
      const oLat = Number(this.officeLat || localStorage.getItem('office_lat') || 0);
      const oLng = Number(this.officeLng || localStorage.getItem('office_lng') || 0);
      if (oLat && oLng && this.isLatLngValid(lat, lng)) {
        distanceToSend = Math.round(this.computeDistance(oLat, oLng, lat, lng));
      }

      if (!this.isLatLngValid(lat, lng)) {
        lat = oLat || lat;
        lng = oLng || lng;
        console.warn('[AttendanceService] coords still invalid after attempts (checkout); forced to office coords', { lat, lng });
      }

      if (!this.isUserInsideRadius(lat, lng)) {
        const date = this.getTodayDateString();
        this.savePendingLocal('check-out', Number(lat), Number(lng), payload.status ?? 'Hadir', date, accuracy ?? null, distanceToSend);
        this.scheduleSyncPendingLocal(300);
        throw new Error('Anda berada di luar radius kantor.');
      }

      const url = this.baseUrl + this.routeMap.checkOut;
      const formData = new FormData();
      formData.append('latitude', String(lat));
      formData.append('longitude', String(lng));
      const userId = payload.user_id ?? localStorage.getItem('user_id') ?? '';
      if (userId) formData.append('user_id', String(userId));
      formData.append('status', payload.status ?? 'Hadir');
      if (accuracy !== undefined && accuracy !== null) formData.append('accuracy', String(accuracy));
      if (distanceToSend !== null) formData.append('distance', String(distanceToSend));

      console.debug('[AttendanceService] updateAttendance -> will POST', { url, entries: Array.from((formData as any).entries()) });

      return this.http.post<any>(url, formData, { headers: this.getBackgroundHeaders() }).pipe(
        tap((res) => {
          this.notifyPresensiChanged();
          const date = this.getTodayDateString();
          const jamOut = this.formatLocalTime((res as any)?.data?.check_out ?? (res as any)?.check_out);
          const local = this.getLocalTime(date);
          const jamIn = local?.check_in || null;
          this.saveLocalTime(date, jamIn, jamOut);
          try { this.removePendingLocal('check-out', date); } catch {}
        }),
        map((res) => (res as any)?.data ?? res),
        catchError((err) => {
          console.error('❌ updateAttendance error:', err);
          return throwError(() => new Error(err?.error?.message || 'Gagal melakukan check-out.'));
        })
      );
    };

    return new Observable<Attendance>((subscriber) => {
      ensureLocationThenSend()
        .then((obs: any) => {
          obs.subscribe({
            next: (v: any) => { subscriber.next(v); subscriber.complete(); },
            error: (e: any) => subscriber.error(e)
          });
        })
        .catch((e) => subscriber.error(e));
    });
  }

  saveLocalTime(date: string, checkin: string | null, checkout: string | null) {
    const key = 'attendance_times';
    const data = JSON.parse(localStorage.getItem(key) || '{}');

    const normalize = (t: string | null) => {
      if (!t) return null;
      return t.includes('.') ? t.replace('.', ':') : t;
    };

    data[date] = {
      check_in: normalize(checkin),
      check_out: normalize(checkout),
    };

    localStorage.setItem(key, JSON.stringify(data));
  }

  getLocalTime(date: string) {
    const key = 'attendance_times';
    const data = JSON.parse(localStorage.getItem(key) || '{}');
    return data[date] || null;
  }

  saveSensorSetting(lat: number, lng: number, radius: number) {
    localStorage.setItem('office_lat', String(lat));
    localStorage.setItem('office_lng', String(lng));
    localStorage.setItem('office_radius', String(radius));
    this.loadSensorSetting();
  }

  loadSensorSetting() {
    this.officeLat = Number(localStorage.getItem('office_lat') ?? this.officeLat);
    this.officeLng = Number(localStorage.getItem('office_lng') ?? this.officeLng);
    this.officeRadius = Number(localStorage.getItem('office_radius') ?? this.officeRadius);
  }

  isLatLngValid(lat: number, lng: number) {
    if (!isFinite(lat) || !isFinite(lng)) return false;
    if (lat === 0 && lng === 0) return false;
    if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return false;
    return true;
  }

  isUserInsideRadius(userLat: number, userLng: number): boolean {
    if (!this.officeLat || !this.officeLng || !this.officeRadius) {
      return true;
    }

    if (!this.isLatLngValid(userLat, userLng)) {
      return false;
    }
    if (Math.abs(userLat) > 90 && Math.abs(userLng) <= 90) {
      const tmp = userLat; userLat = userLng; userLng = tmp;
    }

    const R = 6371e3;
    const φ1 = this.officeLat * Math.PI/180;
    const φ2 = userLat * Math.PI/180;
    const Δφ = (userLat - this.officeLat) * Math.PI/180;
    const Δλ = (userLng - this.officeLng) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;

    console.debug('[AttendanceService] isUserInsideRadius computed distance (m):', Math.round(distance), 'officeRadius:', this.officeRadius);
    return distance <= this.officeRadius;
  }
}
