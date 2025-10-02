import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChecklistList } from './checklist-list';

describe('ChecklistList', () => {
  let component: ChecklistList;
  let fixture: ComponentFixture<ChecklistList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChecklistList]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ChecklistList);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
