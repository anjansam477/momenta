import { MOMENTA_TEST_PROVIDERS } from '../../testing/global-test-setup';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PasswordChangedComponent } from './passwordChanged.component';

describe('PasswordChangedComponent', () => {
  let component: PasswordChangedComponent;
  let fixture: ComponentFixture<PasswordChangedComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: MOMENTA_TEST_PROVIDERS,
      imports: [PasswordChangedComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(PasswordChangedComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
