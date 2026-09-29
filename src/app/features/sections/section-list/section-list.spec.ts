import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SectionList } from './section-list';

describe('SectionList', () => {
  let component: SectionList;
  let fixture: ComponentFixture<SectionList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SectionList],
    }).compileComponents();

    fixture = TestBed.createComponent(SectionList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
