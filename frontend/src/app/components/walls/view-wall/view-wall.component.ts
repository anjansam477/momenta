import { ChangeDetectorRef, Component, OnDestroy, OnInit} from '@angular/core';
import { WallNavbarComponent } from '../../../utils/wall-navbar/wall-navbar.component';
import { CommonModule } from '@angular/common';
import { TitleBarComponent } from '../../../utils/title-bar/title-bar.component';
import { ActivatedRoute, Router } from '@angular/router';
import { WallService } from '../../../services/wallservice/wall.service';
import { WallPostsComponent } from '../wall-posts/wall-posts.component';
import { SharedDataService } from '../../../services/sharedDataService/shared-data.service';
import { Subscription, catchError, filter, of, timeout } from 'rxjs';
import { BackgroundImageService } from '../../../services/backgroundimageservice/background-image.service';
import { AnimationService } from '../../../services/animationservice/animation.service';
import { AudioService } from '../../../services/audioservice/audio.service';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../../../services/authservice/auth.service';
import { CookieService } from 'ngx-cookie-service';

@Component({
  selector: 'app-view-wall',
  standalone: true,
  imports: [
    WallNavbarComponent, 
    CommonModule, 
    TitleBarComponent,
    WallPostsComponent
  ],
  templateUrl: './view-wall.component.html',
  styleUrl: './view-wall.component.css'
})

export class ViewWallComponent implements OnInit ,OnDestroy{

  wallId: string = '';
  wallCreatorMails: string[] =[];
  isPreview : boolean = false;
  anyoneCanView: boolean = false;
  anyoneCanPost: boolean = false;
  viewAccess: { emails?: string[], domains?: string[] } = {};
  postAccess: { emails?: string[], domains?: string[] } = {};
  userEmail: string = '';
  private wallDetailsSubscription: Subscription | undefined;
  private sharedWallDetailsSubscription: Subscription | undefined;
  selectedBackground: string = '';
  selectedAnimation:string ='';
  selectedAudio:string='';
  hasAudio: boolean = false;
  isMuted:boolean=false;
  currentPage: string | undefined;
  animation: string="";
  isMomentReady = false;
  private themesLoaded = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private wallService: WallService,
    private sharedService: SharedDataService,
    private backgroundService:BackgroundImageService,
    private animationService: AnimationService,
    private audioService: AudioService,
    private toastr: ToastrService,
    private authService: AuthService,
    private cookieService: CookieService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.sharedService.setIsPreview(false);
    this.wallId = this.route.snapshot.paramMap.get('momentId') ?? this.route.snapshot.paramMap.get('wallId')!;
    if(this.cookieService.get('authToken')){
      this.authService.storeToken(this.cookieService.get('authToken'));
      this.authService.storeEmail(this.cookieService.get('email'));
      this.authService.storeName(this.cookieService.get('name'));
      this.authService.removeUserCookie();
    }
    
    this.route.queryParams.subscribe((params:any) => {
      const token = params['token'];
      if (token) {
        sessionStorage.setItem('viewToken', token);
        this.router.navigate(['/moment', this.wallId], { replaceUrl: true });
      }else if(localStorage.getItem('authToken') || sessionStorage.getItem('viewToken')){
        this.fetchWallDetails();
      } else{
        const redirectUrl = encodeURIComponent(this.router.url);
        this.router.navigateByUrl(`login?redirectUrl=${redirectUrl}`);
      }      
    });

    this.sharedWallDetailsSubscription = this.sharedService.getWallDetails().pipe(
      filter(wallData => !!wallData)
    ).subscribe((wallData: any) => {
      this.applyMomentDetails(wallData);
    });

    this.sharedService.getIsPreview().subscribe((data)=>{
      this.isPreview = data;
      if (this.selectedAnimation) {
        this.animationService.startAnimation(this.selectedAnimation);
      }
      if (this.selectedAudio) {
        this.audioService.playAudio(this.selectedAudio);
      }
    })

    this.route.url.subscribe((urlSegments) => {
      this.currentPage = urlSegments[0].path;
    });

    this.userEmail = localStorage.getItem('email') || '';

    this.updateBackgroundImage();
  }

  ngOnDestroy(): void {
    this.animationService.stopAnimation();
    this.audioService.stopAudio();
    if (this.wallDetailsSubscription) {
      this.wallDetailsSubscription.unsubscribe();
    }
    if (this.sharedWallDetailsSubscription) {
      this.sharedWallDetailsSubscription.unsubscribe();
    }
    this.sharedService.setWallDetails(null); 
  }

  fetchWallDetails() {
    this.isMomentReady = true;

    if (this.wallDetailsSubscription) {
      this.wallDetailsSubscription.unsubscribe();
    }

    this.wallDetailsSubscription = this.wallService.getWallById(this.wallId).pipe(
      timeout(8000),
      catchError((error) => {
        this.isMomentReady = true;
        if (error?.name !== 'TimeoutError') {
          this.router.navigateByUrl('error');
        }
        return of(null);
      })
    ).subscribe({
      next: (response: any) => {
        if (!response) {
          return;
        }

        const wallData = response.wallDetails ?? response;
        if (!wallData?._id && !wallData?.title) {
          this.isMomentReady = true;
          return;
        }

        this.sharedService.setWallDetails(wallData);
  
        if (this.checkWallCreator()) {
          this.setThemes();
          return;
        }
  
        if (!sessionStorage.getItem('viewToken')) {
          if (!this.userEmail) {
            this.router.navigateByUrl('login');
            return;
          }
  
          if (wallData.receivers?.includes(this.userEmail)) {
            return;
          }

          const { anyoneCanView, anyoneCanPost, viewAccess, postAccess } = wallData;
          if (!anyoneCanView && !anyoneCanPost) {
            this.verifyAccess(viewAccess, postAccess);
          }
        }
      },
      error: () => this.router.navigateByUrl('error')
    });
  }

  private applyMomentDetails(wallData: any): void {
    this.selectedBackground = wallData.theme?.bgImg || wallData.bgImg || '';
    this.selectedAnimation = wallData.theme?.animationId || wallData.animationId || '';
    this.selectedAudio = wallData.theme?.audio || wallData.audio || '';
    this.animation = this.selectedAnimation;
    this.animationService.setSelectedAnimation(this.selectedAnimation);

    if (this.selectedAudio) {
      this.audioService.playAudio(this.selectedAudio);
    }
    if (this.selectedAnimation) {
      this.animationService.startAnimation(this.selectedAnimation);
    }

    this.wallCreatorMails = [
      ...(wallData.maintainerEmails || []),
      wallData.ownerEmail
    ].filter(Boolean);
    this.isMomentReady = true;

    if (this.checkWallCreator()) {
      this.setThemes();
    }
    this.cdr.detectChanges();
  }
  
  verifyAccess(viewAccess: any, postAccess: any) {
    const allowedEmails = [...(viewAccess.emails || []), ...(postAccess.emails || [])];
    const allowedDomains = [...(viewAccess.domains || []), ...(postAccess.domains || [])];
    const userDomain = this.userEmail?.split('@')[1] || '';
  
    if (allowedEmails.length || allowedDomains.length) {
      const hasEmailAccess = allowedEmails.includes(this.userEmail);
      const hasDomainAccess = allowedDomains.includes(userDomain);
  
      if (!hasEmailAccess && !hasDomainAccess) {
        this.router.navigateByUrl('error');
      }
    } else {
      this.router.navigateByUrl('error');
    }
  }
  
  checkWallCreator(): boolean {
    if (this.wallCreatorMails && Array.isArray(this.wallCreatorMails)) {
      return this.wallCreatorMails.some(email => typeof this.userEmail === 'string' && email === this.userEmail);
    }
    
    return false;
  }

  updateBackgroundImage(): void {
    if (this.selectedBackground === '') {
      this.backgroundService.getSelectedBgSubject().subscribe((bg) => {
        this.selectedBackground = bg;
      });
    }
  }

  setThemes(): void {
    if (this.themesLoaded || this.sharedService.themes().length > 0) {
      this.themesLoaded = true;
      return;
    }

    this.themesLoaded = true;
    this.backgroundService.getThemes().subscribe({
      next: (data) => {
      this.sharedService.setThemes(data);
    }, error: (err)=>{
      this.toastr.error(err.error.message);
    }});
  }

}
