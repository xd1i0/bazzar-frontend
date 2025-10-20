import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NachrichtenPage } from './nachrichten.page';

describe('NachrichtenPage', () => {
  let component: NachrichtenPage;
  let fixture: ComponentFixture<NachrichtenPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(NachrichtenPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
