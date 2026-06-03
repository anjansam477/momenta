import { NgClass } from '@angular/common';
import { Component, effect , ChangeDetectionStrategy } from '@angular/core';
import { SharedDataService } from '../../services/sharedDataService/shared-data.service';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../services/authservice/auth.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-sidebar',
  standalone: true,
  imports: [NgClass, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css'
})
export class SidebarComponent {
  isOpen = false;

  constructor(
    private sharedService: SharedDataService,
    private authService: AuthService,
    private router: Router
  ) {
    effect(() => {
      this.isOpen = this.sharedService.isOpen();
    });
  }

  openDashboard() {
    const userEmail = this.authService.getEmail();
    if (userEmail) {
      this.router.navigateByUrl('/home/dashboard');
    } else {
      this.sharedService.setContext('dashboard');
    }
  }

}
