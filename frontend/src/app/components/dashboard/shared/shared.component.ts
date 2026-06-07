import { ChangeDetectorRef, Component, DestroyRef, ElementRef, HostListener, OnInit, QueryList, Renderer2, ViewChild, ViewChildren, inject , ChangeDetectionStrategy } from '@angular/core';
import { NgClass } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ClipboardService } from 'ngx-clipboard';
import { ToastrService } from 'ngx-toastr';
import { UI_BASE_URL } from '../../../environment-config';
import { MessagemodalComponent } from '../../../modal/messagemodal/messagemodal.component';
import { Wall } from '../../../shared/models';
import { AudioService } from '../../../services/audioservice/audio.service';
import { AuthService } from '../../../services/authservice/auth.service';
import { WallService } from '../../../services/wallservice/wall.service';
import { SharedDataService } from '../../../services/sharedDataService/shared-data.service';
import { Router } from '@angular/router';
import { NotificationsService } from '../../../services/notificationservice/notifications.service';
import { SharemodalComponent } from "../../../modal/sharemodal/sharemodal.component";
import { UserReplacerComponent } from "../../data-transformation/user-replacer/user-replacer.component";
import { handleHttpError } from '../../../utils/error-handler.util';
import { isWallCreatorOrMaintainer } from '../../../utils/wall-access.util';
import { SAVE_TYPE, WALL_STATUS } from '../../../constants/wall.constants';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-shared',
    standalone: true,
    templateUrl: './shared.component.html',
    styleUrl: './shared.component.css',
    imports: [NgClass, SharemodalComponent, UserReplacerComponent]
})
export class SharedComponent implements OnInit {
  walls: Wall[] = [];
  wallId = '';
  name !: string|null;
  baseUrl: string = UI_BASE_URL;
  wallTitle="";
  @ViewChild(MessagemodalComponent) messageModalComponent!: MessagemodalComponent;
  dateTimeAgo: string[] = [];
  sharedWallUrl = '';
  openDropdownIndex: number | null = null;
  @ViewChildren('wallCard') wallCards!: QueryList<ElementRef>;
  userEmail ='';
  loading = false;
  allLoaded = false;
  page = 1;
  wallSearchQuery = '';
  private readonly destroyRef = inject(DestroyRef);

  constructor(
    private router: Router,
    private toastr: ToastrService,
    private wallService: WallService,
    private authService: AuthService,
    private clipboardService: ClipboardService,
    private audioService:AudioService,
    private sharedService: SharedDataService,
    private notificationService: NotificationsService,
    private renderer: Renderer2,
    private cdr: ChangeDetectorRef
  ) { }
  
  ngOnInit() {
    this.userEmail = this.authService.getEmail()|| '';
    this.loadWalls(this.userEmail);
    this.cdr.detectChanges();
    this.name = this.authService.getName();
    this.sharedService.getWallSearchQuery().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(q => {
      this.wallSearchQuery = q;
      this.cdr.detectChanges();
    });
  }

  get filteredWalls(): Wall[] {
    const q = this.wallSearchQuery.trim().toLowerCase();
    if (!q) return this.walls;
    return this.walls.filter(w =>
      (w.title || '').toLowerCase().includes(q) ||
      (w.description || '').toLowerCase().includes(q) ||
      (w.ownerEmail || '').toLowerCase().includes(q)
    );
  }

  loadWalls(userEmail: string) {
    this.loading = true;
  
    const loadWithoutDelay = () => {
      this.wallService.getSharedWalls(userEmail, this.page).subscribe({
        next: (result: Wall[]) => {
          this.loading = false;
          if (result.length > 0) {
            const startIndex = this.walls.length;
            this.walls.push(...result);
            this.displayWalls(result, startIndex);
            if (result.length === 24) {
              this.page++;
              setTimeout(() => {
                this.initAnimations(startIndex);
              }, 0);
            } else {
              this.allLoaded = true;
              setTimeout(() => {
                this.initAnimations(startIndex);
              }, 0);
            }
          } else {
            this.allLoaded = true;
          }
          this.cdr.detectChanges();
        },
        error: (error) => {
          this.loading = false;
        },
      });
    };
  
    if (this.page === 1) {
      loadWithoutDelay();
    } else {
      this.loading = true;
      setTimeout(() => {
        loadWithoutDelay();
      }, 1300);
    }
  }

  @HostListener('window:scroll')
  onScroll() {
    if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight) {
      if (!this.loading && !this.allLoaded) {
        this.loadWalls(this.userEmail);
      }
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.messageModalComponent) {
      this.messageModalComponent.closeModal();
    }
  }

  getTime(date: string | Date) {
    return this.notificationService.getTimeAgo(date);
  }

  displayWalls(walls: Wall[], startIndex: number) {
    const filteredWalls = this.filterWall(walls);
    const updatedDateTimeAgo = filteredWalls.map(wall => this.getTime(wall.updatedAt));
    this.dateTimeAgo.splice(startIndex, this.walls.length - startIndex, ...updatedDateTimeAgo);
    this.cdr.detectChanges();
  }

  private filterWall(walls: Wall[]): Wall[] {
    const filteredWall = walls.filter((wall) => wall.status !== WALL_STATUS.ARCHIVED && !wall.isArchived &&
    (wall.postAccess?.emails?.length > 0 ||
    wall.viewAccess?.emails?.length > 0));
    
    filteredWall.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return filteredWall;
  }

  openWall(wall: Wall) {
    this.audioService.playAudio(wall.audio);
    this.router.navigateByUrl(`moment/${wall._id}`);
  }

  copyLink(wall: Wall): void {
    this.wallId = wall._id.toString();
    this.toastr.success('Link copied to clipboard');
    this.clipboardService.copy(
      this.baseUrl + '/moment/' + this.wallId
    );    
  }

  initAnimations(startIndex: number) {
    if (this.wallCards && this.wallCards.length > 0) {
      this.wallCards.toArray().slice(startIndex).forEach((wallCard, index) => {
        setTimeout(() => {
          this.renderer.removeClass(wallCard.nativeElement, 'hidden');
          this.renderer.addClass(wallCard.nativeElement, 'fade-in-up');
        }, index * 100);
      });
      this.cdr.detectChanges();
    }
  }

  toggleStar(wall: Wall) {
    if (wall.starred) {
      this.unstarWall(wall);
    } else {
      this.starWall(wall);
    }
  }

  unstarWall(wall: Wall) {
    wall.starred = false;
    this.wallId = wall._id.toString();
    const saveType = SAVE_TYPE.FAVOURITE;
    if(this.userEmail){
      this.wallService.removeWall(this.wallId, this.userEmail, saveType).subscribe({
        next: () => {
          this.sharedService.setMessage('unstar')
      },
      error: (err)=>{ handleHttpError(err, this.toastr); }});
    }
  }

  starWall(wall: Wall){
    wall.starred = true;
    this.wallId = wall._id.toString();
    const saveType = SAVE_TYPE.FAVOURITE;
    if(this.userEmail){
      this.wallService.saveWall(this.wallId, this.userEmail, saveType).subscribe({
        next: () => {
          this.sharedService.setMessage('star')
      }, error: (err)=>{ handleHttpError(err, this.toastr); }});
    } 
  }

  shareWall(wall: Wall): void {
    this.wallId = wall._id;
    this.sharedWallUrl = `${this.baseUrl}/moment/${this.wallId}`;
    this.wallTitle=wall.title;
  }


  downloadWall(wall: Wall): void {
    const downloadUrl = `download/${wall._id}`;
    const windowOptions = 'toolbar=no,location=no,directories=no,status=no,menubar=no,scrollbars=yes,copyhistory=no,resizable=yes,width=1920,height=1080';
    window.open(downloadUrl, '_blank', windowOptions);
  }

  toggleDropdown(index: number): void {
    this.openDropdownIndex = index;
    this.cdr.detectChanges();
  }

  isUserAllowed(wall: Wall): boolean {
    return isWallCreatorOrMaintainer(wall, this.userEmail);
  }

  closeDropdown() {
    this.openDropdownIndex = -1;
  }
}
