import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SectionForm } from './section-form';

describe('SectionForm', () => {
  let component: SectionForm;
  let fixture: ComponentFixture<SectionForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SectionForm],
    }).compileComponents();

    fixture = TestBed.createComponent(SectionForm);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
