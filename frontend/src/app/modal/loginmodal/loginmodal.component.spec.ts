import { MOMENTA_TEST_PROVIDERS } from '../../testing/global-test-setup';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LoginmodalComponent } from './loginmodal.component';

describe('LoginmodalComponent', () => {
  let component: LoginmodalComponent;
  let fixture: ComponentFixture<LoginmodalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: MOMENTA_TEST_PROVIDERS,
      imports: [LoginmodalComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(LoginmodalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
