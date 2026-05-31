import { MOMENTA_TEST_PROVIDERS } from '../../testing/global-test-setup';
import { TestBed } from '@angular/core/testing';

import { GifsService } from './gifs.service';

describe('GifsService', () => {
  let service: GifsService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: MOMENTA_TEST_PROVIDERS,});
    service = TestBed.inject(GifsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
