import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AssistantPrincipalDashboard } from './assistant-principal-dashboard';

describe('AssistantPrincipalDashboard', () => {
  let component: AssistantPrincipalDashboard;
  let fixture: ComponentFixture<AssistantPrincipalDashboard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AssistantPrincipalDashboard],
    }).compileComponents();

    fixture = TestBed.createComponent(AssistantPrincipalDashboard);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
