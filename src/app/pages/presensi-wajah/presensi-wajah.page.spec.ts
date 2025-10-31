import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PresensiWajahPage } from './presensi-wajah.page';

describe('PresensiWajahPage', () => {
  let component: PresensiWajahPage;
  let fixture: ComponentFixture<PresensiWajahPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(PresensiWajahPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
