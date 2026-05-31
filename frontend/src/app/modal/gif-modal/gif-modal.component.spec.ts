import { MOMENTA_TEST_PROVIDERS } from '../../testing/global-test-setup';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GifModalComponent } from './gif-modal.component';

describe('GifModalComponent', () => {
  let component: GifModalComponent;
  let fixture: ComponentFixture<GifModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: MOMENTA_TEST_PROVIDERS,
      imports: [GifModalComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(GifModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
