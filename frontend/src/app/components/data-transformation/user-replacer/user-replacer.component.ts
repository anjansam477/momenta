import { Component, DestroyRef, inject, Input, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { UserService } from '../../../services/userservice/user.service';
import { NotificationsService } from '../../../services/notificationservice/notifications.service';
import { ActivatedRoute } from '@angular/router';
import { NgClass, DatePipe } from '@angular/common';
import { SharedDataService } from '../../../services/sharedDataService/shared-data.service';
import { AuthService } from '../../../services/authservice/auth.service';
import { combineLatest } from 'rxjs';
import { getPostAuthorDisplayName } from '../../../shared/post/post-author.util';
import { getInitials } from '../../../utils/user.util';
import { UserDetails } from '../../../shared/models';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-user-replacer',
  standalone: true,
  imports: [NgClass, DatePipe],
  templateUrl: './user-replacer.component.html',
  styleUrl: './user-replacer.component.css'
})
export class UserReplacerComponent {
  private readonly destroyRef = inject(DestroyRef);
  @Input() email!: string;
  @Input() datetime: string | Date | null = null;
  @Input() component!: string;
  currentPage = '';
  userName: string = '';
  profilePicture: string = '';

  constructor(
    private userService: UserService, 
    private notificationService: NotificationsService,
    private sharedService: SharedDataService,
    private authService: AuthService,
    private route: ActivatedRoute
  ) { }

  ngOnInit(): void {
    const userEmail = this.authService.getEmail();
  
    this.route.url.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((urlSegments: { path: string; }[]) => {
      this.currentPage = urlSegments[0].path;
    });

    combineLatest([
      this.sharedService.userData$,
      this.sharedService.getUpdateUserProfile()
    ]).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(([updatedData, changedImage]) => {
      if (userEmail === this.email) {
        if (updatedData && Object.keys(updatedData).length > 0) {
          const newUserName = getPostAuthorDisplayName(updatedData.firstname, updatedData.lastname);
          if (this.userName !== newUserName) {
            this.userName = newUserName;
          }
        }

        if (changedImage == null) {
          this.profilePicture = "";
        }else if (changedImage instanceof Blob) {
          this.imageBlobReader(changedImage);
        }
      }
    });
  
    this.fetchUserDetails();
  }

  imageBlobReader(blob: Blob): void {
    const reader = new FileReader();
    reader.onload = () => {
      this.profilePicture = reader.result as string;
    };
    reader.readAsDataURL(blob);
  }

  fetchUserDetails(): void {
    this.userService.fetchUserNamesByEmail(this.email).subscribe({
      next: (userDetails: UserDetails | null) => {
        if (userDetails) {
          this.userName = userDetails.fullName || this.email;
          this.profilePicture = userDetails.profilePicture || this.profilePicture;
        } else {
          this.userName = this.email;
        }
      },
      error: () => {
        this.userName = this.email;
      }
    });
  }

  getTime(date: string | Date) {
    return this.notificationService.getTimeAgo(date);
  }

  getInitials(): string {
    return getInitials(this.userName || this.email || '?');
  }

  getDateTime(timestamp: string | Date | null | undefined): string {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
  
    const isToday = date.toDateString() === now.toDateString();
    const isTomorrow = date.toDateString() === new Date(now.setDate(now.getDate() + 1)).toDateString();
    const isPast = date < now;
  
    const options: Intl.DateTimeFormatOptions = {
      hour: 'numeric',
      minute: 'numeric',
      hour12: true
    };
  
    const timeString = date.toLocaleTimeString([], options);
  
    if (isPast && isToday) {
      return `Deliver Today at ${timeString}`;
    } else if (isPast && !isToday && !isTomorrow) {
      const dateOptions: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      };
      const dateString = date.toLocaleDateString([], dateOptions);
      return `Delivered on ${dateString} at ${timeString}`;
    } else if (isToday) {
      return `Scheduled for Today, ${timeString}`;
    } else if (isTomorrow) {
      return `Scheduled for Tomorrow, ${timeString}`;
    } else {
      const dateOptions: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      };
      const dateString = date.toLocaleDateString([], dateOptions);
      return `Scheduled for ${dateString}, ${timeString}`;
    }
  }
  
  isPast(datetime: string | Date | null | undefined): boolean {
    if (!datetime) return false;
    const date = new Date(datetime);
    const now = new Date();
    return date < now;
  }  
}
