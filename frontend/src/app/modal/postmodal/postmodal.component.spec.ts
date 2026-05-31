import { MOMENTA_TEST_PROVIDERS } from '../../testing/global-test-setup';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PostmodalComponent } from './postmodal.component';

describe('PostmodalComponent', () => {
  let component: PostmodalComponent;
  let fixture: ComponentFixture<PostmodalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: MOMENTA_TEST_PROVIDERS,
      imports: [PostmodalComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(PostmodalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
