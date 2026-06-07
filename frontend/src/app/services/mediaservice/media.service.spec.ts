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

  it('fileUrl encodes the media path as a query param', () => {
    const url = service.fileUrl('/media-files/w 1/p/photo.jpg');
    expect(url).toContain('/api/uploads/retrieve-file?mediaUrl=');
    expect(url).toContain(encodeURIComponent('/media-files/w 1/p/photo.jpg'));
  });

  it('responsiveSrcset emits one candidate per responsive width with w descriptors', () => {
    const parts = service.responsiveSrcset('/media-files/a/b/photo.jpg').split(', ');
    expect(parts.length).toBe(MediaService.RESPONSIVE_WIDTHS.length);
    MediaService.RESPONSIVE_WIDTHS.forEach((w, i) => {
      expect(parts[i]).toContain(`&w=${w} ${w}w`);
    });
  });

  it('responsive widths match the backend contract (480/960/1440)', () => {
    expect(MediaService.RESPONSIVE_WIDTHS).toEqual([480, 960, 1440]);
  });
});
