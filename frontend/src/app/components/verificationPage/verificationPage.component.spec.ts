import { MOMENTA_TEST_PROVIDERS } from '../../testing/global-test-setup';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VerificationPageComponent } from './verificationPage.component';

describe('VerificationPageComponent', () => {
  let component: VerificationPageComponent;
  let fixture: ComponentFixture<VerificationPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: MOMENTA_TEST_PROVIDERS,
      imports: [VerificationPageComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(VerificationPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
