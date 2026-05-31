import { MOMENTA_TEST_PROVIDERS } from '../../../testing/global-test-setup';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddDomainComponent } from './add-domain.component';

describe('AddDomainComponent', () => {
  let component: AddDomainComponent;
  let fixture: ComponentFixture<AddDomainComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: MOMENTA_TEST_PROVIDERS,
      imports: [AddDomainComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(AddDomainComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
