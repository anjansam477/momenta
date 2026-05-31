import { ChangeDetectorRef, Component, ElementRef, OnDestroy, OnInit, Renderer2, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { DownloadService } from '../../services/downloadservice/download.service';
import { SharedDataService } from '../../services/sharedDataService/shared-data.service';
import { SharemodalComponent } from '../../modal/sharemodal/sharemodal.component';
import { UI_BASE_URL } from '../../environment-config';
import { AudioService } from '../../services/audioservice/audio.service';
import { Subscription, filter } from 'rxjs';
import { SlideshowComponent } from '../../modal/slideshow/slideshow.component';
import { FormsModule } from '@angular/forms';
import { WallService } from '../../services/wallservice/wall.service';
import { ToastrService } from 'ngx-toastr';
import { trigger, state, style, transition, animate } from '@angular/animations';

@Component({
  selector: 'app-title-bar',
  standalone: true,
  imports: [CommonModule, SharemodalComponent,SlideshowComponent, FormsModule ],
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

  wallId: string = '';
  wallTitle: string = '';
  wallDescription: string = '';
  loginBoolean: boolean = false;
  wallCreatorMails!: string[];
  isOpen: any;
  wallNotExpired: boolean = false;
  currentPage: string | undefined;
  openDate: any;
  closeDate: any;
  isArchived: any;
  isPreview!: boolean;
  anyoneCanPost: boolean = false;
  canAddPost: boolean = true;
  postAccess: { emails?: string[], domains?: string[] } = {};
  sharedWallUrl: string = '';
  baseUrl: string = UI_BASE_URL; 
  isMuted:boolean = false;
  audioPlaying:boolean=true;
  audio:string="";
  muteStateSubscription!: Subscription;
  routeUrlSubscription!: Subscription;
  routeParamsSubscription!: Subscription;
  isPreviewSubscription!: Subscription;
  audioFileSubscription!: Subscription;
  postsAvailable: boolean = false;
  myPost: boolean = false;

  myPostSubscription!: Subscription;
  postsAvailableSubscription!: Subscription;
  timeCheckInterval!: any;
  isEditingTitle: boolean = false;
  isEditingDescription: boolean = false;
  newTitle: string = this.wallTitle;
  newDescription: string = this.wallDescription;
  private clickListener!: () => void;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private audioService : AudioService,
    private downloadService: DownloadService,
    private sharedService: SharedDataService,
    private cdr: ChangeDetectorRef,
    private wallService: WallService,
    private toastr: ToastrService,
    private elementRef: ElementRef,
    private renderer: Renderer2
  ) {}

  ngOnInit(): void {
    this.isLoggedIn();
    this.audioPlaying = this.audioService.isAudioPlaying();
    this.muteStateSubscription = this.audioService.getMuteStateSubject().subscribe(
      (muteState: boolean) => {
        this.isMuted = muteState;
      }
    );
    
    this.routeUrlSubscription = this.route.url.subscribe((urlSegments) => {
      this.currentPage = urlSegments[0].path;
    });

    this.routeParamsSubscription =this.route.params.subscribe((params: any) => {
      this.wallId = params['momentId'] ?? params['wallId'];
      this.fetchWallDetails();
      this.sharedWallUrl = `${this.baseUrl}/moment/${this.wallId}`;
    });

    this.isPreviewSubscription=this.sharedService.getIsPreview().subscribe((data)=>{
      this.isPreview = data;
      if(this.audioService.isAudioMuted()){
        this.audioService.muteAudio();
        this.isMuted=this.audioService.isAudioMuted();
      }
    })

    this.audioFileSubscription = this.audioService.getAudioFileSubject().subscribe((audioFile: string) => {
      if(audioFile!=='')
        this.audioPlaying = true;
      else
        this.audioPlaying= false;
      this.cdr.detectChanges();
    });
    

    this.postsAvailableSubscription = this.sharedService.getPostAvailable().subscribe({
      next: (data)=>{
        this.postsAvailable = data;
      },
      error: (err)=>{
        if(err.status!==401){
          this.toastr.error(err.error.message)
        }
      }
    });

    this.myPostSubscription = this.sharedService.getMyPost().subscribe({
      next: (data)=>{
        this.myPost = data;
      },
      error: (err)=>{
        if(err.status!==401){
          this.toastr.error(err.error.message)
        }
      }
    })

    this.timeCheckInterval = setInterval(() => {
      this.isNotExpired();
    }, 30000);
  }

  ngOnDestroy(): void {
    if (this.muteStateSubscription) {
      this.muteStateSubscription.unsubscribe();
    }
    if (this.routeUrlSubscription) {
      this.routeUrlSubscription.unsubscribe();
    }
    if (this.routeParamsSubscription) {
      this.routeParamsSubscription.unsubscribe();
    }
    if (this.isPreviewSubscription) {
      this.isPreviewSubscription.unsubscribe();
    }
    if (this.audioFileSubscription) {
      this.audioFileSubscription.unsubscribe();
    }
    if(this.postsAvailable){
      this.postsAvailableSubscription.unsubscribe();
    }
    if(this.myPost){
      this.myPostSubscription.unsubscribe();
    }
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
    this.loginBoolean = !!localStorage.getItem('email');
  }

  fetchWallDetails() {
    this.sharedService.getWallDetails().pipe(
      filter(wallData => !!wallData)
    ).subscribe({
      next: (wallData: any) => {
        this.wallTitle = wallData.title;
        this.wallDescription = wallData.description;
        // maintainerEmails are now in wall_members — fall back to ownerEmail only
        this.wallCreatorMails = wallData.maintainerEmails?.length
          ? [...wallData.maintainerEmails, wallData.ownerEmail]
          : [wallData.ownerEmail];
        this.openDate = wallData.openDate;
        this.closeDate = wallData.closeDate;
        this.isArchived = wallData.status === 'archived';
        this.isOpen = wallData.status === 'active';
        this.anyoneCanPost = wallData.anyoneCanPost;
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
    const userEmail = localStorage.getItem('email') || '';
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
    const userEmail = localStorage.getItem('email') || '';

    if (this.wallCreatorMails && Array.isArray(this.wallCreatorMails)) {
      return this.wallCreatorMails.some(email => typeof userEmail === 'string' && email === userEmail);
    }
    return false;
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

  downloadWall(){
    const pdfName = this.wallTitle;
    this.downloadService.downloadContent('#main', pdfName);
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
        }, error:(err)=>{
          if(err.status!==401){
            this.toastr.error(err.error.message)
          }
        }
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
        }, error:(err)=>{
          if(err.status!==401){
            this.toastr.error(err.error.message)
          }
        }
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

  adjustWidth(event: any) {
    const target = event.target;
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
  
  editPost(){
    this.sharedService.setSendEmail(true);
  }

  addPost(){
    this.sharedService.setSendEmail(false);
  }
}
