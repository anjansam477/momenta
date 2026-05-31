import { MOMENTA_TEST_PROVIDERS } from '../../../testing/global-test-setup';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UserReplacerComponent } from './user-replacer.component';

describe('UserReplacerComponent', () => {
  let component: UserReplacerComponent;
  let fixture: ComponentFixture<UserReplacerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: MOMENTA_TEST_PROVIDERS,
      imports: [UserReplacerComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(UserReplacerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
