/**
 * 🕒 Attendance Model
 * Representasi data presensi (check-in/out) karyawan.
 * Kompatibel dengan struktur API Laravel dan frontend Angular/Ionic.
 */

export interface Attendance {
  id?: number;
  user_id?: number;
  check_in?: string;
  check_out?: string;
  latitude?: number;
  longitude?: number;
  accuracy?: number | null;
  status?: string;
  month?: number;
  year?: number;
  created_at?: string;
  updated_at?: string;
}

export interface Attendance {
  jamMasuk?: string | null;
  jamKeluar?: string | null;
  keterangan?: string | null;
  message?: string; 
}

