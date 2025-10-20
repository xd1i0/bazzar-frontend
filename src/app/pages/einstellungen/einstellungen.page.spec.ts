import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EinstellungenPage } from './einstellungen.page';

describe('EinstellungenPage', () => {
  let component: EinstellungenPage;
  let fixture: ComponentFixture<EinstellungenPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(EinstellungenPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
