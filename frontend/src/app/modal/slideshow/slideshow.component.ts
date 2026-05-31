import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { PostService } from '../../services/postservice/post.service';
import { Router } from '@angular/router';
import { Post } from '../../models/post.model';
import { SlickCarouselComponent, SlickCarouselModule } from 'ngx-slick-carousel';
import { DomSanitizer, SafeHtml, SafeUrl } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { Observable, Subscription, catchError, filter, map, of } from 'rxjs';
import { SharedDataService } from '../../services/sharedDataService/shared-data.service';
import { AudioService } from '../../services/audioservice/audio.service';
import { animate, state, style, transition, trigger } from '@angular/animations';
import { ToastrService } from 'ngx-toastr';
import { UserReplacerComponent } from '../../components/data-transformation/user-replacer/user-replacer.component';
import { MediaService } from '../../services/mediaservice/media.service';
import { SanitizeAndCleanHtmlPipe } from '../../utils/custom-pipe/sanitize-and-clean-html.pipe';

declare const bootstrap: any;

interface UserProfile {
  profilePic: string;
  firstName: string;
  lastName:string;
}

@Component({
  selector: 'app-slideshow',
  standalone: true,
  imports: [SlickCarouselModule, CommonModule, UserReplacerComponent, SanitizeAndCleanHtmlPipe],
  templateUrl: './slideshow.component.html',
  styleUrls: ['./slideshow.component.css'],
  animations: [
    trigger('fadeInAnimation', [
      state('fadeIn', style({ opacity: 1 })),
      state('fadeOut', style({ opacity: 0 })),
      transition('fadeOut => fadeIn', animate('1s ease-in'))
    ])
  ],
  encapsulation: ViewEncapsulation.None
})
export class SlideshowComponent implements OnInit, AfterViewInit,OnDestroy {

  @ViewChild('slickModal') slickModal!: SlickCarouselComponent;
  @ViewChild('slideshowModal', { static: true }) slideshowModal!: ElementRef;
  private wallDetailsSubscription!: Subscription;
  wallId: string = '';
  posts: Post[] = [];
  currentIndex: number = 0;
  isPaused: boolean = false;
  mediaUrls: { [key: string]: SafeUrl } = {};
  audio: string = '';
  title: string = "";
  slideConfig = {
    slidesToShow: 1,
    slidesToScroll: 1,
    dots: false,
    infinite: true,
    autoplay: true,
    autoplaySpeed: 6500,
    arrows: false,
    fade: true,
    initialSlide: 0
  };
  loading: boolean = true;
  pendingRequests = new Map<string, Observable<UserProfile>>();
  description: string = "";
  fade1State: string = 'fadeOut';
  fade2State: string = 'fadeOut';
  currentPage = 1;
  pageSize = 5;
  hasMorePosts = true;
  isModalOpen=false;
  postLength: number = 0;

  constructor(
    private postService: PostService,
    private sanitizer: DomSanitizer,
    private sharedService: SharedDataService,
    private router: Router,
    private audioService: AudioService,
    private toastr: ToastrService,
    private mediaService:MediaService
  ) { }

  ngOnDestroy(): void {
      if (this.wallDetailsSubscription) {
        this.wallDetailsSubscription.unsubscribe();
      }  
  }

  ngOnInit(): void {
   this.wallDetailsSubscription = 
   this.sharedService.getWallDetails().pipe(
     filter(wallData => !!wallData)).subscribe({
     next: (wallData: any) => {
      this.wallId = wallData._id;
      this.audio = wallData.audio;
      this.title = wallData.title;
      this.description = wallData.description;
      this.postLength = wallData.posts.nonArchivedNonReportedCount;
     },
     error: (err)=>{
       this.router.navigateByUrl('error');
       return;
     }
   });
  }


  ngAfterViewInit(): void {
    this.setupModalListeners();
    if (this.slickModal) {
      setTimeout(() => {
        this.slickModal.slickGoTo(0);
      }, 0);
    }
    
  }

  startAnimation() {
    this.loading=true;
    this.fade1State = 'fadeOut';
    this.fade2State = 'fadeOut';
    if (this.isPaused) {
      this.togglePause();
    }
    if (this.isAudioMuted()) {
      this.toggleAudio();
    }
  
    setTimeout(() => {
      this.fade1State = 'fadeIn';
    },1000); 
    setTimeout(() => {
      this.fade2State = 'fadeIn';
    }, 1600); 
    setTimeout(()=>{
    this.loading = false;
    },2600)
  }


  fetchPosts() {
      this.postService.getPostsForWall(this.wallId, this.currentPage, this.pageSize).subscribe({
      next:(data) => {
      const newPosts = data.filter((post:Post) => post.status !== 'deleted' && !post.isArchived && ((post.openReportCount ?? post.reportedBy?.length ?? 0) === 0));
      this.posts = [...this.posts, ...newPosts];
      this.hasMorePosts = data.length === this.pageSize;
      this.loading = false;
      this.posts.forEach(post => {
        this.preFetchFileUrls(post);
      })  
    }, error: (err)=>{
      if(err.status!==401){
        this.toastr.error(err.error.message)
      }
      this.loading = false;
    }
  })
  }


  preFetchFileUrls(post: any) {
      if (post.mediaUrl !== '' && post.mediaUrl !== "#") {
        this.myUrl(post.mediaUrl).subscribe((safeUrl: SafeUrl) => {
          this.mediaUrls[post.mediaUrl] = safeUrl;
        });
      }
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

  togglePause() {
    if (this.slickModal) {
      if (this.isPaused) {
        this.slickModal.slickPlay();
        this.audioService.resumeAudio();
      } else {
        this.audioService.pauseAudio();
        this.slickModal.slickPause();
      }
      this.isPaused = !this.isPaused;
    }
  }

  toggleAudio() {
    this.audioService.muteAudio();
  }

  isAudioMuted(): boolean {
    return this.audioService.isAudioMuted();
  }

  afterChange(event: any) {
    if(!this.isModalOpen){
      return;
    }
    this.currentIndex = event.currentSlide;
    if (this.currentIndex === this.posts.length - 2 && this.hasMorePosts) {
      this.currentPage++;
      this.fetchPosts();
    }
    else if(!this.hasMorePosts && this.currentIndex === this.posts.length - 1){
      this.slickModal.slickPause();
    }
 
    if(this.currentIndex < this.posts.length -1 && !this.isPaused){
          this.slickModal.slickPlay();
    }
  }

  closeModal() {
    this.isModalOpen=false;
    this.posts=[];
    this.currentPage=1;
    this.isPaused= false;
    const modalElement = document.getElementById('slideshowModal');
    if (modalElement && typeof bootstrap !== 'undefined') {
      bootstrap.Modal.getOrCreateInstance(modalElement).hide();
    }
    this.audioService.stopAudio();
    this.removeBackdrop();
  }

  setupModalListeners() {
    if(this.slideshowModal){
      const modalElement = this.slideshowModal.nativeElement;
      modalElement.addEventListener('shown.bs.modal', () => {
        this.audioService.playAudioInLoop(this.audio);
        this.isModalOpen=true;
        this.fetchPosts();
        this.startAnimation();
        this.currentIndex=0;
        this.addBackdrop();
       });
    }
  }

  getProgress(): number {
    if (!this.postLength) {
      return 0;
    }

    return Math.min(100, ((this.currentIndex + 1) / this.postLength) * 100);
  }

  sanitizeHtmlContent(content: string): SafeHtml {
    if (content === null) {
      return '';
    }
    return this.sanitizer.bypassSecurityTrustHtml(content);
  }

  removeBackdrop() {
    const backdrops = document.querySelectorAll('.modal-backdrop');
    backdrops.forEach(backdrop => backdrop.parentNode?.removeChild(backdrop));
  }

  addBackdrop() {
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop fade show';
    document.body.appendChild(backdrop);
  }

  prev(){
    if(this.currentIndex!==0){
      this.slickModal.slickPrev();
    }
  }

  next(){
    if(this.currentIndex!==this.posts.length-1){
      this.slickModal.slickNext();
    }
  }

}
