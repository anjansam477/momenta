import { ChangeDetectorRef, Component, DestroyRef, ElementRef, OnDestroy, OnInit, Renderer2, ViewChild, inject , ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { SharedDataService } from '../../services/sharedDataService/shared-data.service';
import { AuthService } from '../../services/authservice/auth.service';
import { SharemodalComponent } from '../../modal/sharemodal/sharemodal.component';
import { UI_BASE_URL } from '../../environment-config';
import { AudioService } from '../../services/audioservice/audio.service';
import { filter } from 'rxjs';
import { SlideshowComponent } from '../../modal/slideshow/slideshow.component';
import { FormsModule } from '@angular/forms';
import { WallService } from '../../services/wallservice/wall.service';
import { ToastrService } from 'ngx-toastr';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { handleHttpError } from '../error-handler.util';
import { isWallCreator } from '../wall.util';
import { Wall } from '../../shared/models';
import { Params } from '@angular/router';
import { WALL_STATUS } from '../../constants/wall.constants';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-title-bar',
  standalone: true,
  imports: [SharemodalComponent,SlideshowComponent, FormsModule ],
  templateUrl: './title-bar.component.html',
  styleUrl: './title-bar.component.css',
  animations: [
    trigger('fadeInOut', [
      state('void', style({ opacity: 0 })),
      transition(':enter', [animate('300ms', style({ opacity: 1 }))]),
    ]),
  ],
})
export class TitleBarComponent implements OnInit,OnDestroy{

  wallId = '';
  wallTitle = '';
  wallDescription = '';
  loginBoolean = false;
  wallCreatorMails!: string[];
  isOpen = true;
  wallNotExpired = false;
  currentPage: string | undefined;
  openDate: string | Date | null = null;
  closeDate: string | Date | null = null;
  isArchived = false;
  isPreview!: boolean;
  anyoneCanPost = false;
  canAddPost = true;
  postAccess: { emails?: string[], domains?: string[] } = {};
  sharedWallUrl = '';
  baseUrl: string = UI_BASE_URL; 
  isMuted = false;
  audioPlaying=true;
  audio="";
  postsAvailable = false;
  myPost = false;
  timeCheckInterval!: ReturnType<typeof setInterval>;
  private readonly destroyRef = inject(DestroyRef);
  isEditingTitle = false;
  isEditingDescription = false;
  newTitle: string = this.wallTitle;
  newDescription: string = this.wallDescription;
  private clickListener!: () => void;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private audioService : AudioService,
    private sharedService: SharedDataService,
    private cdr: ChangeDetectorRef,
    private wallService: WallService,
    private toastr: ToastrService,
    private elementRef: ElementRef,
    private renderer: Renderer2,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.isLoggedIn();
    this.audioPlaying = this.audioService.isAudioPlaying();
    this.audioService.getMuteStateSubject().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(
      (muteState: boolean) => {
        this.isMuted = muteState;
        this.cdr.markForCheck();
      }
    );

    this.route.url.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((urlSegments) => {
      this.currentPage = urlSegments[0].path;
      this.cdr.markForCheck();
    });

    this.route.params.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params: Params) => {
      this.wallId = params['momentId'] ?? params['wallId'];
      this.fetchWallDetails();
      this.sharedWallUrl = `${this.baseUrl}/moment/${this.wallId}`;
      this.cdr.markForCheck();
    });

    this.sharedService.getIsPreview().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((data)=>{
      this.isPreview = data;
      if(this.audioService.isAudioMuted()){
        this.audioService.muteAudio();
        this.isMuted=this.audioService.isAudioMuted();
      }
      this.cdr.markForCheck();
    });

    this.audioService.getAudioFileSubject().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((audioFile: string) => {
      if(audioFile!=='')
        this.audioPlaying = true;
      else
        this.audioPlaying= false;
      this.cdr.detectChanges();
    });

    this.sharedService.getPostAvailable().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (data)=>{
        this.postsAvailable = data;
        this.cdr.markForCheck();
      },
      error: (err)=>{ handleHttpError(err, this.toastr); }
    });

    this.sharedService.getMyPost().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (data)=>{
        this.myPost = data;
        this.cdr.markForCheck();
      },
      error: (err)=>{ handleHttpError(err, this.toastr); }
    });

    this.timeCheckInterval = setInterval(() => {
      this.isNotExpired();
    }, 30000);
  }

  ngOnDestroy(): void {
    clearInterval(this.timeCheckInterval);
    this.removeClickListener();
  }

  private onDocumentClick(event: MouseEvent): void {
    const targetElement = event.target as HTMLElement;
    if (!this.elementRef.nativeElement.contains(targetElement)) {
      this.exitEditMode();
    }
  }

  private exitEditMode(): void {
    this.isEditingTitle = false;
    this.isEditingDescription = false;
    this.newTitle = this.wallTitle;
    this.newDescription = this.wallDescription;
    this.removeClickListener();
  }

  private addClickListener(): void {
    this.clickListener = this.renderer.listen('document', 'click', this.onDocumentClick.bind(this));
  }

  private removeClickListener(): void {
    if (this.clickListener) {
      this.clickListener();
      this.clickListener = undefined!;
    }
  }

  isLoggedIn(): void {
    this.loginBoolean = !!this.authService.getEmail();
  }

  fetchWallDetails() {
    this.sharedService.getWallDetails().pipe(
      filter(wallData => !!wallData), takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (wallData: Wall) => {
        this.wallTitle = wallData.title;
        this.wallDescription = wallData.description;
        this.wallCreatorMails = wallData.maintainerEmails?.length
          ? [...wallData.maintainerEmails, wallData.ownerEmail]
          : [wallData.ownerEmail];
        this.openDate = wallData.openDate ?? null;
        this.closeDate = wallData.closeDate ?? null;
        this.isArchived = wallData.status === WALL_STATUS.ARCHIVED;
        this.isOpen = wallData.status === WALL_STATUS.ACTIVE;
        this.anyoneCanPost = wallData.anyoneCanPost ?? false;
        this.postAccess = wallData.postAccess || {};
        this.audio = wallData.theme?.audio || wallData.audio || '';

        this.isNotExpired();
        this.checkPostAccess();
        this.cdr.detectChanges();
      },
      error: (err)=>{
        this.router.navigateByUrl('error');
        return;
      }
    });
  }

  checkPostAccess() {
    const userEmail = this.authService.getEmail() || '';
    const userDomain = userEmail ? userEmail.split('@')[1] : '';
    if(!this.checkWallCreator()){
      if (this.anyoneCanPost) {
        this.canAddPost = true;
      } else {
        if (this.postAccess.emails?.length && this.postAccess.emails.includes(userEmail)) {
          this.canAddPost = true;
        } else if (this.postAccess.domains?.length && this.postAccess.domains.includes(userDomain)) {
          this.canAddPost = true;
        } else {
          this.canAddPost = false;
        }
      }
    }
  }
  
  closePreview(){
    if(this.isPreview){
      this.sharedService.setIsPreview(false);
    }else{
      this.router.navigateByUrl('home/dashboard');
    }
  }

  checkWallCreator(): boolean {
    return isWallCreator(this.authService.getEmail(), this.wallCreatorMails);
  }
  

  isNotExpired(): void {
    const currentDate = new Date();
    const openDate = this.openDate ? new Date(this.openDate) : currentDate;
    const closeDate = this.closeDate ? new Date(this.closeDate) : currentDate;

    this.wallNotExpired = (currentDate >= openDate && currentDate <= closeDate) && !this.isArchived && this.isOpen;
  }

  download() {
    const downloadUrl = `download/${this.wallId}`;
    const windowOptions = 'toolbar=no,location=no,directories=no,status=no,menubar=no,scrollbars=yes,copyhistory=no,resizable=yes,width=1920,height=1080';
    window.open(downloadUrl, '_blank', windowOptions);
  }

  toggleMute(){
    if(this.audioService.isAudioPlaying())
    {
      this.audioService.muteAudio();
      this.isMuted=this.audioService.isAudioMuted();
    }
    else{
      this.isMuted=false;
      this.audioService.playAudio(this.audio);
    }
  }

  editTitle() {
    this.isEditingTitle = true;
    this.newTitle = this.wallTitle;
    this.addClickListener();
    setTimeout(() => {
      const input = document.querySelector('.editor-input') as HTMLTextAreaElement;
      this.adjustWidth({ target: input });
      input.selectionStart = input.value.length;
      input.selectionEnd = input.value.length;
      input.focus();
    });     
  }

  saveTitle() {
    if(this.wallTitle!==this.newTitle){
      this.wallService.updateWall(this.wallId, {title: this.newTitle}).subscribe({
        next: (data)=>{
          this.wallTitle = this.newTitle;
          this.isEditingTitle = false;
          this.removeClickListener();
        }, error:(err)=>{ handleHttpError(err, this.toastr); }
      })
    } else {
      this.isEditingTitle = false;
      this.removeClickListener();
    }
  }

  editDescription() {
    this.isEditingDescription = true;
    this.newDescription = this.wallDescription;
    this.addClickListener();
    setTimeout(() => {
      const textarea = document.querySelector('.editor-textarea') as HTMLTextAreaElement;
      this.adjustWidth({ target: textarea });
      textarea.selectionStart = textarea.value.length;
      textarea.selectionEnd = textarea.value.length;
      textarea.focus();
    });
  }

  saveDescription() {
    if(this.wallDescription!==this.newDescription){
      this.wallService.updateWall(this.wallId, {description: this.newDescription}).subscribe({
        next: (data)=>{
          this.wallDescription = this.newDescription;
          this.isEditingDescription = false;
          this.removeClickListener();
        }, error:(err)=>{ handleHttpError(err, this.toastr); }
      })
    } else {
      this.isEditingDescription = false;
      this.removeClickListener();
    }
  }

  cancelEdit() {
    this.isEditingTitle = false;
    this.isEditingDescription = false;
    this.newTitle = this.wallTitle;
    this.newDescription = this.wallDescription;
  }

  adjustWidth(event: Event | { target: HTMLInputElement | HTMLTextAreaElement }) {
    const target = (event as Event).target as HTMLInputElement | HTMLTextAreaElement
      ?? (event as { target: HTMLInputElement | HTMLTextAreaElement }).target;
    const content = target.value;
    let minWidth: number;
    let charWidth: number;
    let padding: number;
  
    if (target.classList.contains('editor-input')) {
      minWidth = 100;
      charWidth = 14;
      padding = 10;
    } else if (target.classList.contains('editor-textarea')) {
      minWidth = 50;
      charWidth = 8;
      padding = 10;
    } else {
      minWidth = 50;
      charWidth = 8;
      padding = 20;
    }
    const newWidth = Math.max(minWidth, content.length * charWidth + padding);

    target.style.width = newWidth + 'px';
  }
  
  openAnalytics(): void {
    this.router.navigate(['/moment', this.wallId, 'analytics']);
  }

  editPost(){
    this.sharedService.setSendEmail(true);
  }

  addPost(){
    this.sharedService.setSendEmail(false);
  }
}
