import { MOMENTA_TEST_PROVIDERS } from '../../testing/global-test-setup';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StickerModalComponent } from './sticker-modal.component';

describe('StickerModalComponent', () => {
  let component: StickerModalComponent;
  let fixture: ComponentFixture<StickerModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: MOMENTA_TEST_PROVIDERS,
      imports: [StickerModalComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(StickerModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
