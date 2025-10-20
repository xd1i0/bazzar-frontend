import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BazzarPage } from './bazzar.page';

describe('BazzarPage', () => {
  let component: BazzarPage;
  let fixture: ComponentFixture<BazzarPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(BazzarPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
