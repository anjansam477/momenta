import { DatePipe, NgClass } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  OnDestroy,
  OnInit,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Params } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { Post } from '../../../models/post.model';
import { Wall } from '../../../shared/models';
import { WallService } from '../../../services/wallservice/wall.service';
import { PostService } from '../../../services/postservice/post.service';
import { MediaService } from '../../../services/mediaservice/media.service';
import { getInitials, convertBufferToBase64 } from '../../../utils/user.util';

/** A reaction summarized for the printed memory — icon + how many people gave it. */
interface ReactionTally {
  icon: string;
  label: string;
  count: number;
}

/** A post flattened into everything the export needs, with media already resolved. */
interface MemoryPost {
  id: string;
  author: string;
  initials: string;
  avatar: string;
  date: Date;
  content: string;
  mediaUrl: string;        // resolved blob/object URL for the image, gif or video thumbnail
  badge: '' | 'GIF' | 'Video' | 'Sticker';
  reactions: ReactionTally[];
  totalReactions: number;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-download-wall',
  standalone: true,
  imports: [DatePipe, NgClass],
  templateUrl: './download-wall.component.html',
  styleUrl: './download-wall.component.css',
})
export class DownloadWallComponent implements OnInit, OnDestroy {
  private readonly destroyRef = inject(DestroyRef);

  wall: Wall | null = null;
  posts: MemoryPost[] = [];
  loading = true;
  failed = false;
  bgUrl = '';
  generatedOn = new Date();

  /** Display order + iconography for reactions, mirroring the live wall. */
  private readonly reactionMeta: { key: string; icon: string; label: string }[] = [
    { key: 'heart', icon: 'bi-heart-fill', label: 'Heart' },
    { key: 'celebrate', icon: 'bi-stars', label: 'Celebrate' },
    { key: 'laugh', icon: 'bi-emoji-laughing-fill', label: 'Laugh' },
    { key: 'like', icon: 'bi-hand-thumbs-up-fill', label: 'Like' },
    { key: 'wow', icon: 'bi-emoji-surprise-fill', label: 'Wow' },
    { key: 'sad', icon: 'bi-emoji-frown-fill', label: 'Sad' },
  ];

  private objectUrls: string[] = [];

  constructor(
    private readonly route: ActivatedRoute,
    private readonly wallService: WallService,
    private readonly postService: PostService,
    private readonly mediaService: MediaService,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.route.params.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params: Params) => {
      const wallId = params['momentId'] ?? params['wallId'];
      if (wallId) this.load(wallId);
    });
  }

  ngOnDestroy(): void {
    this.objectUrls.forEach((u) => URL.revokeObjectURL(u));
  }

  get totalReactions(): number {
    return this.posts.reduce((sum, p) => sum + p.totalReactions, 0);
  }

  private load(wallId: string): void {
    forkJoin({
      wall: this.wallService.getWallById(wallId).pipe(catchError(() => of(null))),
      posts: this.postService.getPostsForWall(wallId, 1, 1000).pipe(catchError(() => of([] as Post[]))),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ wall, posts }) => {
        const resolvedWall = (wall as { wallDetails?: Wall })?.wallDetails ?? (wall as Wall | null);
        if (!resolvedWall) {
          this.failed = true;
          this.loading = false;
          this.cdr.markForCheck();
          return;
        }
        this.wall = resolvedWall;
        this.bgUrl = resolvedWall.bgImg || 'assets/images/background_images/Default/default_background.png';

        // Newest-last reads like a timeline / scrapbook of the moment.
        const ordered = [...(posts || [])].sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        );
        this.posts = ordered.map((p) => this.toMemoryPost(p));
        this.loading = false;
        this.cdr.markForCheck();

        this.hydrateMedia(ordered);
      });
  }

  private toMemoryPost(p: Post): MemoryPost {
    const first = p.authorName?.first || p.firstName || '';
    const last = p.authorName?.last || p.lastName || '';
    const author = `${first} ${last}`.trim() || p.authorEmail || p.email || 'Someone';

    const reactions: ReactionTally[] = this.reactionMeta
      .map((m) => ({ icon: m.icon, label: m.label, count: p.reactions?.[m.key]?.length ?? 0 }))
      .filter((r) => r.count > 0);

    return {
      id: p._id,
      author,
      initials: getInitials({ fullName: author, email: p.authorEmail }),
      avatar: this.resolveAvatar(p.profilePicture),
      date: p.createdAt,
      content: p.content || '',
      mediaUrl: '',
      badge: this.badgeFor(p),
      reactions,
      totalReactions: reactions.reduce((s, r) => s + r.count, 0),
    };
  }

  private badgeFor(p: Post): MemoryPost['badge'] {
    const type = (p.media?.type || p.mediaType || '').toLowerCase();
    if (type.includes('video')) return 'Video';
    if (type.includes('gif')) return 'GIF';
    if (type.includes('sticker')) return 'Sticker';
    return '';
  }

  /** Load each post's media as a blob URL — image/gif directly, video via its thumbnail. */
  private hydrateMedia(posts: Post[]): void {
    posts.forEach((p, idx) => {
      const type = (p.media?.type || p.mediaType || '').toLowerCase();
      const direct = p.media?.url || p.mediaUrl || '';
      const source = type.includes('video') ? (p.media?.thumbnailUrl || '') : direct;
      if (!source || source === '#') return;

      this.mediaService
        .retrieveFile(source)
        .pipe(
          map((blob) => URL.createObjectURL(blob)),
          catchError(() => of('')),
          takeUntilDestroyed(this.destroyRef),
        )
        .subscribe((url) => {
          if (url && this.posts[idx]) {
            this.objectUrls.push(url);
            this.posts[idx].mediaUrl = url;
            this.cdr.markForCheck();
          }
        });
    });
  }

  private resolveAvatar(pic: Post['profilePicture']): string {
    if (!pic) return '';
    if (typeof pic === 'string') return pic;
    if (typeof pic === 'object' && 'data' in pic) {
      try { return convertBufferToBase64(pic as { contentType: string; data: number[] }); }
      catch { return ''; }
    }
    return '';
  }

  // ── Actions (screen only) ─────────────────────────────
  saveAsPdf(): void {
    window.print();
  }

  closeTab(): void {
    window.close();
  }

  trackPost = (_: number, p: MemoryPost) => p.id;
}
