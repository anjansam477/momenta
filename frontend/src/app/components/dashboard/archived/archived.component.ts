import { ChangeDetectorRef, Component, DestroyRef, HostListener, OnInit, ViewChild, inject , ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MessagemodalComponent } from '../../../modal/messagemodal/messagemodal.component';
import { Wall } from '../../../shared/models';
import { AuthService } from '../../../services/authservice/auth.service';
import { WallService } from '../../../services/wallservice/wall.service';
import { NotificationsService } from '../../../services/notificationservice/notifications.service';
import { UserReplacerComponent } from "../../data-transformation/user-replacer/user-replacer.component";
import { ToastrService } from 'ngx-toastr';
import { SharedDataService } from '../../../services/sharedDataService/shared-data.service';
import { handleHttpError } from '../../../utils/error-handler.util';
import { isWallCreatorOrMaintainer } from '../../../utils/wall-access.util';
import { WALL_STATUS } from '../../../constants/wall.constants';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-archived',
    standalone: true,
    templateUrl: './archived.component.html',
    styleUrl: './archived.component.css',
    imports: [UserReplacerComponent]
})
export class ArchivedComponent implements OnInit {
  walls: Wall[] = [];
  wallId = '';
  name !: string|null;
  @ViewChild(MessagemodalComponent) messageModalComponent!: MessagemodalComponent;
  dateTimeAgo: string[] = [];
  openDropdownIndex: number | null = null;
  userEmail ='';

  loading = false;
  allLoaded = false;
  page = 1;
  wallSearchQuery = '';
  private readonly destroyRef = inject(DestroyRef);

  constructor(
    private wallService: WallService,
    private authService: AuthService,
    private notificationService: NotificationsService,
    private cdr: ChangeDetectorRef,
    private toastr: ToastrService,
    private sharedService: SharedDataService
  ) { }

  ngOnInit() {
    this.userEmail = this.authService.getEmail()|| '';
    this.loadWalls(this.userEmail);
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
      this.wallService.getArchivedWalls(userEmail, this.page).subscribe({
        next: (result: Wall[]) => {
          this.loading = false;
          if (result.length > 0) {
            this.walls.push(...result);
            this.displayWalls(this.walls);
            if (result.length === 24) {
              this.page++;
            } else {
              this.allLoaded = true;
            }
          } else {
            this.allLoaded = true;
          }
        },
        error: (error) => {
          this.loading = false;
        },
      });
    }

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

  getTime(date: string | Date) {
    return this.notificationService.getTimeAgo(date);
  }

  displayWalls(displayedWalls: Wall[]) {
    this.walls = this.filterWall(displayedWalls);
    this.dateTimeAgo = this.walls.map(wall => this.getTime(wall.updatedAt));
  }

  private filterWall(walls: Wall[]): Wall[] {
    const filteredWall = walls.filter((wall) => wall.status === WALL_STATUS.ARCHIVED || wall.isArchived);
    filteredWall.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return filteredWall;
  }

  restoreWall(wall: Wall): void {
    this.wallId = wall._id.toString();
    wall.isArchived = false;
    wall.status = WALL_STATUS.ACTIVE;

    this.wallService.updateWall(this.wallId, {status: WALL_STATUS.ACTIVE}).subscribe({
      next: () => {
        this.displayWalls(this.walls);
      },
      error: (err)=>{ handleHttpError(err, this.toastr); }
    });
  }

  toggleDropdown(index: number): void {
    this.openDropdownIndex = index;
    this.cdr.detectChanges();
  }

  isUserAllowed(wall: Wall): boolean {
    return isWallCreatorOrMaintainer(wall, this.userEmail);
  }
}
