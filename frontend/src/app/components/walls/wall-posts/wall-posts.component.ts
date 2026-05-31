import { ChangeDetectorRef, Component, ElementRef, HostListener, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
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
import { Subject, Observable, map, catchError, of, filter, shareReplay, debounceTime, distinctUntilChanged, takeUntil, Subscription } from 'rxjs';
import { Post } from '../../../models/post.model';
import { postPageSize } from '../../../environment-config';
import { UserReplacerComponent } from '../../data-transformation/user-replacer/user-replacer.component';
import { SanitizeAndCleanHtmlPipe } from '../../../utils/custom-pipe/sanitize-and-clean-html.pipe';
import { WallService } from '../../../services/wallservice/wall.service';

@Component({
  selector: 'app-wall-posts',
  standalone: true,
  imports: [ 
    CommonModule, 
    LoginmodalComponent, 
    PostmodalComponent, 
    MessagemodalComponent, 
    UserReplacerComponent,
    SanitizeAndCleanHtmlPipe
  ],
  templateUrl: './wall-posts.component.html',
  styleUrl: './wall-posts.component.css'
})
export class WallPostsComponent {

  @ViewChild('postContainer') postContainerRef!: ElementRef;
  postIdSubject: Subject<string> = new Subject<string>();
  wallId: string = '';
  wallTitle: string = '';
  wallDescription: string = '';
  posts: Post[] = [];
  openDate!: Date;
  isArchived: boolean = false;
  closeDate!: Date;
  mediaUrls: { [key: string]: SafeUrl } = {};
  currentPage: string | undefined;
  wallCreatorMails!: string[];
  ownerMail: string = ''
  postId: string = '';
  @ViewChild(MessagemodalComponent) messageModalComponent!: MessagemodalComponent;
  reaction!: [{postId: any, reaction:string[]}];
  columns: Post[][] = [[], [], []];
  extraValue = '';
  loginBoolean = true;
  sharedWallUrl: string = '';
  isPreview!: boolean;
  userEmail: string|null = '';
  nonArchivedNonReportedCount:number=0;
  nonArchivedCount:number=0;
  private unsubscribe$ = new Subject<void>();
  isOpen:boolean=true;
  private wallDetailsSubscription: Subscription | undefined;
  openDropdownIndex: string | null = null;
  loading = false;
  allLoaded = false;
  page = 1;
  private postUpdatesInitialized = false;
  private pendingReactions = new Set<string>();
  
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
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.isLoggedIn();
    if(this.loginBoolean || sessionStorage.getItem('viewToken')){
      this.route.params.subscribe((params: any) => {
        this.wallId = params['momentId'] ?? params['wallId'];
        this.fetchWallDetails();
        this.fetchPosts();
      });
  
      this.route.url.subscribe((urlSegments) => {
        this.currentPage = urlSegments[0].path;
      });
  
      this.sharedService.getIsPreview().subscribe((data)=>{
        this.isPreview = data
      })

      this.updatePosts();
    }
  }

  ngAfterViewInit() {
    this.route.queryParams.subscribe((params: any) => {
      const postId = params['postId'];
      this.extraValue = params['extraValue'];
      if (postId) {
        this.scrollToPost(postId);
      }
    }); 
  }

  ngOnDestroy() {
    this.unsubscribe$.next();
    this.unsubscribe$.complete();
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
  
        if (updatedPost.isArchived || updatedPost.status === 'deleted' || ((updatedPost.openReportCount ?? updatedPost.reportedBy?.length ?? 0) > 0 && !this.checkWallCreator())) {
          column.splice(postIndex, 1);
          postRemoved = true;
        } else {
          const updatedMediaUrl = updatedPost.media?.url || updatedPost.mediaUrl;
          const existingMediaUrl = existingPost.media?.url || existingPost.mediaUrl;
          if (updatedMediaUrl && updatedMediaUrl !== '#' && updatedMediaUrl !== '' && (!existingMediaUrl || existingMediaUrl === '#')) {
            this.myUrl(updatedMediaUrl).subscribe((safeUrl: SafeUrl) => {
              this.mediaUrls[updatedMediaUrl] = safeUrl;
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
      for (let element of images) {
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
      this.loginBoolean = !!localStorage.getItem('email');
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
    this.wallDetailsSubscription = this.sharedService.getWallDetails().pipe(
      filter(wallData => !!wallData),
      takeUntil(this.unsubscribe$)
    ).subscribe({
      next: (wallDetails: any) => {
        this.wallTitle = wallDetails.title;
        this.ownerMail = wallDetails.ownerEmail;
        this.wallCreatorMails = [...(wallDetails.maintainerEmails || [])];
        this.wallCreatorMails.push(wallDetails.ownerEmail);
        // Support both old isOpen and new status field
        this.isOpen = wallDetails.status === 'active' || wallDetails.isOpen;
        this.nonArchivedCount = wallDetails.posts?.nonArchivedCount ?? 0,
        this.nonArchivedNonReportedCount = wallDetails.posts?.nonArchivedNonReportedCount ?? 0;
        this.openDate = wallDetails.openDate;
        this.closeDate = wallDetails.closeDate;
        // Support both old isArchived and new status field
        this.isArchived = wallDetails.status === 'archived' || wallDetails.isArchived;
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
      this.postService.getPostsForWall(this.wallId, this.page).subscribe({
        next: (result) => {
          this.loading = false;
          if (result.length > 0) {
            const filteredResult = this.filterPosts(result).map(post => {
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
            if(result.length < postPageSize){
              this.allLoaded = true;
            }
            this.page++;
          } else {
            this.allLoaded = true;
          }
        },
        error: (err) => {
          if(err.status!==401){
            this.toastr.error(err.error.message)
          }
          this.loading = false;
        },
      });
    };
  
    if (this.page === 1) {
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
  
  isReactionPresent(reactionType: string, post: any): boolean {
    return post.reactions[reactionType]?.includes(this.userEmail);
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
        if(err.status!==401){
          this.toastr.error(err.error.message)
        }
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
  }

  filterPosts(posts: any[]): any[] {
    const isActivePost = (post: any) => post.status === 'active' || (!post.status && !post.isArchived);
    if (this.currentPage === 'download') {
      return posts.filter(post => isActivePost(post) && (post.openReportCount ?? post.reportedBy?.length ?? 0) === 0);
    }
    if (this.checkWallCreator()) {
      return posts.filter((post: any) => isActivePost(post));
    } else {
      return posts.filter((post: any) => isActivePost(post) && (post.openReportCount ?? post.reportedBy?.length ?? 0) === 0);
    }
  }

  preFetchFileUrls() {
    this.posts.forEach((post: any) => {
      const mediaType = post.media?.type || post.mediaType;
      const mediaUrl = post.media?.url || post.mediaUrl;
      if (mediaUrl && (
        this.isImage(mediaType, mediaUrl) ||
        this.isVideo(mediaType) ||
        this.isGif(mediaType, mediaUrl)
      )) {
        this.myUrl(mediaUrl).subscribe((safeUrl: SafeUrl) => {
          this.mediaUrls[mediaUrl] = safeUrl;
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

  openUpdatePost(post: any): void {
    this.sharedService.setSendEmail(false);
    this.setPostId(post);
  }

  // reportPost(post: Post) {
  //   if(!this.isArchived){
  //     if (this.userEmail) {
  //       const wallId = this.wallId;  
  //       this.postService.reportPost(wallId, post._id).subscribe({
  //         next:(data) => {
  //         this.sharedService.updateWallDetailsPartially({ posts: {
  //             nonArchivedCount: this.nonArchivedCount, 
  //             nonArchivedNonReportedCount:this.nonArchivedNonReportedCount - 1
  //         }  });
  //         this.posts = this.posts.map(p => p._id === post._id ? { ...p, ...data } : p);
  //         this.updatePostInColumns(data)
  //         this.posts = this.filterPosts(this.posts);
  //         const allPostsReported = this.posts.every(p => (p.openReportCount ?? p.reportedBy?.length ?? 0) > 0);
  //         if (this.posts.length === 0 || allPostsReported) {
  //           this.sharedService.setPostAvailable(false);
  //         }
  //         const userHasPost = this.posts.some(p => p.email === this.userEmail);
  //         if(!userHasPost){
  //           this.sharedService.setMyPost(false);
  //         }
  //       },error: (err)=>{
  //         if(err.status!==401){
  //           this.toastr.error(err.error.message)
  //         }
  //       }
  //     });
  //     } else {
  //       this.sharedService.setContext('report');
  //     }
  //   }
  // }

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
      error: (err) => {
        if(err.status!==401){
          this.toastr.error(err.error.message)
        }
      }
    });
  }

  sessionTrack(post: Post): boolean {
    return this.userEmail === (post.authorEmail || post.email);
  }  

  deletePost(post: Post) {
    this.postService.deletePost(this.wallId, post._id).subscribe({
      next: (data) => {
        this.sharedService.updateWallDetailsPartially({
          posts: {
            nonArchivedCount: this.nonArchivedCount - 1,
            nonArchivedNonReportedCount: this.nonArchivedNonReportedCount - 1
          }
        });
        this.posts = this.posts.filter(p => p._id !== post._id);
      if(this.posts.length===0){
        this.sharedService.setPostAvailable(false);
      }
      const userHasPost = this.posts.some(p => (p.authorEmail || p.email) === this.userEmail);
      if(!userHasPost){
        this.sharedService.setMyPost(false);
      }
      this.updatePostInColumns(data)
    },
    error: (err)=>{
      if(err.status!==401){
        this.toastr.error(err.error.message)
      }
    }
  });
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
      takeUntil(this.unsubscribe$)
    ).subscribe((data) => {
      if (data) {
        if (this.posts.some(post => post._id === data._id)) {
          this.updatePostInColumns(data);
          this.posts = this.posts.map(p => p._id === data._id ? { ...p, ...data } : p);
          this.preFetchFileUrls();
          this.cdr.detectChanges();
          this.sharedService.setPost(null);
        } else {
          if (this.allLoaded) {
            const newMediaUrl = data.media?.url || data.mediaUrl;
            if (newMediaUrl && newMediaUrl !== '#') {
              this.myUrl(newMediaUrl).subscribe((safeUrl: SafeUrl) => {
                this.mediaUrls[newMediaUrl] = safeUrl;
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

  checkWallCreator(): boolean {    
    if (this.wallCreatorMails && Array.isArray(this.wallCreatorMails)) {
      return this.wallCreatorMails.some(email => typeof this.userEmail === 'string' && email === this.userEmail);
    }
    return false;
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

    if (this.isOpen && currentDate >= this.openDate && currentDate <= this.closeDate) {
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

  showDropdown(post: any): boolean {
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
