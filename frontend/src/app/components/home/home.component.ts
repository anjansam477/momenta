import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterOutlet } from '@angular/router';
import { SidebarComponent } from "../../utils/sidebar/sidebar.component";
import { NavbarComponent } from "../../utils/navbar/navbar.component";
import { CookieService } from 'ngx-cookie-service';
import { AuthService } from '../../services/authservice/auth.service';
import { SocketService } from '../../services/socketservice/socket.service';

@Component({
    selector: 'app-home',
    standalone: true,
    templateUrl: './home.component.html',
    styleUrl: './home.component.css',
    imports: [RouterOutlet, SidebarComponent, NavbarComponent]
})
export class HomeComponent implements OnInit {
    constructor(
      private route: ActivatedRoute,
      private cookieService: CookieService,
      private authService: AuthService,
      private socketService:SocketService) { }

    ngOnInit(): void {
    // this.socketService.setupSocketConnection();
      this.route.queryParams.subscribe(params => {
        if (this.cookieService.get('authToken') && this.cookieService.get('email')) {
          this.authService.storeToken(this.cookieService.get('authToken'));
          this.authService.storeEmail(this.cookieService.get('email'));
          this.authService.storeName(this.cookieService.get('name'));
          this.authService.removeUserCookie();
        }
      });
    }
}