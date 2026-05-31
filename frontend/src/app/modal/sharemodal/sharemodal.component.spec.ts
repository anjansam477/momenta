import { MOMENTA_TEST_PROVIDERS } from '../../testing/global-test-setup';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SharemodalComponent } from './sharemodal.component';

describe('SharemodalComponent', () => {
  let component: SharemodalComponent;
  let fixture: ComponentFixture<SharemodalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: MOMENTA_TEST_PROVIDERS,
      imports: [SharemodalComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(SharemodalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
