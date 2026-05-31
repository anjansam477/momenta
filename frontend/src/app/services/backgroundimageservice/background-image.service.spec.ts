import { MOMENTA_TEST_PROVIDERS } from '../../testing/global-test-setup';
import { TestBed } from '@angular/core/testing';

import { BackgroundImageService } from './background-image.service';

describe('BackgroundImageService', () => {
  let service: BackgroundImageService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: MOMENTA_TEST_PROVIDERS,});
    service = TestBed.inject(BackgroundImageService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
