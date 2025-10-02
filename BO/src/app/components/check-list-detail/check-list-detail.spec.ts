import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CheckListDetail } from './check-list-detail';

describe('CheckListDetail', () => {
  let component: CheckListDetail;
  let fixture: ComponentFixture<CheckListDetail>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CheckListDetail]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CheckListDetail);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
