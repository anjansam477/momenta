import { AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, ElementRef, EventEmitter, OnInit, Output, ViewChild, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { GifsService } from '../../services/gifservice/gifs.service';
import { FormsModule } from '@angular/forms';
import { GiphyGif } from '../../shared/models';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-sticker-modal',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './sticker-modal.component.html',
  styleUrl: './sticker-modal.component.css'
})
export class StickerModalComponent implements OnInit, AfterViewInit {
  @ViewChild('searchInput') searchInput!: ElementRef;
  @Output() stickerSelected = new EventEmitter<string>();

  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);

  searchTerm = '';
  stickers: GiphyGif[] = [];
  suggestions: string[] = [];
  errorMessage = '';
  receivedSticker = true;
  loading = false;

  constructor(private gifsService: GifsService) {}

  ngOnInit(): void {
    this.gifsService.trendingStickers()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(data => { this.stickers = data; this.cdr.markForCheck(); });

    this.gifsService.trendingSearchTerms()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(terms => { this.suggestions = terms.slice(0, 8); this.cdr.markForCheck(); });
  }

  ngAfterViewInit(): void {
    this.searchInput.nativeElement.focus();
  }

  searchStickers(term = this.searchTerm): void {
    const q = term.trim();
    if (!q) { this.errorMessage = 'Type something to search'; return; }

    this.searchTerm = q;
    this.loading = true;
    this.errorMessage = '';
    this.cdr.markForCheck();

    this.gifsService.searchStickers(q)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: data => {
          this.stickers = data;
          this.receivedSticker = data.length > 0;
          if (!this.receivedSticker) this.errorMessage = 'No results found.';
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.errorMessage = 'Error fetching stickers';
          this.loading = false;
          this.cdr.markForCheck();
        }
      });
  }

  selectSticker(sticker: GiphyGif): void {
    if (sticker.analytics_response_payload) {
      this.gifsService.trackAction(sticker.analytics_response_payload, 'click');
    }
    this.stickerSelected.emit(sticker.images.fixed_height_small?.url ?? sticker.images.fixed_height?.url ?? sticker.images.original.url);
  }

  thumbUrl(s: GiphyGif): string {
    return s.images.fixed_height?.url ?? s.images.original.url;
  }

  stillUrl(s: GiphyGif): string {
    return s.images.fixed_height_still?.url ?? this.thumbUrl(s);
  }

  onChange(): void {
    this.errorMessage = '';
    this.receivedSticker = true;
  }
}
