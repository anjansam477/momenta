import { MOMENTA_TEST_PROVIDERS } from '../../testing/global-test-setup';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ContactUsModalComponent } from './contact-us-modal.component';

describe('ContactUsModalComponent', () => {
  let component: ContactUsModalComponent;
  let fixture: ComponentFixture<ContactUsModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: MOMENTA_TEST_PROVIDERS,
      imports: [ContactUsModalComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ContactUsModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
