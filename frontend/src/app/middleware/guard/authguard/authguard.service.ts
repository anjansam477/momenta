import { Injectable } from '@angular/core';
import { AuthService } from '../../../services/authservice/auth.service';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthguardService {

  constructor(private authService: AuthService,
    private router: Router) { }

    canActivate(): boolean{
    const isAuthenticated = this.authService.getCookieToken();
    const isAuthenticatedLocal = this.authService.getToken();
    if (!isAuthenticated && !isAuthenticatedLocal && !this.authService.isAuthenticated()) {
      this.authService.removeUserInfo();
      this.router.navigate(['/login']);
      return false;
    }
    return true;
  }
}
