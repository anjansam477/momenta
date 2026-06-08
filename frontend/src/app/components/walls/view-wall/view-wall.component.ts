import { NgStyle } from '@angular/common';
import { ChangeDetectorRef, Component, DestroyRef, OnDestroy, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { WallNavbarComponent } from '../../../utils/wall-navbar/wall-navbar.component';
import { TitleBarComponent } from '../../../utils/title-bar/title-bar.component';
import { ActivatedRoute, Router } from '@angular/router';
import { WallService } from '../../../services/wallservice/wall.service';
import { WallPostsComponent } from '../wall-posts/wall-posts.component';
import { SharedDataService } from '../../../services/sharedDataService/shared-data.service';
import { Params } from '@angular/router';
import { Wall } from '../../../shared/models';
import { catchError, filter, of, timeout } from 'rxjs';

import { BackgroundImageService } from '../../../services/backgroundimageservice/background-image.service';
import { AnimationService } from '../../../services/animationservice/animation.service';
import { isWallCreator } from '../../../utils/wall.util';
import { AudioService } from '../../../services/audioservice/audio.service';
import { ToastrService } from 'ngx-toastr';
import { handleHttpError } from '../../../utils/error-handler.util';
import { AuthService } from '../../../services/authservice/auth.service';
import { CookieService } from 'ngx-cookie-service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-view-wall',
  standalone: true,
  imports: [
    NgStyle,
    WallNavbarComponent,
    TitleBarComponent,
    WallPostsComponent
  ],
  templateUrl: './view-wall.component.html',
  styleUrl: './view-wall.component.css'
})

export class ViewWallComponent implements OnInit ,OnDestroy{

  wallId = '';
  wallCreatorMails: string[] =[];
  isPreview  = false;
  anyoneCanView = false;
  anyoneCanPost = false;
  viewAccess: { emails?: string[], domains?: string[] } = {};
  postAccess: { emails?: string[], domains?: string[] } = {};
  userEmail = '';
  private readonly destroyRef = inject(DestroyRef);
  selectedBackground = '';
  selectedAnimation ='';
  selectedAudio='';
  hasAudio = false;
  selectedBgColor = '';
  selectedFont = '';
  selectedTextColor = '';
  isMuted=false;
  currentPage: string | undefined;
  animation="";
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
    
    this.route.queryParams.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params: Params) => {
      const token = params['token'];
      if (token) {
        sessionStorage.setItem('viewToken', token);
        this.wallService.acceptInvite(this.wallId, token).subscribe({ error: () => {} });
        this.router.navigate(['/moment', this.wallId], { replaceUrl: true });
      }else if(this.authService.getToken() || sessionStorage.getItem('viewToken')){
        this.fetchWallDetails();
      } else{
        const redirectUrl = encodeURIComponent(this.router.url);
        this.router.navigateByUrl(`login?redirectUrl=${redirectUrl}`);
      }      
    });

    this.sharedService.getWallDetails().pipe(
      filter(wallData => !!wallData), takeUntilDestroyed(this.destroyRef)
    ).subscribe((wallData: Wall) => {
      this.applyMomentDetails(wallData);
    });

    this.sharedService.stylePreview$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(preview => {
      if (preview) {
        if (preview.bgColor !== undefined) this.selectedBgColor = preview.bgColor;
        if (preview.font     !== undefined) this.selectedFont    = preview.font;
        if (preview.textColor !== undefined) this.selectedTextColor = preview.textColor;
      }
      this.cdr.markForCheck();
    });

    this.sharedService.getIsPreview().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((data)=>{
      this.isPreview = data;
      if (this.selectedAnimation) {
        this.animationService.startAnimation(this.selectedAnimation);
      }
      if (this.selectedAudio) {
        this.audioService.playAudio(this.selectedAudio);
      }
      this.cdr.markForCheck();
    })

    this.route.url.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((urlSegments) => {
      this.currentPage = urlSegments[0].path;
    });

    this.userEmail = this.authService.getEmail() || '';

    this.updateBackgroundImage();
  }

  ngOnDestroy(): void {
    this.animationService.stopAnimation();
    this.audioService.stopAudio();
    this.sharedService.setWallDetails(null);
  }

  fetchWallDetails() {
    this.wallService.getWallById(this.wallId).pipe(
      timeout(8000),
      takeUntilDestroyed(this.destroyRef),
      catchError((error) => {
        this.isMomentReady = true;
        if (error?.name !== 'TimeoutError') {
          this.router.navigateByUrl('error');
        }
        return of(null);
      })
    ).subscribe({
      next: (response: { wallDetails?: Wall } | Wall | null) => {
        if (!response) {
          return;
        }

        const wallData: Wall = (response as { wallDetails?: Wall }).wallDetails ?? (response as Wall);
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

  private applyMomentDetails(wallData: Wall): void {
    this.selectedBackground = wallData.theme?.bgImg || wallData.bgImg || '';
    this.selectedAnimation = wallData.theme?.animationId || wallData.animationId || '';
    this.selectedAudio = wallData.theme?.audio || wallData.audio || '';
    this.selectedBgColor   = wallData.theme?.bgColor   || '';
    this.selectedFont      = wallData.theme?.fontFamily || '';
    this.selectedTextColor = wallData.theme?.textColor  || '';
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
  
  verifyAccess(viewAccess: { emails?: string[]; domains?: string[] }, postAccess: { emails?: string[]; domains?: string[] }) {
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
    return isWallCreator(this.userEmail, this.wallCreatorMails);
  }

  updateBackgroundImage(): void {
    if (this.selectedBackground === '') {
      this.backgroundService.getSelectedBgSubject().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((bg) => {
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
    }, error: (err)=>{ handleHttpError(err, this.toastr); }});
  }

}
