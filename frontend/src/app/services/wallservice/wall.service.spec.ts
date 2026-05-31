import { MOMENTA_TEST_PROVIDERS } from '../../testing/global-test-setup';
import { TestBed } from '@angular/core/testing';

import { WallService } from './wall.service';

describe('WallService', () => {
  let service: WallService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: MOMENTA_TEST_PROVIDERS,});
    service = TestBed.inject(WallService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
