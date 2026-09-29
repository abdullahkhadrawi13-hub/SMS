import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SectionFilter } from './section-filter';

describe('SectionFilter', () => {
  let component: SectionFilter;
  let fixture: ComponentFixture<SectionFilter>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SectionFilter],
    }).compileComponents();

    fixture = TestBed.createComponent(SectionFilter);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
