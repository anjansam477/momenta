import { Component, OnInit } from '@angular/core';
import { SharedDataService } from '../../services/sharedDataService/shared-data.service';
import { UserService } from '../../services/userservice/user.service';
import { AuthService } from '../../services/authservice/auth.service';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SettingsmodalComponent } from "../../modal/settingsmodal/settingsmodal.component";
import { BackgroundImageService } from '../../services/backgroundimageservice/background-image.service';
import { getPostAuthorDisplayName } from '../../shared/post/post-author.util';
import { NotificationsComponent } from '../dropdown/notifications/notifications.component';

@Component({
    selector: 'app-navbar',
    standalone: true,
    templateUrl: './navbar.component.html',
    styleUrl: './navbar.component.css',
    imports: [CommonModule, SettingsmodalComponent, NotificationsComponent]
})
export class NavbarComponent implements OnInit{

  userData: any = {};
  currentPage: string | undefined;
  pictureBlob: string | undefined;
  userName: string = '';
  image: any = "";
  isLoggedIn: boolean = false;

  constructor(
    private router: Router,
    private sharedService: SharedDataService, 
    private userService: UserService,
    private authService: AuthService,
    private imagesService: BackgroundImageService,
  ) {}

  ngOnInit(): void {
    setTimeout(() => {
      this.isLoggedIn = this.checkLogin();
    }, 0);

    this.sharedService.getUserData().subscribe((data)=>{
      if(data){
        this.userData = data
        this.setUserName();
      }else{
        this.getUserData();
      }
    })

    this.sharedService.getUpdateUserProfile().subscribe((changedImage) => {
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
        next: (response: any) => {
          this.userData = response;
          this.sharedService.setUserData(this.userData);
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
    } else if (this.userData.profilePicture) {
      this.image = this.imagesService.convertBufferToBase64(this.userData.profilePicture.data);
    } else {
      this.image = "";
    }
  }

  logout() {
    this.userService.logoutUser(this.authService.getToken()).subscribe({
      next: (res: any) => {
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

  setUserName() {
    const isMobileView = window.innerWidth < 425;
    const fullName = getPostAuthorDisplayName(this.userData.firstname, this.userData.lastname);
    
    if (isMobileView && fullName.length > 15) {      
      this.userName = this.userData.firstname;
    } else {
      this.userName = fullName;
    }
  }
}
