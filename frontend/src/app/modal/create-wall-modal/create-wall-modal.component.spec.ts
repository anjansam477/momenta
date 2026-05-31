import { MOMENTA_TEST_PROVIDERS } from '../../testing/global-test-setup';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreateWallModalComponent } from './create-wall-modal.component';

describe('CreateWallModalComponent', () => {
  let component: CreateWallModalComponent;
  let fixture: ComponentFixture<CreateWallModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: MOMENTA_TEST_PROVIDERS,
      imports: [CreateWallModalComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(CreateWallModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
