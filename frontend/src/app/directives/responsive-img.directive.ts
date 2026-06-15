import { Directive, ElementRef, Input, OnChanges, inject } from '@angular/core';
import { MediaService } from '../services/mediaservice/media.service';

/**
 * Renders a stored image directly (no blob fetch) with a responsive WebP
 * `srcset`, so the browser picks the smallest variant that fits the layout.
 *
 * `crossorigin="anonymous"` + the API's `Access-Control-Allow-Origin` header keep
 * the pixels canvas-readable (useful for any canvas-based processing) when the API
 * is on a different origin (e.g. the dev server).
 *
 * Usage: `<img [appResponsiveImg]="post.media?.url" alt="...">`
 */
@Directive({
  selector: 'img[appResponsiveImg]',
  standalone: true,
})
export class ResponsiveImgDirective implements OnChanges {
  @Input('appResponsiveImg') mediaPath: string | null | undefined;

  private readonly el = inject(ElementRef<HTMLImageElement>);
  private readonly media = inject(MediaService);

  ngOnChanges(): void {
    const img = this.el.nativeElement as HTMLImageElement;
    if (!this.mediaPath) {
      img.removeAttribute('src');
      img.removeAttribute('srcset');
      return;
    }
    img.crossOrigin = 'anonymous';
    img.loading = 'lazy';
    img.decoding = 'async';
    img.sizes = '(max-width: 600px) 100vw, 600px';
    img.srcset = this.media.responsiveSrcset(this.mediaPath);
    img.src = this.media.fileUrl(this.mediaPath);
  }
}
