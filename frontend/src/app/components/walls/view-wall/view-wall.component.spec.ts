import { MOMENTA_TEST_PROVIDERS } from '../../../testing/global-test-setup';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ViewWallComponent } from './view-wall.component';

describe('ViewWallComponent', () => {
  let component: ViewWallComponent;
  let fixture: ComponentFixture<ViewWallComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: MOMENTA_TEST_PROVIDERS,
      imports: [ViewWallComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ViewWallComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
