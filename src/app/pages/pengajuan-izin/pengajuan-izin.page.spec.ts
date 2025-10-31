import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PengajuanIzinPage } from './pengajuan-izin.page';

describe('PengajuanIzinPage', () => {
  let component: PengajuanIzinPage;
  let fixture: ComponentFixture<PengajuanIzinPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(PengajuanIzinPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
