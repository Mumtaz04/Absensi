import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DataPribadiPage } from './data-pribadi.page';

describe('DataPribadiPage', () => {
  let component: DataPribadiPage;
  let fixture: ComponentFixture<DataPribadiPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(DataPribadiPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
