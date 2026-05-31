import { MOMENTA_TEST_PROVIDERS } from '../../testing/global-test-setup';
import { TestBed } from '@angular/core/testing';

import { DownloadService } from './download.service';

describe('DownloadService', () => {
  let service: DownloadService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: MOMENTA_TEST_PROVIDERS,});
    service = TestBed.inject(DownloadService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
