import { MOMENTA_TEST_PROVIDERS } from '../../../testing/global-test-setup';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DownloadWallComponent } from './download-wall.component';

describe('DownloadWallComponent', () => {
  let component: DownloadWallComponent;
  let fixture: ComponentFixture<DownloadWallComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: MOMENTA_TEST_PROVIDERS,
      imports: [DownloadWallComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(DownloadWallComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
