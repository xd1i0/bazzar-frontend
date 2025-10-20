import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FavoritenPage } from './favoriten.page';

describe('FavoritenPage', () => {
  let component: FavoritenPage;
  let fixture: ComponentFixture<FavoritenPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(FavoritenPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
