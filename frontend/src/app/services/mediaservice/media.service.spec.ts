import { MOMENTA_TEST_PROVIDERS } from '../../testing/global-test-setup';
import { TestBed } from '@angular/core/testing';

import { MediaService } from './media.service';

describe('MediaService', () => {
  let service: MediaService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: MOMENTA_TEST_PROVIDERS,});
    service = TestBed.inject(MediaService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
