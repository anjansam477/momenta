import { Component, OnInit , ChangeDetectionStrategy } from '@angular/core';
import { Subject } from 'rxjs';
import { Occasions } from '../../middleware/occasions';
import { CreateWallModalComponent } from "../../modal/create-wall-modal/create-wall-modal.component";
import { Router } from '@angular/router';
import { BackgroundImageService } from '../../services/backgroundimageservice/background-image.service';
import { AuthService } from '../../services/authservice/auth.service';
import { UserService } from '../../services/userservice/user.service';
import { EventItem, UserDetails } from '../../shared/models';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-homepage-banner',
  standalone: true,
  imports: [CreateWallModalComponent],
  templateUrl: './homepage-banner.component.html',
  styleUrl: './homepage-banner.component.css'
})
export class HomepageBannerComponent implements OnInit {
  occasionSubject: Subject<string> = new Subject<string>();
  titleSubject: Subject<string> = new Subject<string>();
  occasions = Occasions;
  events: EventItem[] = [];
  currentSlideIndex = 0;
  loginBoolean = true;
  profilePicture = '';
  userName = '';

  emailToUserDetailsMap: Record<string, UserDetails> = {};

  constructor(
    private router: Router,
    private bgservice: BackgroundImageService,
    private userService: UserService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    const userEmail = this.authService.getEmail();
    this.loginBoolean = !!this.authService.getToken();
    if (!this.loginBoolean) {
      this.router.navigateByUrl('login');
    }

    this.fetchEvents(userEmail);
  }

  fetchEvents(userEmail: string | null) {
    if (!userEmail) return;
    this.bgservice.getEvents(userEmail).subscribe((data) => {
      const flat = this.flattenEvents(data);
      if (flat.length > 0) {
        this.events = flat;
        this.fetchUserDetailsForEvents();
      }
    });
  }

  flattenEvents(data: Record<string, Omit<EventItem, 'eventType'>[]> | null): EventItem[] {
    if (!data) return [];
    const flattenedEvents: EventItem[] = [];
    for (const eventType in data) {
      if (Object.prototype.hasOwnProperty.call(data, eventType)) {
        const events = data[eventType];
        if (Array.isArray(events)) {
          events.forEach((event) => {
            flattenedEvents.push({ ...event, eventType } as EventItem);
          });
        }
      }
    }
    return flattenedEvents;
  }

  fetchUserDetailsForEvents(): void {
    const emails = this.events.map(event => event.Email);
    if(emails.length > 0) {
      emails.forEach(email => {
        this.userService.fetchUserNamesByEmail(email).subscribe({
          next: (userDetails: UserDetails | null) => {
            if (userDetails) this.emailToUserDetailsMap[email] = userDetails;
            this.userName = userDetails?.fullName ?? this.getCurrentEvent()?.Name ?? '';
            this.profilePicture = userDetails?.profilePicture ?? this.profilePicture ?? '';
          },
          error: () => {
            this.emailToUserDetailsMap[email] = { fullName: email, profilePicture: this.profilePicture };
          }
        });
      });
    }
  }

  openModal(occasion: string, name?: string) {
    this.occasionSubject.next(occasion);
    if(name){
      const title = `happy ${occasion} ${name}`;
      this.titleSubject.next(title);     
    }
  }

  updateSlideIndex(event: { to: number }) {
    this.currentSlideIndex = event.to;
    const currentEventEmail = this.getCurrentEvent()?.Email;
    if (currentEventEmail) {
      const userDetails = this.emailToUserDetailsMap[currentEventEmail];
      this.userName = userDetails?.fullName || this.getCurrentEvent()?.Name;
      this.profilePicture = userDetails?.profilePicture || this.profilePicture;
    }
  }

  getCurrentEvent() {
    return this.events[this.currentSlideIndex];
  }
}