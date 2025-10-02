import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChecklistFormulaire } from './checklist-formulaire';

describe('ChecklistFormulaire', () => {
  let component: ChecklistFormulaire;
  let fixture: ComponentFixture<ChecklistFormulaire>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChecklistFormulaire]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ChecklistFormulaire);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
