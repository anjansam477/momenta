import { AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, ElementRef, EventEmitter, OnInit, Output, ViewChild, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { GifsService } from '../../services/gifservice/gifs.service';
import { FormsModule } from '@angular/forms';
import { GiphyGif } from '../../shared/models';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-gif-modal',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './gif-modal.component.html',
  styleUrl: './gif-modal.component.css'
})
export class GifModalComponent implements OnInit, AfterViewInit {
  @ViewChild('searchInput') searchInput!: ElementRef;
  @Output() gifSelected = new EventEmitter<string>();

  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);

  searchTerm = '';
  gifs: GiphyGif[] = [];
  suggestions: string[] = [];
  errorMessage = '';
  receivedGifs = true;
  loading = false;

  constructor(private gifsService: GifsService) {}

  ngOnInit(): void {
    // Load trending + trending search term suggestions in parallel
    this.gifsService.trendingGifs()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(data => { this.gifs = data; this.cdr.markForCheck(); });

    this.gifsService.trendingSearchTerms()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(terms => { this.suggestions = terms.slice(0, 8); this.cdr.markForCheck(); });
  }

  ngAfterViewInit(): void {
    this.searchInput.nativeElement.focus();
  }

  searchGifs(term = this.searchTerm): void {
    const q = term.trim();
    if (!q) { this.errorMessage = 'Type something to search'; return; }

    this.searchTerm = q;
    this.loading = true;
    this.errorMessage = '';
    this.cdr.markForCheck();

    this.gifsService.searchGifs(q)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: data => {
          this.gifs = data;
          this.receivedGifs = data.length > 0;
          if (!this.receivedGifs) this.errorMessage = 'No results found.';
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.errorMessage = 'Error fetching GIFs';
          this.loading = false;
          this.cdr.markForCheck();
        }
      });
  }

  selectGif(gif: GiphyGif): void {
    // Track analytics per Giphy ToS
    if (gif.analytics_response_payload) {
      this.gifsService.trackAction(gif.analytics_response_payload, 'click');
    }
    this.gifSelected.emit(gif.images.fixed_height?.url ?? gif.images.original.url);
  }

  // Grid thumbnail: use fixed_height (smaller) if available, else original
  thumbUrl(gif: GiphyGif): string {
    return gif.images.fixed_height?.url ?? gif.images.original.url;
  }

  // Static preview before play: fixed_height_still
  stillUrl(gif: GiphyGif): string {
    return gif.images.fixed_height_still?.url ?? this.thumbUrl(gif);
  }

  onChange(): void {
    this.errorMessage = '';
    this.receivedGifs = true;
  }
}
