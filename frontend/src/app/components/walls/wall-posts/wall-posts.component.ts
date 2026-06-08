import { NgClass } from '@angular/common';
import { ChangeDetectorRef, Component, DestroyRef, ElementRef, HostListener, inject, ViewChild, ChangeDetectionStrategy, OnInit, AfterViewInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LoginmodalComponent } from '../../../modal/loginmodal/loginmodal.component';
import { MessagemodalComponent } from '../../../modal/messagemodal/messagemodal.component';
import { PostmodalComponent } from '../../../modal/postmodal/postmodal.component';
import { DomSanitizer, SafeHtml, SafeUrl } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../../../services/authservice/auth.service';
import { MediaService } from '../../../services/mediaservice/media.service';
import { PostService } from '../../../services/postservice/post.service';
import { SharedDataService } from '../../../services/sharedDataService/shared-data.service';
import { Subject, Observable, map, catchError, of, filter, shareReplay, debounceTime, distinctUntilChanged } from 'rxjs';
import { Post } from '../../../models/post.model';
import { Params } from '@angular/router';
import { Wall } from '../../../shared/models';
import { postPageSize } from '../../../environment-config';
import { WALL_STATUS, POST_STATUS } from '../../../constants/wall.constants';
import { UserReplacerComponent } from '../../data-transformation/user-replacer/user-replacer.component';
import { SanitizeAndCleanHtmlPipe } from '../../../utils/custom-pipe/sanitize-and-clean-html.pipe';
import { WallService } from '../../../services/wallservice/wall.service';
import { SocketService } from '../../../services/socketservice/socket.service';
import { isWallCreator } from '../../../utils/wall.util';
import { handleHttpError } from '../../../utils/error-handler.util';
import { ResponsiveImgDirective } from '../../../directives/responsive-img.directive';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-wall-posts',
  standalone: true,
  imports: [
    NgClass,
    LoginmodalComponent,
    PostmodalComponent,
    MessagemodalComponent,
    UserReplacerComponent,
    SanitizeAndCleanHtmlPipe,
    ResponsiveImgDirective
  ],
  templateUrl: './wall-posts.component.html',
  styleUrl: './wall-posts.component.css'
})
export class WallPostsComponent implements OnInit, AfterViewInit {

  @ViewChild('postContainer') postContainerRef!: ElementRef;
  postIdSubject: Subject<string> = new Subject<string>();
  wallId = '';
  wallTitle = '';
  wallDescription = '';
  posts: Post[] = [];
  openDate: string | Date | null = null;
  isArchived = false;
  closeDate: string | Date | null = null;
  mediaUrls: { [key: string]: SafeUrl } = {};
  currentPage: string | undefined;
  wallCreatorMails!: string[];
  ownerMail = ''
  postId = '';
  @ViewChild(MessagemodalComponent) messageModalComponent!: MessagemodalComponent;
  reaction!: [{ postId: string; reaction: string[] }];
  columns: Post[][] = [[], [], []];
  extraValue = '';
  loginBoolean = true;
  sharedWallUrl = '';
  isPreview!: boolean;
  userEmail: string|null = '';
  nonArchivedNonReportedCount=0;
  nonArchivedCount=0;
  private readonly destroyRef = inject(DestroyRef);
  isOpen=true;
  openDropdownIndex: string | null = null;
  loading = false;
  allLoaded = false;
  // Cursor feed state: null cursor = first page (also returns pinned posts).
  nextCursor: string | null = null;
  firstLoad = true;
  private postUpdatesInitialized = false;
  private pendingReactions = new Set<string>();
  pendingPosts: Post[] = [];
  requireApproval = false;
  showPendingQueue = false;
  searchQuery = '';
  viewerCount = 0;

  // Undo delete state
  undoDeleteToast: { post: Post; columnIndex: number; postIndex: number } | null = null;
  private undoTimer: ReturnType<typeof setTimeout> | null = null;
  undoCountdown = 30;
  private undoInterval: ReturnType<typeof setInterval> | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private toastr: ToastrService,
    private sanitizer: DomSanitizer,
    private mediaService: MediaService,
    private authService: AuthService,
    private postService: PostService,
    private sharedService: SharedDataService,
    private wallService: WallService,
    private socketService: SocketService,
    private cdr: ChangeDetectorRef
  ) {
    this.destroyRef.onDestroy(() => {
      if (this.wallId) {
        this.socketService.emitHandler('leaveWall', this.wallId);
      }
    });
  }

  ngOnInit(): void {
    this.isLoggedIn();
    if(this.loginBoolean || sessionStorage.getItem('viewToken')){
      this.route.params.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params: Params) => {
        // Leave previous wall if navigating to a new one
        if (this.wallId) {
          this.socketService.emitHandler('leaveWall', this.wallId);
        }
        this.wallId = params['momentId'] ?? params['wallId'];
        this.fetchWallDetails();
        this.fetchPosts();
        // Join presence room for this wall
        this.socketService.emitHandler('joinWall', this.wallId);
      });

      // Listen for presence updates
      this.socketService.onHandler<{ wallId: string; count: number }>('presenceUpdate', (data) => {
        if (data.wallId === this.wallId) {
          this.viewerCount = data.count;
          this.cdr.markForCheck();
        }
      });

      this.route.url.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((urlSegments) => {
        this.currentPage = urlSegments[0].path;
      });

      this.sharedService.getIsPreview().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((data)=>{
        this.isPreview = data;
        this.cdr.markForCheck();
      });

      this.updatePosts();
      this.sharedService.getPostSearchQuery().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(q => {
        this.searchQuery = q;
        this.applySearchFilter();
        this.cdr.detectChanges();
      });
    }
  }

  ngAfterViewInit() {
    this.route.queryParams.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params: Params) => {
      const postId = params['postId'];
      this.extraValue = params['extraValue'];
      if (postId) {
        this.scrollToPost(postId);
      }
    }); 
  }

  
  arrayBufferToBlob(buffer: Array<number>, contentType: string): string {
    const arrayBuffer = new Uint8Array(buffer).buffer;
    const blob = new Blob([arrayBuffer], { type: contentType });
    return URL.createObjectURL(blob);
  }

  updateColumnsWithNewPosts(newPosts: Post | Post[]) {  
    const postsArray = Array.isArray(newPosts) ? newPosts : [newPosts];
  
    postsArray.forEach(post => {
        post.profilePicture = '';
        post.estimatedHeight = this.estimatePostHeight(post);
        const shortestColumn = this.getShortestColumn(this.columns);
        shortestColumn.push({ ...post });
      });
    this.columns = [...this.columns];
    };

  distributePosts(posts: Post[]) {
    const columnCount = 3;
    const columns: Post[][] = Array.from({ length: columnCount }, () => [] as Post[]);
  
    const updatePostProfilePicture = (post: Post) => {
      post.profilePicture = '';
      post.estimatedHeight = this.estimatePostHeight(post);
      this.getShortestColumn(columns).push({ ...post });
      this.columns = [...columns];
    };

    posts.forEach(post => {
      updatePostProfilePicture(post)
    });
  }
  
  updatePostInColumns(updatedPost: Post) {
    let postRemoved = false;

    if (!this.columns || !Array.isArray(this.columns)) {
      console.error('Columns is not initialized correctly.');
      return;
    } 
    this.columns.forEach(column => {
      const postIndex = column.findIndex(post => post._id === updatedPost._id);
      if (postIndex !== -1) {
        const existingPost = column[postIndex];
  
        if (updatedPost.isArchived || updatedPost.status === POST_STATUS.DELETED || ((updatedPost.openReportCount ?? updatedPost.reportedBy?.length ?? 0) > 0 && !this.checkWallCreator())) {
          column.splice(postIndex, 1);
          postRemoved = true;
        } else {
          const updatedMediaUrl = updatedPost.media?.url || updatedPost.mediaUrl;
          const existingMediaUrl = existingPost.media?.url || existingPost.mediaUrl;
          if (updatedMediaUrl && updatedMediaUrl !== '#' && updatedMediaUrl !== '' && (!existingMediaUrl || existingMediaUrl === '#')) {
            this.myUrl(updatedMediaUrl).subscribe((safeUrl: SafeUrl) => {
              this.mediaUrls[updatedMediaUrl] = safeUrl;
              this.cdr.markForCheck();
            });
          }
          updatedPost.profilePicture = existingPost.profilePicture;
          updatedPost.estimatedHeight = existingPost.estimatedHeight;
          column[postIndex] = updatedPost;
        }
      }
    });
    if (postRemoved) {
      const emptyColumn = this.columns.find(column => column.length === 0);
      if (emptyColumn) {
        this.redistributePosts();
      } else {
        this.columns = [...this.columns];
      }
    } else {
      this.columns = [...this.columns];
    }
  };

  estimatePostHeight(post: Post): number {
    const baseHeight = 100;
    const contentLengthHeight = post.content ? post.content.length * 0.5 : 0;
    const imageHeight = 300;
    
    let contentImagesHeight = 0;
  
    if (post.content) {
      const div = document.createElement('div');
      div.innerHTML = post.content;
      const images = Array.from(div.querySelectorAll('img'));
      for (const element of images) {
        contentImagesHeight += imageHeight;
      }
    }
  
    const resolvedMediaUrl = post.media?.url || post.mediaUrl;
    const mediaHeight = (resolvedMediaUrl && resolvedMediaUrl !== '#' && resolvedMediaUrl !== '') ? imageHeight : 0;
  
    return baseHeight + contentLengthHeight + contentImagesHeight + mediaHeight;
  }
  
  getColumnHeight(column: Post[]): number {
    return column.reduce((total, post) => total + (post.estimatedHeight || 0), 0);
  }

  trackByColumn(index: number): number {
    return index;
  }

  trackByPost(index: number, post: Post): string {
    return post._id;
  }
  
  getShortestColumn(columns: Post[][]): Post[] {
    return columns.reduce((shortest, column) => this.getColumnHeight(column) < this.getColumnHeight(shortest) ? column : shortest, columns[0]);
  }
  
  isLoggedIn(): void {
    if (this.currentPage != 'download') {
      this.userEmail = this.authService.getEmail();
      this.loginBoolean = !!this.authService.getEmail();
    }
  }
  
  scrollToPost(postId: string): void {
    setTimeout(() => {
      const post = this.posts.find((post) => post._id === postId);
      if (post) {
        if ((post.openReportCount ?? post.reportedBy?.length ?? 0)) {
          const postElement =
            this.postContainerRef?.nativeElement?.querySelector(
              `#post-${postId}`
            );
          if (postElement) {
            postElement.scrollIntoView({
              behavior: 'smooth',
              block: 'center',
              inline: 'nearest',
            });
          }
        } else {
          this.router.navigateByUrl(`moment/${this.wallId}`);
        }
      }
    }, 500);
  }

  fetchWallDetails() {
    this.sharedService.getWallDetails().pipe(
      filter(wallData => !!wallData),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (wallDetails: Wall) => {
        this.wallTitle = wallDetails.title;
        this.ownerMail = wallDetails.ownerEmail;
        this.wallCreatorMails = [...(wallDetails.maintainerEmails || [])];
        this.wallCreatorMails.push(wallDetails.ownerEmail);
        this.isOpen = wallDetails.status === WALL_STATUS.ACTIVE;
        this.requireApproval = wallDetails.postConfig?.requireApproval ?? false;
        if (this.requireApproval && this.checkWallCreator()) {
          this.fetchPendingPosts();
        }
        this.nonArchivedCount = wallDetails.posts?.nonArchivedCount ?? 0,
        this.nonArchivedNonReportedCount = wallDetails.posts?.nonArchivedNonReportedCount ?? 0;
        this.openDate = wallDetails.openDate ?? null;
        this.closeDate = wallDetails.closeDate ?? null;
        this.isArchived = wallDetails.status === WALL_STATUS.ARCHIVED;
        this.wallDescription = wallDetails.description;
        this.cdr.detectChanges();
      },
      error: (err)=>{
        this.router.navigateByUrl('error');
      }
    });

  }

  fetchPosts(){
    if (this.loading || this.allLoaded) {
      return;
    }
    this.loading = true;

    const loadPosts = () => {
      this.postService.getPostsPage(this.wallId, this.nextCursor, postPageSize).subscribe({
        next: (result) => {
          this.loading = false;
          const batch = result.posts;
          if (batch.length > 0) {
            const filteredResult = this.filterPosts(batch).map(post => {
              const postAuthorEmail = post.authorEmail || post.email;
              if (postAuthorEmail === this.userEmail) {
                this.sharedService.setMyPost(true);
              }
              return post;
            });
            this.posts.push(...filteredResult);
            this.preFetchFileUrls();
            this.updateColumnsWithNewPosts(filteredResult);
            this.cdr.detectChanges();
            const allPostsReported = this.posts.every(p => (p.openReportCount ?? p.reportedBy?.length ?? 0) > 0);
            if (this.posts.length > 0 && !allPostsReported) {
              this.sharedService.setPostAvailable(true);
            } else {
              this.sharedService.setPostAvailable(false);
            }
          }
          this.nextCursor = result.nextCursor;
          if (!result.hasMore) {
            this.allLoaded = true;
          }
          this.firstLoad = false;
        },
        error: (err) => {
          handleHttpError(err, this.toastr);
          this.loading = false;
        },
      });
    };

    if (this.firstLoad) {
      loadPosts();
    } else {
      this.loading = true;
      setTimeout(() => {
        loadPosts();
      }, 1300);
    }
  }

  @HostListener('window:scroll')
  onScroll() { 
    if (this.loading || this.allLoaded) {
      return;
    }
  
    const scrollPosition = window.innerHeight + window.scrollY;
    const pageHeight = document.body.offsetHeight;
    const bottomOffset = 200;
  
    if (scrollPosition >= pageHeight - bottomOffset) {
      this.fetchPosts();
    }
    
  }
  
  isReactionPresent(reactionType: string, post: Post): boolean {
    return post.reactions[reactionType]?.includes(this.userEmail ?? '');
  }
  
  react(reactionType: string, postId: string) {
    this.openDropdownIndex = null;
    if (this.currentPage === 'download' || this.isArchived || !this.isOpen) return;
  
    if (!this.userEmail) {
      this.sharedService.setContext('react');
      return;
    }
  
    const post = this.posts.find(p => p._id === postId);
    if (!post) return;

    const existingReaction = post.reactions[reactionType]?.includes(this.userEmail);
    const reactionKey = `${postId}:${reactionType}`;
    if (this.pendingReactions.has(reactionKey)) return;

    this.pendingReactions.add(reactionKey);
    this.updateReactionLocally(postId, reactionType, !existingReaction);

    const reactObservable = existingReaction
      ? this.postService.removeReaction(this.wallId, postId, reactionType)
      : this.postService.react(this.wallId, postId, reactionType);
  
    reactObservable.subscribe({
      next: () => {
        this.pendingReactions.delete(reactionKey);
      },
      error: (err) => {
        this.pendingReactions.delete(reactionKey);
        this.updateReactionLocally(postId, reactionType, existingReaction);
        handleHttpError(err, this.toastr);
      }
    });
  }

  private updateReactionLocally(postId: string, reactionType: string, shouldHaveReaction: boolean): void {
    if (!this.userEmail) return;

    const updatePost = (post: Post): void => {
      if (post._id !== postId) return;

      post.reactions = post.reactions || {};
      const currentUsers = post.reactions[reactionType] || [];
      const nextUsers = shouldHaveReaction
        ? Array.from(new Set([...currentUsers, this.userEmail as string]))
        : currentUsers.filter(email => email !== this.userEmail);

      post.reactions[reactionType] = nextUsers;
    };

    this.posts.forEach(updatePost);
    this.columns.forEach(column => column.forEach(updatePost));
    this.columns = [...this.columns];
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.messageModalComponent) {
      this.messageModalComponent.closeModal();
    }
    this.closeDropdown();
    this.cdr.detectChanges();
  }

  filterPosts(posts: Post[]): Post[] {
    const isActivePost = (post: Post) => post.status === POST_STATUS.ACTIVE || (!post.status && !post.isArchived);
    if (this.currentPage === 'download') {
      return posts.filter(post => isActivePost(post) && (post.openReportCount ?? post.reportedBy?.length ?? 0) === 0);
    }
    if (this.checkWallCreator()) {
      return posts.filter((post: Post) => isActivePost(post));
    } else {
      return posts.filter((post: Post) => isActivePost(post) && (post.openReportCount ?? post.reportedBy?.length ?? 0) === 0);
    }
  }

  preFetchFileUrls() {
    this.posts.forEach((post: Post) => {
      const mediaType = post.media?.type || post.mediaType;
      const mediaUrl = post.media?.url || post.mediaUrl;
      // Images now load directly via ResponsiveImgDirective (srcset/WebP), so we
      // only blob-prefetch video + gif here.
      if (mediaUrl && (
        this.isVideo(mediaType) ||
        this.isGif(mediaType, mediaUrl)
      )) {
        this.myUrl(mediaUrl).subscribe((safeUrl: SafeUrl) => {
          this.mediaUrls[mediaUrl] = safeUrl;
          this.cdr.markForCheck();
        });
      }
    });
  }

  sanitizeHtmlContent(content: string): SafeHtml {
    if (content === null) {
      return '';
    }
    return this.sanitizer.bypassSecurityTrustHtml(content);
  }

  isImage(fileType: string, url: string): boolean {
    if (fileType === 'image' && !url.endsWith('.gif')) {
      return true;
    }
    return false;
  }

  isVideo(fileType: string): boolean {
    if (fileType === 'video') {
      return true;
    }
    return false;
  }

  isGif(fileType: string, url: string): boolean {
    if (fileType === 'image' && url.toLowerCase().endsWith('.gif')) {
      return true;
    }
    return false;
  }

  myUrl(mediaUrl: string): Observable<SafeUrl> {
    return this.mediaService.retrieveFile(mediaUrl).pipe(
      map((blobData: Blob) => {
        const blobUrl = URL.createObjectURL(blobData);
        return this.sanitizer.bypassSecurityTrustUrl(blobUrl);
      }),
      catchError((error) => {
        console.error('Error fetching media:', error);
        return of('');
      })
    );
  }

  setPostId(postId: string) {
    this.postIdSubject.next(postId);
  }

  openUpdatePost(post: Post): void {
    this.sharedService.setSendEmail(false);
    this.setPostId(post._id);
  }

  reportPost(post: Post) {
    if (this.isArchived) return;
    if (!this.userEmail) {
      this.sharedService.setContext('report');
      return;
    }
    this.postService.reportPost(this.wallId, post._id).subscribe({
      next: (data) => {
        this.sharedService.updateWallDetailsPartially({ posts: {
          nonArchivedCount: this.nonArchivedCount,
          nonArchivedNonReportedCount: this.nonArchivedNonReportedCount - 1
        }});
        this.posts = this.posts.map(p => p._id === post._id ? { ...p, ...data } : p);
        this.updatePostInColumns({ ...post, ...data });
        if (!this.checkWallCreator()) {
          this.posts = this.filterPosts(this.posts);
        }
        const allReported = this.posts.every(p => (p.openReportCount ?? p.reportedBy?.length ?? 0) > 0);
        if (this.posts.length === 0 || allReported) {
          this.sharedService.setPostAvailable(false);
        }
        this.toastr.info('Post reported');
        this.cdr.detectChanges();
      },
      error: (err) => handleHttpError(err, this.toastr)
    });
  }

  stopVideo(video: HTMLVideoElement) {
    video.pause();
  }

  unreportPost(post: Post) {
    this.postService.unreportPost(this.wallId, post._id).subscribe({
      next: (data) => {
        this.sharedService.updateWallDetailsPartially({ posts: {
          nonArchivedCount: this.nonArchivedCount, 
          nonArchivedNonReportedCount:this.nonArchivedNonReportedCount + 1
      }  });
        this.updatePostInColumns(data);
        this.posts = this.posts.map(p => p._id === post._id ? { ...p, ...data } : p);
        const allPostsReported = this.posts.every(p => (p.openReportCount ?? p.reportedBy?.length ?? 0) > 0);
        if (this.posts.length === 0 || allPostsReported) {
          this.sharedService.setPostAvailable(false);
        }else{
          this.sharedService.setPostAvailable(true);
        }
      },
      error: (err) => handleHttpError(err, this.toastr)
    });
  }

  sessionTrack(post: Post): boolean {
    return this.userEmail === (post.authorEmail || post.email);
  }  

  deletePost(post: Post) {
    // Cancel any existing undo in flight — commit the previous delete immediately
    if (this.undoTimer) {
      clearTimeout(this.undoTimer);
      clearInterval(this.undoInterval!);
      if (this.undoDeleteToast) this.commitDelete(this.undoDeleteToast.post);
    }

    // Find column + position so we can restore if undone
    let savedColumnIndex = 0;
    let savedPostIndex = 0;
    this.columns.forEach((col, ci) => {
      const pi = col.findIndex(p => p._id === post._id);
      if (pi !== -1) { savedColumnIndex = ci; savedPostIndex = pi; }
    });

    // Optimistically remove from view
    this.posts = this.posts.filter(p => p._id !== post._id);
    this.updatePostInColumns({ ...post, status: POST_STATUS.DELETED });

    // Show undo toast
    this.undoDeleteToast = { post, columnIndex: savedColumnIndex, postIndex: savedPostIndex };
    this.undoCountdown = 30;
    this.cdr.detectChanges();

    this.undoInterval = setInterval(() => {
      this.undoCountdown--;
      this.cdr.detectChanges();
      if (this.undoCountdown <= 0) clearInterval(this.undoInterval!);
    }, 1000);

    this.undoTimer = setTimeout(() => {
      clearInterval(this.undoInterval!);
      this.undoDeleteToast = null;
      this.commitDelete(post);
      this.cdr.detectChanges();
    }, 30000);
  }

  private commitDelete(post: Post) {
    this.postService.deletePost(this.wallId, post._id).subscribe({
      next: () => {
        this.sharedService.updateWallDetailsPartially({
          posts: {
            nonArchivedCount: this.nonArchivedCount - 1,
            nonArchivedNonReportedCount: this.nonArchivedNonReportedCount - 1
          }
        });
        if (this.posts.length === 0) this.sharedService.setPostAvailable(false);
        const userHasPost = this.posts.some(p => (p.authorEmail || p.email) === this.userEmail);
        if (!userHasPost) this.sharedService.setMyPost(false);
      },
      error: (err) => handleHttpError(err, this.toastr)
    });
  }

  undoDelete() {
    if (!this.undoDeleteToast) return;
    if (this.undoTimer) { clearTimeout(this.undoTimer); this.undoTimer = null; }
    if (this.undoInterval) { clearInterval(this.undoInterval); this.undoInterval = null; }

    const { post, columnIndex, postIndex } = this.undoDeleteToast;
    this.undoDeleteToast = null;

    // Restore post to posts array and columns
    this.posts.push(post);
    const col = this.columns[columnIndex];
    col.splice(Math.min(postIndex, col.length), 0, post);
    this.columns = [...this.columns];
    this.cdr.detectChanges();
  }

  pinPost(post: Post) {
    const newPinned = !post.pinned;
    if (newPinned) {
      const pinnedCount = this.posts.filter(p => p.pinned).length;
      if (pinnedCount >= 3) {
        this.toastr.warning('Maximum 3 posts can be pinned per wall');
        return;
      }
    }
    this.postService.pinPost(this.wallId, post._id, newPinned).subscribe({
      next: (updated: Post) => {
        this.posts = this.posts.map(p => p._id === post._id ? { ...p, pinned: updated.pinned } : p);
        this.updatePostInColumns({ ...post, pinned: updated.pinned });
        this.redistributePinnedPosts();
        this.toastr.success(newPinned ? 'Post pinned' : 'Post unpinned');
      },
      error: (err) => handleHttpError(err, this.toastr)
    });
  }

  redistributePinnedPosts() {
    const allPosts = this.posts.filter(p => p.status === POST_STATUS.ACTIVE || (!p.status && !p.isArchived));
    const pinned = allPosts.filter(p => p.pinned);
    const rest = allPosts.filter(p => !p.pinned);
    this.columns = [[], [], []];
    this.distributePosts([...pinned, ...rest]);
  }

  redistributePosts() {
  const allPosts = this.columns.flat();
  this.columns = Array.from({ length: 3 }, () => [] as Post[]);

  allPosts.forEach((post, index) => {
    const columnIndex = index % this.columns.length;
    this.columns[columnIndex].push(post);
  });
  this.columns = [...this.columns];
}

  onModalClosed() {
    this.cdr.detectChanges();
  }

  updatePosts() {
    if (this.postUpdatesInitialized) {
      return;
    }

    this.postUpdatesInitialized = true;
    this.sharedService.getPost().pipe(
      debounceTime(300),
      distinctUntilChanged(),
      filter(data => data !== null),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe((data) => {
      if (data) {
        if (this.posts.some(post => post._id === data._id)) {
          this.updatePostInColumns(data);
          this.posts = this.posts.map(p => p._id === data._id ? { ...p, ...data } : p);
          this.preFetchFileUrls();
          this.cdr.detectChanges();
          this.sharedService.setPost(null);
        } else {
          if (data.status === POST_STATUS.PENDING_APPROVAL) {
            // Creator sees it appear in the pending queue immediately
            if (this.checkWallCreator() && !this.pendingPosts.some(p => p._id === data._id)) {
              this.pendingPosts = [data, ...this.pendingPosts];
              this.showPendingQueue = true;
              this.cdr.detectChanges();
            }
            this.sharedService.setPost(null);
          } else if (this.allLoaded) {
            const newMediaUrl = data.media?.url || data.mediaUrl;
            if (newMediaUrl && newMediaUrl !== '#') {
              this.myUrl(newMediaUrl).subscribe((safeUrl: SafeUrl) => {
                this.mediaUrls[newMediaUrl] = safeUrl;
                this.cdr.markForCheck();
              });
            }
            this.posts.push(data);
            this.updateColumnsWithNewPosts(data);
            this.cdr.detectChanges();
            this.sharedService.setPost(null);
          } else {
            this.fetchPosts();
            this.sharedService.setPost(null);
          }
        }
      }
    });
  }  

  applySearchFilter() {
    const q = this.searchQuery.trim().toLowerCase();
    const base = this.filterPosts(this.posts);
    const filtered = q
      ? base.filter(p => {
          const text = (p.content || '').toLowerCase();
          const author = `${p.authorName?.first || ''} ${p.authorName?.last || ''}`.toLowerCase();
          const email = (p.authorEmail || p.email || '').toLowerCase();
          return text.includes(q) || author.includes(q) || email.includes(q);
        })
      : base;
    this.columns = [[], [], []];
    this.distributePosts(filtered);
  }

  fetchPendingPosts() {
    this.postService.getPendingPosts(this.wallId).subscribe({
      next: (posts: Post[]) => {
        this.pendingPosts = posts;
        if (posts.length > 0) this.showPendingQueue = true;
        this.cdr.detectChanges();
      },
      error: () => {}
    });
  }

  approvePost(post: Post) {
    this.postService.approvePost(this.wallId, post._id).subscribe({
      next: (approved: Post) => {
        this.pendingPosts = this.pendingPosts.filter(p => p._id !== post._id);
        this.posts.push(approved);
        this.updateColumnsWithNewPosts(approved);
        this.sharedService.updateWallDetailsPartially({ posts: {
          nonArchivedCount: this.nonArchivedCount + 1,
          nonArchivedNonReportedCount: this.nonArchivedNonReportedCount + 1
        }});
        this.toastr.success('Post approved');
        this.cdr.detectChanges();
      },
      error: (err) => handleHttpError(err, this.toastr)
    });
  }

  rejectPost(post: Post) {
    this.postService.rejectPost(this.wallId, post._id).subscribe({
      next: () => {
        this.pendingPosts = this.pendingPosts.filter(p => p._id !== post._id);
        this.toastr.info('Post rejected');
        this.cdr.detectChanges();
      },
      error: (err) => handleHttpError(err, this.toastr)
    });
  }

  checkWallCreator(): boolean {
    return isWallCreator(this.userEmail, this.wallCreatorMails);
  }

  openDashboard() {
    if(this.checkWallCreator()){
      this.router.navigateByUrl(`moment/${this.wallId}`);
    }
    else{
      this.router.navigateByUrl('/home/dashboard');
    }
  }

  isWallOpen(): boolean {
    const currentDate = new Date();

    if (this.isOpen && this.openDate && this.closeDate && currentDate >= new Date(this.openDate) && currentDate <= new Date(this.closeDate)) {
        return true;
    }
    else
      return false;
  }

  toggleDropdown(index: string): void {
    this.openDropdownIndex = index;
    this.cdr.detectChanges();
  }

  closeDropdown() {
    this.openDropdownIndex = null;
  }

  showDropdown(post: Post): boolean {
    const isReported = (post.openReportCount ?? post.reportedBy?.length ?? 0) > 0;
    const isUserAuthorized = this.sessionTrack(post);
    const isCreator = this.checkWallCreator();
    const isArchived = this.isArchived;
  
    return (
      (!isReported && !isArchived && isUserAuthorized) ||
      (isUserAuthorized || isCreator) ||
      (isReported && isCreator)
    );
  }
  
}
