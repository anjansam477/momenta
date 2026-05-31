import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Subject } from 'rxjs';
import { Occasions } from '../../middleware/occasions';
import { CreateWallModalComponent } from "../../modal/create-wall-modal/create-wall-modal.component";
import { Router } from '@angular/router';
import { BackgroundImageService } from '../../services/backgroundimageservice/background-image.service';
import { AuthService } from '../../services/authservice/auth.service';
import { UserService } from '../../services/userservice/user.service';

@Component({
  selector: 'app-homepage-banner',
  standalone: true,
  imports: [CommonModule, CreateWallModalComponent],
  templateUrl: './homepage-banner.component.html',
  styleUrl: './homepage-banner.component.css'
})
export class HomepageBannerComponent implements OnInit {
  occasionSubject: Subject<string> = new Subject<string>();
  titleSubject: Subject<string> = new Subject<string>();
  occasions = Occasions;
  events: any[] = [];
  currentSlideIndex: number = 0;
  loginBoolean = true;
  profilePicture: string = '';
  userName: string = '';

  emailToUserDetailsMap: { [key: string]: any } = {};

  constructor(
    private router: Router,
    private bgservice: BackgroundImageService,
    private userService: UserService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    const userEmail = this.authService.getEmail();
    this.loginBoolean = !!localStorage.getItem('authToken');
    if (!this.loginBoolean) {
      this.router.navigateByUrl('login');
    }

    this.fetchEvents(userEmail);
  }

  fetchEvents(userEmail: any) {
    this.bgservice.getEvents(userEmail).subscribe((data) => {
      if(data.length > 0) {
        this.events = this.flattenEvents(data);
        this.fetchUserDetailsForEvents();
      }
    });
  }

  flattenEvents(data: any): any[] {
    const flattenedEvents: any[] = [];
    for (const eventType in data) {
      if (data.hasOwnProperty(eventType)) {
        data[eventType].forEach((event: any) => {
          flattenedEvents.push({ ...event, eventType });
        });
      }
    }
    return flattenedEvents;
  }

  fetchUserDetailsForEvents(): void {
    const emails = this.events.map(event => event.Email);
    if(emails.length > 0) {
      emails.forEach(email => {
        this.userService.fetchUserNamesByEmail(email).subscribe({
          next: (userDetails: any) => {
            this.emailToUserDetailsMap[email] = userDetails;
            this.userName = userDetails?.fullName || this.getCurrentEvent()?.Name;
            this.profilePicture = userDetails?.profilePicture || this.profilePicture;
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

  updateSlideIndex(event: any) {
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