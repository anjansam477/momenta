import { Injectable } from '@angular/core';
import { JwtHelperService } from '@auth0/angular-jwt';
import { CookieService } from 'ngx-cookie-service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private jwtHelper = new JwtHelperService();
  private token = 'authToken';
  private email = 'email';
  private name = 'name';
 
  private domain = window.location.hostname; 

  constructor(private cookieService: CookieService) { }

  storeToken(token: string): void {
    localStorage.setItem(this.token, token);
  }

  storeEmail(email: string): void {
    localStorage.setItem(this.email, email);
  }

  storeName(name: string): void {
    localStorage.setItem(this.name, name);
  }

  getToken(): string | null {
    return localStorage.getItem(this.token);
  }

  getName(): string | null {
    return localStorage.getItem(this.name);
  }

  getCookieToken(): string | null {
    return this.cookieService.get(this.token);
  }

  getEmail(): string | null {
    return localStorage.getItem(this.email) ;
  }

  removeUserInfo(): void {
    localStorage.clear();
  }

  removeUserCookie(): void {
    this.cookieService.delete(this.token, '/', this.domain, false, 'Lax');
    this.cookieService.delete(this.email, '/', this.domain, false, 'Lax');
    this.cookieService.delete(this.name, '/', this.domain, false, 'Lax');
  }

  isAuthenticated(): boolean {
    const token = this.getToken();
    if (token && !this.jwtHelper.isTokenExpired(token)) {
      return true;
    } else {
      this.removeUserInfo();
      return false;
    }
  }
}
