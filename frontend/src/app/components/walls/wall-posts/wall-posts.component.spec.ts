import { MOMENTA_TEST_PROVIDERS } from '../../../testing/global-test-setup';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WallPostsComponent } from './wall-posts.component';

describe('WallPostsComponent', () => {
  let component: WallPostsComponent;
  let fixture: ComponentFixture<WallPostsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: MOMENTA_TEST_PROVIDERS,
      imports: [WallPostsComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(WallPostsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
