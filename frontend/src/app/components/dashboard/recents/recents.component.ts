import { CreateWallModalComponent } from "../../../modal/create-wall-modal/create-wall-modal.component";
import { FormsModule } from '@angular/forms';
import { AfterViewInit, ChangeDetectorRef, Component, DestroyRef, ElementRef, HostListener, OnInit, QueryList, Renderer2, ViewChild, ViewChildren, inject , ChangeDetectionStrategy } from '@angular/core';
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
import { SharemodalComponent } from "../../../modal/sharemodal/sharemodal.component";
import { UserReplacerComponent } from "../../data-transformation/user-replacer/user-replacer.component";
import { HomepageBannerComponent } from "../../homepage-banner/homepage-banner.component";
import { NotificationsService } from "../../../services/notificationservice/notifications.service";
import { handleHttpError } from '../../../utils/error-handler.util';
import { isWallCreatorOrMaintainer } from '../../../utils/wall-access.util';
import { SAVE_TYPE, WALL_STATUS } from '../../../constants/wall.constants';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-recents',
    standalone: true,
    templateUrl: './recents.component.html',
    styleUrl: './recents.component.css',
    imports: [NgClass, FormsModule, SharemodalComponent, UserReplacerComponent, HomepageBannerComponent]
})
export class RecentsComponent implements OnInit, AfterViewInit {
  walls: Wall[] = [];
  showWalls: Wall[] = [];
  starredWalls: Wall[] = [];
  wallId: string = '';
  name!: string | null;
  baseUrl: string = UI_BASE_URL;
  wallTitle:string="";
  wallFilter: string = 'recents';
  filterTitle: string = 'Recent moments';
  @ViewChild(MessagemodalComponent) messageModalComponent!: MessagemodalComponent;
  dateTimeAgo: string[] = [];
  sharedWallUrl: string = '';
  openDropdownIndex: number | null = null;
  userEmail: string ='';
  @ViewChildren('wallCard') wallCards!: QueryList<ElementRef>;
  loginBoolean = true;
  loading = false;
  allLoaded = false;
  page = 1;
  pageSize = 16;
  loadMore = false;
  wallSearchQuery = '';
  private readonly destroyRef = inject(DestroyRef);

  get filteredWalls(): Wall[] {
    const q = this.wallSearchQuery.trim().toLowerCase();
    if (!q) return this.showWalls;
    return this.showWalls.filter(w =>
      (w.title || '').toLowerCase().includes(q) ||
      (w.description || '').toLowerCase().includes(q) ||
      (w.ownerEmail || '').toLowerCase().includes(q)
    );
  }

  constructor(
    private router: Router,
    private toastr: ToastrService,
    private wallService: WallService,
    private authService: AuthService,
    private clipboardService: ClipboardService,
    private audioService: AudioService,
    private sharedService: SharedDataService,
    private notificationService: NotificationsService,
    private renderer: Renderer2,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.loginBoolean = !!localStorage.getItem('authToken');
    if (!this.loginBoolean) {
      this.router.navigateByUrl('login');
    } else {
      this.userEmail = this.authService.getEmail()|| '';
      this.name = this.authService.getName();
      this.loadStarredWalls();
      this.loadRecents();
    }
    this.sharedService.getWallSearchQuery().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(q => {
      this.wallSearchQuery = q;
      this.cdr.detectChanges();
    });
  }

  ngAfterViewInit() {
    this.cdr.detectChanges();
  }

  loadStarredWalls() {
    this.wallService.getStarredWalls(this.userEmail).subscribe({
      next: (res: Wall[]) => {
      if (res.length > 0) {
        this.starredWalls = res;
      }
      this.cdr.detectChanges();
    },
    error: (err)=>{ handleHttpError(err, this.toastr); }
  });
  }

  loadRecents() {
    this.loading = true;
    this.wallService.getRecentWalls(this.userEmail).subscribe({
      next: (res: Wall[]) => {
        this.loading = false;
        if (res.length > 0) {
          const startIndex = this.walls.length;
          this.walls = res;
          this.displayWalls(this.walls, startIndex);
          setTimeout(() => {
            this.initAnimations(startIndex);
          }, 0);
        }
        this.cdr.detectChanges();
      },
      error: (err)=>{ this.loading = false; handleHttpError(err, this.toastr); }
    });
  }

  loadWalls() {
    this.loading = true;
  
    const loadWithoutDelay = () => {
      this.wallService.getAllWalls(this.userEmail, this.page).subscribe({
        next: (result: Wall[]) => {
          this.loading = false;
          if (result.length > 0) {
            let startIndex = this.walls.length;
            if(!this.loadMore){
              startIndex = this.walls.length;
            } else{
              startIndex = this.showWalls.length;
            }
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
        error: (err) => { this.loading = false; handleHttpError(err, this.toastr); }
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
    this.cdr.detectChanges();
  }
  
  @HostListener('window:scroll')
  onScroll() {
    if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight) {
      if (!this.loading && !this.allLoaded && this.wallFilter != 'recents') {
        this.loadWalls();
      }
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.messageModalComponent) {
      this.messageModalComponent.closeModal();
    }
  }

  filterChangeText(filterText: string) {
    if (this.wallFilter === filterText || this.loading) {
      return;
    }
    this.wallFilter = filterText;
    this.loading = true;
    this.allLoaded = false;
    this.page = 1;
    this.openDropdownIndex = null;
    this.walls = [];
    this.showWalls = [];  
    if (filterText === 'recents') {
      this.loadRecents();
    } else {
      this.loadWalls();
    }
  }
  
  displayWalls(displayedWalls: Wall[], startIndex: number) {
    const filteredWalls = this.filterWall(displayedWalls);
    if (this.wallFilter === 'my') {
      this.showWalls.push(...filteredWalls.filter(wall => wall.ownerEmail === this.userEmail && !this.showWalls.some(b => b._id === wall._id)));
      this.filterTitle = 'My Moments';
    } else if (this.wallFilter === 'shared') {
      this.showWalls.push(...filteredWalls.filter(wall => wall.ownerEmail !== this.userEmail && !this.showWalls.some(b => b._id === wall._id)));
      this.filterTitle = 'Maintained by Me';
    } else if (this.wallFilter === 'all') {
      this.showWalls.push(...filteredWalls.filter(wall => !this.showWalls.some(b => b._id === wall._id)));
      this.filterTitle = 'All Moments';
    } else {
      this.showWalls = displayedWalls;
      this.filterTitle = 'Recent Moments';
    }

    this.walls.forEach(wall => {
      wall.starred = this.starredWalls.some(starredWall => starredWall._id === wall._id);
    });
  
    const updatedDateTimeAgo = filteredWalls.map(wall => this.getTime(wall.updatedAt));
    this.dateTimeAgo.splice(startIndex, this.walls.length - startIndex, ...updatedDateTimeAgo);

    this.cdr.detectChanges();
  
    if (this.walls.length != this.showWalls.length && this.showWalls.length < 5 && this.allLoaded == false && this.filterTitle != 'Recent moments') {
      this.loadMore = true;
      this.loadWalls();
    }
  }

  getTime(date: string | Date) {
    return this.notificationService.getTimeAgo(date);
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

  private filterWall(walls: Wall[]): Wall[] {
    return walls.filter(wall => wall.status !== WALL_STATUS.ARCHIVED && !wall.isArchived).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  toggleStar(wall: Wall) {
    wall.starred ? this.unstarWall(wall) : this.starWall(wall);
  }

  unstarWall(wall: Wall) {
    wall.starred = false;
    if (this.userEmail) {
      this.wallService.removeWall(wall._id, this.userEmail, SAVE_TYPE.FAVOURITE).subscribe({
        next: () => {
        this.sharedService.setMessage('unstar');
      },
      error: (err)=>{ handleHttpError(err, this.toastr); }
    });
    }
  }

  starWall(wall: Wall) {
    wall.starred = true;
    if (this.userEmail) {
      this.wallService.saveWall(wall._id, this.userEmail, SAVE_TYPE.FAVOURITE).subscribe({
        next:() => {
        this.sharedService.setMessage('star');
      }, error: (err)=>{ handleHttpError(err, this.toastr); }});
    }
  }

  
  toggleDropdown(index: number): void {
    this.openDropdownIndex = index;
    this.cdr.detectChanges();
  }

  openWall(wall: Wall) {
    this.audioService.playAudio(wall.audio);
    this.router.navigateByUrl(`moment/${wall._id}`);
  }

  shareWall(wall: Wall): void {
    this.wallId = wall._id;
    this.sharedWallUrl = `${this.baseUrl}/moment/${this.wallId}`;
    this.wallTitle=wall.title;
  }

  copyLink(wall: Wall): void {
    this.wallId = wall._id;
    const wallLink = `${this.baseUrl}/moment/${this.wallId}`;
    this.toastr.success('Moment link copied');
    this.clipboardService.copy(wallLink);
  }

  downloadWall(wall: Wall): void {
    const downloadUrl = `download/${wall._id}`;
    const windowOptions = 'toolbar=no,location=no,directories=no,status=no,menubar=no,scrollbars=yes,copyhistory=no,resizable=yes,width=1920,height=1080';
    window.open(downloadUrl, '_blank', windowOptions);
  }

  archiveWall(wall: Wall): void {
    wall.isArchived = true;
    wall.status = WALL_STATUS.ARCHIVED;
    if (this.userEmail) {
      this.wallService.ArchiveWall(wall._id).subscribe({
        next: () => {
        this.sharedService.setMessage('archive');
        this.walls = this.walls.filter(b => b._id !== wall._id);
        this.showWalls = this.showWalls.filter(b => b._id !== wall._id);
        this.openDropdownIndex = null;
        this.displayWalls(this.walls, 0);
      }, error: (err)=>{ handleHttpError(err, this.toastr); }});
    }
  }

  isUserAllowed(wall: Wall): boolean {
    return isWallCreatorOrMaintainer(wall, this.userEmail);
  }


  closeDropdown() {
    this.openDropdownIndex = -1;
  }


}
