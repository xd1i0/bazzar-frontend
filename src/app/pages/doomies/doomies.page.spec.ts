import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DoomiesPage } from './doomies.page';

describe('DoomiesPage', () => {
  let component: DoomiesPage;
  let fixture: ComponentFixture<DoomiesPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(DoomiesPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
