import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RiwayatPresensiPage } from './riwayat-presensi.page';

describe('RiwayatPresensiPage', () => {
  let component: RiwayatPresensiPage;
  let fixture: ComponentFixture<RiwayatPresensiPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(RiwayatPresensiPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
