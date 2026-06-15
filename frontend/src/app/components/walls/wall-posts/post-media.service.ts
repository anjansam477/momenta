import { Injectable } from '@angular/core';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { Observable, map, catchError, of } from 'rxjs';
import { MediaService } from '../../../services/mediaservice/media.service';

/**
 * Media concerns for the wall feed: classifying a post's attachment and turning a
 * stored media path into a safe, displayable blob URL. Extracted from
 * WallPostsComponent so media handling is isolated and independently testable.
 * Images load directly via ResponsiveImgDirective; only video + GIF are blobbed.
 */
@Injectable({ providedIn: 'root' })
export class PostMediaService {
  constructor(
    private mediaService: MediaService,
    private sanitizer: DomSanitizer
  ) {}

  isImage(fileType: string, url: string): boolean {
    return fileType === 'image' && !url.endsWith('.gif');
  }

  isVideo(fileType: string): boolean {
    return fileType === 'video';
  }

  isGif(fileType: string, url: string): boolean {
    return fileType === 'image' && url.toLowerCase().endsWith('.gif');
  }

  /** Fetch a stored media file and wrap it as a sanitized blob URL ('' on error). */
  resolve(mediaUrl: string): Observable<SafeUrl> {
    return this.mediaService.retrieveFile(mediaUrl).pipe(
      map((blobData: Blob) => this.sanitizer.bypassSecurityTrustUrl(URL.createObjectURL(blobData))),
      catchError((error) => {
        console.error('Error fetching media:', error);
        return of('');
      })
    );
  }
}
