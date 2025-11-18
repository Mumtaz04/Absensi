import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PresensiPage } from './presensi.page';

describe('PresensiPage', () => {
  let component: PresensiPage;
  let fixture: ComponentFixture<PresensiPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(PresensiPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
