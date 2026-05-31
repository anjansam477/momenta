import { MOMENTA_TEST_PROVIDERS } from '../../testing/global-test-setup';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MessagemodalComponent } from './messagemodal.component';

describe('MessagemodalComponent', () => {
  let component: MessagemodalComponent;
  let fixture: ComponentFixture<MessagemodalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: MOMENTA_TEST_PROVIDERS,
      imports: [MessagemodalComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(MessagemodalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
