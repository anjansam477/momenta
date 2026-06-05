import {
  Component, DestroyRef, ElementRef, OnDestroy, OnInit,
  ViewChild, ViewEncapsulation, HostListener, ChangeDetectorRef, inject,
  ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NgClass } from '@angular/common';
import { PostService } from '../../services/postservice/post.service';
import { Router } from '@angular/router';
import { Post } from '../../models/post.model';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { Observable, catchError, filter, map, of } from 'rxjs';
import { SharedDataService } from '../../services/sharedDataService/shared-data.service';
import { AudioService } from '../../services/audioservice/audio.service';
import { ToastrService } from 'ngx-toastr';
import { UserReplacerComponent } from '../../components/data-transformation/user-replacer/user-replacer.component';
import { MediaService } from '../../services/mediaservice/media.service';
import { SanitizeAndCleanHtmlPipe } from '../../utils/custom-pipe/sanitize-and-clean-html.pipe';
import { Wall } from '../../shared/models';
import { handleHttpError } from '../../utils/error-handler.util';
import { POST_STATUS } from '../../constants/wall.constants';

declare const bootstrap: {
  Modal: {
    new (el: Element, opts?: Record<string, unknown>): { show(): void; hide(): void; dispose(): void };
    getOrCreateInstance(el: Element): { show(): void; hide(): void; dispose(): void };
  }
};

const SLIDE_DURATION_MS = 6000;

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-slideshow',
  standalone: true,
  imports: [NgClass, UserReplacerComponent, SanitizeAndCleanHtmlPipe],
  templateUrl: './slideshow.component.html',
  styleUrls: ['./slideshow.component.css'],
  encapsulation: ViewEncapsulation.None
})
export class SlideshowComponent implements OnInit, OnDestroy {

  @ViewChild('slideshowModal', { static: true }) slideshowModal!: ElementRef;

  private readonly destroyRef = inject(DestroyRef);
  private autoTimer: ReturnType<typeof setTimeout> | undefined;
  private idleTimer: ReturnType<typeof setTimeout> | undefined;
  private progressTimer: ReturnType<typeof setInterval> | undefined;

  wallId = '';
  posts: Post[] = [];
  currentIndex = 0;
  isPaused = false;
  isModalOpen = false;
  loading = true;
  controlsVisible = true;
  isTransitioning = false;
  progressPct = 0;

  mediaUrls: { [key: string]: SafeUrl } = {};
  audio = '';
  title = '';
  description = '';
  currentPage = 1;
  pageSize = 8;
  hasMorePosts = true;

  constructor(
    private postService: PostService,
    private sanitizer: DomSanitizer,
    private sharedService: SharedDataService,
    private router: Router,
    private audioService: AudioService,
    private toastr: ToastrService,
    private mediaService: MediaService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.sharedService.getWallDetails().pipe(
      filter(d => !!d), takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (d: Wall) => {
        this.wallId = d._id;
        this.audio = d.audio;
        this.title = d.title;
        this.description = d.description;
      },
      error: () => this.router.navigateByUrl('error')
    });

    this.setupModalListeners();
  }

  ngOnDestroy() {
    this.clearTimers();
  }

  @HostListener('document:keydown', ['$event'])
  onKey(e: KeyboardEvent) {
    if (!this.isModalOpen) return;
    if (e.key === 'ArrowRight') this.next();
    else if (e.key === 'ArrowLeft') this.prev();
    else if (e.key === ' ') { e.preventDefault(); this.togglePause(); }
    else if (e.key === 'Escape') this.closeModal();
  }

  get currentPost(): Post | null {
    return this.posts[this.currentIndex] ?? null;
  }

  get bgImageStyle(): string {
    const p = this.currentPost;
    if (!p) return '';
    const url = this.mediaUrls[p.mediaUrl || p.media?.url || ''];
    return url ? `url(${url})` : '';
  }

  setupModalListeners() {
    const el = this.slideshowModal?.nativeElement;
    if (!el) return;

    el.addEventListener('shown.bs.modal', () => {
      this.isModalOpen = true;
      this.loading = true;
      this.posts = [];
      this.currentIndex = 0;
      this.currentPage = 1;
      this.hasMorePosts = true;
      this.progressPct = 0;
      this.audioService.playAudioInLoop(this.audio);
      this.fetchPosts();
      setTimeout(() => { this.loading = false; this.startAutoAdvance(); }, 1200);
    });

    el.addEventListener('hidden.bs.modal', () => {
      this.reset();
    });
  }

  fetchPosts() {
    this.postService.getPostsForWall(this.wallId, this.currentPage, this.pageSize).subscribe({
      next: (data: Post[]) => {
        const filtered = data.filter((p: Post) =>
          p.status !== POST_STATUS.DELETED && !p.isArchived &&
          ((p.openReportCount ?? p.reportedBy?.length ?? 0) === 0)
        );
        this.posts = [...this.posts, ...filtered];
        this.hasMorePosts = data.length === this.pageSize;
        filtered.forEach(p => this.preFetchFileUrls(p));
        this.cdr.detectChanges();
      },
      error: (err) => handleHttpError(err, this.toastr)
    });
  }

  preFetchFileUrls(post: Post) {
    const url = post.mediaUrl || post.media?.url;
    if (url && url !== '' && url !== '#') {
      this.myUrl(url).subscribe(safe => { this.mediaUrls[url] = safe; });
    }
  }

  myUrl(mediaUrl: string): Observable<SafeUrl> {
    return this.mediaService.retrieveFile(mediaUrl).pipe(
      map((blob: Blob) => this.sanitizer.bypassSecurityTrustUrl(URL.createObjectURL(blob))),
      catchError(() => of(''))
    );
  }

  goTo(index: number) {
    if (index < 0 || index >= this.posts.length || this.isTransitioning) return;
    this.isTransitioning = true;
    this.currentIndex = index;
    this.progressPct = 0;
    if (index >= this.posts.length - 2 && this.hasMorePosts) {
      this.currentPage++;
      this.fetchPosts();
    }
    setTimeout(() => { this.isTransitioning = false; }, 400);
    if (!this.isPaused) this.resetAutoAdvance();
    this.showControls();
    this.cdr.detectChanges();
  }

  next() {
    if (this.currentIndex < this.posts.length - 1) this.goTo(this.currentIndex + 1);
    else if (!this.hasMorePosts) this.togglePause();
  }

  prev() {
    if (this.currentIndex > 0) this.goTo(this.currentIndex - 1);
  }

  startAutoAdvance() {
    this.clearAutoTimer();
    if (this.isPaused || !this.isModalOpen) return;
    this.progressPct = 0;
    let elapsed = 0;
    this.progressTimer = setInterval(() => {
      elapsed += 50;
      this.progressPct = Math.min(100, (elapsed / SLIDE_DURATION_MS) * 100);
      if (elapsed >= SLIDE_DURATION_MS) { this.clearAutoTimer(); this.next(); }
    }, 50);
  }

  resetAutoAdvance() { this.startAutoAdvance(); }

  clearAutoTimer() {
    if (this.progressTimer) { clearInterval(this.progressTimer); this.progressTimer = undefined; }
  }

  clearTimers() {
    this.clearAutoTimer();
    if (this.idleTimer) clearTimeout(this.idleTimer);
  }

  togglePause() {
    this.isPaused = !this.isPaused;
    if (this.isPaused) {
      this.clearAutoTimer();
      this.audioService.pauseAudio();
    } else {
      this.startAutoAdvance();
      this.audioService.resumeAudio();
    }
    this.showControls();
  }

  toggleAudio() { this.audioService.muteAudio(); }
  isAudioMuted() { return this.audioService.isAudioMuted(); }

  showControls() {
    this.controlsVisible = true;
    if (this.idleTimer) clearTimeout(this.idleTimer);
    this.idleTimer = setTimeout(() => { this.controlsVisible = false; this.cdr.detectChanges(); }, 3000);
  }

  onMouseMove() { this.showControls(); }

  closeModal() {
    const el = document.getElementById('slideshowModal');
    if (el && typeof bootstrap !== 'undefined') bootstrap.Modal.getOrCreateInstance(el).hide();
    this.reset();
  }

  reset() {
    this.isModalOpen = false;
    this.posts = [];
    this.currentIndex = 0;
    this.isPaused = false;
    this.progressPct = 0;
    this.mediaUrls = {};
    this.clearTimers();
    this.audioService.stopAudio();
  }

  getMediaUrl(post: Post): string {
    return post?.mediaUrl || post?.media?.url || '';
  }

  getMediaType(post: Post): string {
    return post?.mediaType || post?.media?.type || '';
  }
}
