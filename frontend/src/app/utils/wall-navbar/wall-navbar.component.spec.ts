import { MOMENTA_TEST_PROVIDERS } from '../../testing/global-test-setup';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WallNavbarComponent } from './wall-navbar.component';

describe('WallNavbarComponent', () => {
  let component: WallNavbarComponent;
  let fixture: ComponentFixture<WallNavbarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: MOMENTA_TEST_PROVIDERS,
      imports: [WallNavbarComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(WallNavbarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
