import { Component, OnInit, HostListener, ChangeDetectorRef, DestroyRef, inject , ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SharedDataService } from '../../services/sharedDataService/shared-data.service';
import { UserService } from '../../services/userservice/user.service';
import { AuthService } from '../../services/authservice/auth.service';
import { WallService } from '../../services/wallservice/wall.service';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SettingsmodalComponent } from "../../modal/settingsmodal/settingsmodal.component";
import { BackgroundImageService } from '../../services/backgroundimageservice/background-image.service';
import { getPostAuthorDisplayName } from '../../shared/post/post-author.util';
import { User, Wall } from '../../shared/models';
import { NotificationsComponent } from '../dropdown/notifications/notifications.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-navbar',
    standalone: true,
    templateUrl: './navbar.component.html',
    styleUrl: './navbar.component.css',
    imports: [FormsModule, SettingsmodalComponent, NotificationsComponent]
})
export class NavbarComponent implements OnInit{

  userData: Partial<User> = {};
  currentPage: string | undefined;
  pictureBlob: string | undefined;
  userName: string = '';
  image: string = "";
  isLoggedIn: boolean = false;

  wallSearchQuery = '';
  wallSearchResults: Wall[] = [];
  allUserWalls: Wall[] = [];
  showSearchDropdown = false;
  searchLoaded = false;
  private readonly destroyRef = inject(DestroyRef);

  constructor(
    private router: Router,
    private sharedService: SharedDataService,
    private userService: UserService,
    private authService: AuthService,
    private wallService: WallService,
    private imagesService: BackgroundImageService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    setTimeout(() => {
      this.isLoggedIn = this.checkLogin();
    }, 0);

    this.sharedService.getUserData().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((data)=>{
      if(data){
        this.userData = data
        this.setUserName();
      }else{
        this.getUserData();
      }
    })

    this.sharedService.getUpdateUserProfile().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((changedImage) => {
      if(changedImage){
        this.imageBlobReader(changedImage);
      } else{
        this.pictureBlob = undefined;
        this.showImage();
      }
    })
  }

  checkLogin(): boolean {
    return this.authService.getEmail() !== null;
   }
 
  toggleSidebar() {
    this.sharedService.toggle();
  }

  getUserData() {
    const userEmail = this.authService.getEmail();
    if (userEmail) {
      this.userService.getUserByEmail(userEmail).subscribe({
        next: (response: User) => {
          this.userData = response;
          this.sharedService.setUserData(response);
          if (this.userData && this.userData._id) {
            this.setUserName();
          }
          this.showImage();
        },
      error: (err)=>{
        this.authService.removeUserInfo();
        this.router.navigate(['/login']);
      }
    });
    }
  }

  imageBlobReader(blob: Blob): void {
    const reader = new FileReader();
    reader.onload = () => {
      this.pictureBlob = reader.result as string;
      this.showImage();
    };
    reader.readAsDataURL(blob);
  }

  showImage() {
    if (this.userData.profilePictureUrl && !this.pictureBlob) {
      this.image = this.userData.profilePictureUrl;
    } else if (this.pictureBlob) {
      this.image = this.pictureBlob;
    } else if ((this.userData as Record<string, unknown>)['profilePicture']) {
      const pic = (this.userData as Record<string, { data: number[] }>)['profilePicture'];
      this.image = this.imagesService.convertBufferToBase64(pic.data as unknown as { type: string; data: number[] });
    } else {
      this.image = "";
    }
  }

  logout() {
    this.userService.logoutUser(this.authService.getToken()).subscribe({
      next: (_res: unknown) => {
        sessionStorage.removeItem('viewToken');
        this.authService.removeUserInfo();
        this.authService.removeUserCookie();
        this.router.navigate(['/login']);
        this.sharedService.setUserData(null);
      },
      error: (error) => {
        sessionStorage.removeItem('viewToken');
        this.authService.removeUserInfo();
        this.authService.removeUserCookie();
        this.router.navigate(['/login']);
        this.sharedService.setUserData(null);
      }
    });
  }

  loadWallsForSearch() {
    if (this.searchLoaded) return;
    const email = this.authService.getEmail();
    if (!email) return;
    this.wallService.getAllWalls(email, 1, 100).subscribe({
      next: (res: Wall[]) => {
        this.allUserWalls = res || [];
        this.searchLoaded = true;
      }
    });
  }

  onWallSearch() {
    const q = this.wallSearchQuery.trim().toLowerCase();
    if (!q) { this.showSearchDropdown = false; return; }
    if (!this.searchLoaded) this.loadWallsForSearch();
    this.wallSearchResults = this.allUserWalls.filter(w =>
      (w.title || '').toLowerCase().includes(q) ||
      (w.description || '').toLowerCase().includes(q)
    ).slice(0, 8);
    this.showSearchDropdown = true;
    this.cdr.detectChanges();
  }

  openWall(wallId: string) {
    this.wallSearchQuery = '';
    this.showSearchDropdown = false;
    this.router.navigateByUrl(`/moment/${wallId}`);
  }

  clearSearch() {
    this.wallSearchQuery = '';
    this.showSearchDropdown = false;
  }

  @HostListener('document:click', ['$event'])
  onDocClick(e: MouseEvent) {
    const t = e.target as HTMLElement;
    if (!t.closest('.nav-search')) this.showSearchDropdown = false;
  }

  setUserName() {
    const isMobileView = window.innerWidth < 425;
    const fullName = getPostAuthorDisplayName(this.userData.firstname, this.userData.lastname);
    
    if (isMobileView && fullName.length > 15) {      
      this.userName = this.userData.firstname ?? '';
    } else {
      this.userName = fullName;
    }
  }
}
