import { Component, DestroyRef, inject, ChangeDetectionStrategy, ChangeDetectorRef, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { UserService } from '../../services/userservice/user.service';
import { WallService } from '../../services/wallservice/wall.service';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/authservice/auth.service';
import { ToastrService } from 'ngx-toastr';
import { NgClass, DatePipe } from '@angular/common';
import { SharedDataService } from '../../services/sharedDataService/shared-data.service';
import { ImageCropperComponent } from 'ngx-image-cropper';
import { of } from 'rxjs';
import { User, Wall } from '../../shared/models';
import { handleHttpError } from '../../utils/error-handler.util';
import { WALL_STATUS } from '../../constants/wall.constants';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-settingsmodal',
  standalone: true,
  imports: [FormsModule, NgClass, DatePipe, ImageCropperComponent],
  templateUrl: './settingsmodal.component.html',
  styleUrl: './settingsmodal.component.css',
})
export class SettingsmodalComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  userData: Partial<User> = {};
  editMode = false;
  selectedFile: File | undefined;
  pictureBlob: string | undefined;
  image = '';
  fullName = '';
  imageChangedEvent: Event | null = null;
  croppedImage: Blob | null = null;
  incorrect = false;
  defaultProfile = false;

  walls: Wall[] = [];
  wallsLoaded = false;

  constructor(
    private userService: UserService,
    private wallService: WallService,
    private authService: AuthService,
    private sharedDataService: SharedDataService,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.getUserData();
    this.loadWalls();
  }

  getUserData() {
    const userEmail = this.authService.getEmail();
    const token = this.authService.getToken();
    if (!token || !userEmail) {
      this.toastr.error('Error fetching user details', 'Please Reload', { timeOut: 3000 });
      return;
    }
    this.sharedDataService.getUserData().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((data) => {
      if (data) {
        this.userData = data;
        this.fullName = this.userData.firstname + ' ' + this.userData.lastname;
        if (this.userData._id) this.showImage();
        this.cdr.markForCheck();
      }
    });
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
        this.userService.updateUser(this.userData._id!, { firstname, lastname }).subscribe({
          next: () => {
            this.sharedDataService.updateUserName({ firstname, lastname });
            this.userData.firstname = firstname;
            this.userData.lastname = lastname;
            this.authService.storeName(firstname + ' ' + lastname);
            this.sharedDataService.setMessage('profile');
            this.editMode = false;
            this.incorrect = false;
            this.sharedDataService.setUserNameCache(this.userData.email!, of(`${firstname} ${lastname}`));
          },
          error: (err) => handleHttpError(err, this.toastr),
        });
      } else {
        this.incorrect = true;
      }
    } else {
      this.editMode = true;
    }
  }  

  fileChangeEvent(event: Event): void {
    this.imageChangedEvent = event;
  }

  imageCropped(event: { blob?: Blob | null }): void {
    if (event.blob) {
      this.croppedImage = event.blob;
      this.pictureBlob = URL.createObjectURL(event.blob);
    }
  }

  resetImageChangeEvent() {
    this.imageChangedEvent = null;
    this.croppedImage = null;
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

    this.userService.uploadProfilePicture(this.userData._id!, this.croppedImage!).subscribe({
      next: () => {
        this.sharedDataService.setUpdateUserProfile(this.croppedImage);
        this.sharedDataService.setMessage('profile');
        this.imageBlobReader(this.croppedImage!);
        this.resetImageChangeEvent();
      },
      error: (err) => handleHttpError(err, this.toastr),
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
      this.userService.removeProfilePicture(this.userData._id!).subscribe({
        next: () => {
          this.userData.profilePictureUrl = null;
          this.pictureBlob = undefined;
          this.sharedDataService.setUpdateUserProfile(null);
          this.sharedDataService.setMessage('profile');
          this.showImage();
        },
        error: (err) => handleHttpError(err, this.toastr),
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

  loadWalls() {
    if (this.wallsLoaded) return;
    const email = this.authService.getEmail();
    if (!email) return;
    this.wallService.getAllWalls(email, 1, 100).subscribe({
      next: (walls: Wall[]) => {
        this.walls = walls || [];
        this.wallsLoaded = true;
        this.cdr.markForCheck();
      },
      error: () => { this.wallsLoaded = true; this.cdr.markForCheck(); }
    });
  }

  get isVerified(): boolean {
    return this.userData.status === 'active' || this.userData.active === true;
  }

  get activeWallCount()   { return this.walls.filter(w => w.status === WALL_STATUS.ACTIVE).length; }
  get archivedWallCount() { return this.walls.filter(w => w.status === WALL_STATUS.ARCHIVED).length; }
  get totalWallCount()    { return this.walls.length; }
  get initials() {
    return `${(this.userData.firstname || '')[0] || ''}${(this.userData.lastname || '')[0] || ''}`.toUpperCase();
  }
}
