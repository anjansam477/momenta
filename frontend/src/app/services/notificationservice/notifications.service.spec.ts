import { MOMENTA_TEST_PROVIDERS } from '../../testing/global-test-setup';
import { TestBed } from '@angular/core/testing';

import { NotificationsService } from './notifications.service';

describe('NotificationsService', () => {
  let service: NotificationsService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: MOMENTA_TEST_PROVIDERS,});
    service = TestBed.inject(NotificationsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
