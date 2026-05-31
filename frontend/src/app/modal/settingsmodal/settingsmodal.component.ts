import { Component } from '@angular/core';
import { UserService } from '../../services/userservice/user.service';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/authservice/auth.service';
import { ToastrService } from 'ngx-toastr';
import { CommonModule } from '@angular/common';
import { SharedDataService } from '../../services/sharedDataService/shared-data.service';
import { ImageCropperComponent } from 'ngx-image-cropper';
import { of } from 'rxjs';

@Component({
  selector: 'app-settingsmodal',
  standalone: true,
  imports: [FormsModule, CommonModule, ImageCropperComponent],
  templateUrl: './settingsmodal.component.html',
  styleUrl: './settingsmodal.component.css',
})
export class SettingsmodalComponent {
  userData: any = {};
  editMode: boolean = false;
  selectedFile: File | undefined;
  pictureBlob: string | undefined;
  image: any;
  fullName: string = '';
  imageChangedEvent: any = '';
  croppedImage: any = '';
  incorrect: boolean = false;
  defaultProfile: boolean = false;

  constructor(
    private userService: UserService,
    private authService: AuthService,
    private sharedDataService: SharedDataService,
    private toastr: ToastrService
  ) {}

  ngOnInit() {
    setTimeout(() => {
      this.getUserData();
    }, 0);
  }

  getUserData() {
    const userEmail = this.authService.getEmail();
    const token = this.authService.getToken();
    if (token) {
      if (userEmail) {
        this.sharedDataService.getUserData().subscribe((data) => {
          if (data) {
            this.userData = data;
            this.fullName = this.userData.firstname + ' ' + this.userData.lastname;
            if (this.userData && this.userData._id) {
              this.showImage();
            }
          }
        });
      } else {
        this.toastr.error('Error fetching user details', 'Please Reload', {
          timeOut: 3000,
        });
      }
    }
  }

  toggleNameEditMode() {
    if (this.editMode) {
      this.incorrect = false;
      const name = this.fullName.trim().split(/\s+/);
      const firstname = name[0];
      const lastname = name.slice(1).join(' ');
  
      const currentFullName = `${this.userData.firstname} ${this.userData.lastname}`.trim();
      const newFullName = `${firstname} ${lastname}`.trim();

      if (newFullName === currentFullName) {
        this.editMode = false;
        return;
      }
  
      if (firstname.trim().length >= 3 && firstname.trim().length <= 30 && lastname.trim().length >= 3 && lastname.trim().length <= 30) {
        this.userService.updateUser(this.userData._id, { firstname, lastname }).subscribe({
          next: (response: any) => {
            this.sharedDataService.updateUserName({ firstname, lastname });
            this.userData.firstname = firstname;
            this.userData.lastname = lastname;
            localStorage.removeItem('name');
            localStorage.setItem('name', firstname + ' ' + lastname);
            this.sharedDataService.setMessage('profile');
            this.editMode = false;
            this.incorrect = false;
            this.sharedDataService.setUserNameCache(this.userData.email, of(`${firstname} ${lastname}`));
          },
          error: (error) => {
            if (error.status !== 401) {
              this.toastr.error(error.error.message);
            }
          },
        });
      } else {
        this.incorrect = true;
      }
    } else {
      this.editMode = true;
    }
  }  

  fileChangeEvent(event: any): void {
    this.imageChangedEvent = event;
  }

  imageCropped(event: any): void {
    this.croppedImage = event.blob;
  }

  resetImageChangeEvent() {
    this.imageChangedEvent = null;
    this.croppedImage = undefined;
  }

  uploadProfilePic() {
    if (!this.croppedImage) {
      this.toastr.error("No file selected or cropped");
      return;
    }
  
    const maxFileSize = 5 * 1024 * 1024;

    if (this.croppedImage.size > maxFileSize) {
      this.toastr.error("File size exceeds 5 MB limit. Please choose a smaller image.");
      return;
    }
  
    const validImageTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!validImageTypes.includes(this.croppedImage.type)) {
      this.toastr.error("Invalid file type. Please upload an image.");
      return;
    }

    this.userService.uploadProfilePicture(this.userData._id, this.croppedImage).subscribe({
      next: (response: any) => {
        this.sharedDataService.setUpdateUserProfile(this.croppedImage);
        this.sharedDataService.setMessage('profile');
        this.imageBlobReader(this.croppedImage);
        this.resetImageChangeEvent();
      },
      error: (error) => {
        if(error.status!==401){
          this.toastr.error(error.error.message)
        }
      },
    });
  }

  imageBlobReader(blob: Blob): void {
    const reader = new FileReader();
    reader.onload = () => {
      this.pictureBlob = reader.result as string;
      this.showImage();
    };
    reader.readAsDataURL(blob);
  }  

  removeProfilePicture(){
    if(this.pictureBlob || this.userData.profilePictureUrl){
      this.userService.removeProfilePicture(this.userData._id).subscribe({
        next : (response: any) =>{
          this.userData.profilePictureUrl = '';
          this.userData.profilePicture = undefined;
          this.pictureBlob = undefined;
          this.sharedDataService.setUpdateUserProfile(null);
          this.sharedDataService.setMessage('profile');
          this.showImage();
        },
        error: (error) => {
          if(error.status!==401){
            this.toastr.error(error.error.message)
          }
        },
      })
    }
  }

  showImage() {
    this.defaultProfile = false;
    if (this.pictureBlob) {
      this.image = this.pictureBlob;
    } else if (this.userData.profilePictureUrl) {
      this.image = this.userData.profilePictureUrl;
    } else {
      this.defaultProfile = true;
      this.image = "";
    }
  }
}
