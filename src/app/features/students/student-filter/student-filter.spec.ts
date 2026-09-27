import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StudentFilter } from './student-filter';

describe('StudentFilter', () => {
  let component: StudentFilter;
  let fixture: ComponentFixture<StudentFilter>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StudentFilter],
    }).compileComponents();

    fixture = TestBed.createComponent(StudentFilter);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
