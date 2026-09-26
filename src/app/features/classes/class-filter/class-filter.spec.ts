import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ClassFilter } from './class-filter';

describe('ClassFilter', () => {
  let component: ClassFilter;
  let fixture: ComponentFixture<ClassFilter>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClassFilter],
    }).compileComponents();

    fixture = TestBed.createComponent(ClassFilter);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
