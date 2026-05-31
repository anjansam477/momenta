import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/authservice/auth.service';

@Injectable({
  providedIn: 'root'
})
export class LoginguardService {

  constructor(private authService: AuthService,
    private router: Router) { }

  canActivate(): boolean{
    const isAuthenticated = this.authService.getCookieToken();
    const isAuthenticatedLocal = this.authService.getToken();
    
    if (isAuthenticated || isAuthenticatedLocal) {
      this.router.navigate(['/home']);
      return false;
    }
    return true;
  }
}
