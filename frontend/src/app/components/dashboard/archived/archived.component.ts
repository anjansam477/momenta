import { ChangeDetectorRef, Component, HostListener, OnInit, ViewChild } from '@angular/core';
import { MessagemodalComponent } from '../../../modal/messagemodal/messagemodal.component';
import { Wall } from '../../../models/wall.model';
import { AuthService } from '../../../services/authservice/auth.service';
import { WallService } from '../../../services/wallservice/wall.service';
import { CommonModule } from '@angular/common';
import { NotificationsService } from '../../../services/notificationservice/notifications.service';
import { UserReplacerComponent } from "../../data-transformation/user-replacer/user-replacer.component";
import { ToastrService } from 'ngx-toastr';

@Component({
    selector: 'app-archived',
    standalone: true,
    templateUrl: './archived.component.html',
    styleUrl: './archived.component.css',
    imports: [CommonModule, UserReplacerComponent]
})
export class ArchivedComponent implements OnInit {
  walls: Wall[] = [];
  wallId: string = '';
  name !: string|null;
  @ViewChild(MessagemodalComponent) messageModalComponent!: MessagemodalComponent;
  dateTimeAgo: string[] = [];
  openDropdownIndex: number | null = null;
  userEmail: string ='';

  loading = false;
  allLoaded = false;
  page = 1;
  
  constructor(
    private wallService: WallService,
    private authService: AuthService,
    private notificationService: NotificationsService,
    private cdr: ChangeDetectorRef,
    private toastr: ToastrService
  ) { }

  ngOnInit() {
    this.userEmail = this.authService.getEmail()|| '';
    this.loadWalls(this.userEmail);
    this.name = this.authService.getName();
  }

  loadWalls(userEmail: any) {
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

  getTime(date:any){
    return this.notificationService.getTimeAgo(date);
  }

  displayWalls(displayedWalls: Wall[]) {
    this.walls = this.filterWall(displayedWalls);
    this.dateTimeAgo = this.walls.map(wall => this.getTime(wall.updatedAt));
  }

  /**
   * Filter archived and non archived walls
   * @param walls all walls
   * @returns 
   */
  private filterWall(walls: Wall[]): Wall[] {
    const filteredWall = walls.filter((wall) => wall.status === 'archived' || wall.isArchived);
    filteredWall.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return filteredWall;
  }

  /**
   * Unarchive respective wall and calls the filterwall method to filter this wall out of archived walls.
   * @param wall 
   */
  restoreWall(wall: Wall): void {
    this.wallId = wall._id.toString();
    wall.isArchived = false;
    wall.status = 'active';

    this.wallService.updateWall(this.wallId, {status: 'active'}).subscribe({
      next: (res: any) => {
      this.displayWalls(this.walls);
      },
      error: (error)=>{
        if(error.status!==401){
          this.toastr.error(error.error.message)
        }
      }
    });
  }

  toggleDropdown(index: number): void {
    this.openDropdownIndex = index;
    this.cdr.detectChanges();
  }

  isUserAllowed(wall: any): boolean {
    const isOwner = wall.ownerEmail === this.userEmail;
    const isMaintainer = wall.maintainerEmails?.includes(this.userEmail) ?? false;

    return isOwner || isMaintainer;
  }
}
