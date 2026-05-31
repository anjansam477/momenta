import { Injectable } from '@angular/core';
import { JwtHelperService } from '@auth0/angular-jwt';
import { CookieService } from 'ngx-cookie-service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private jwtHelper = new JwtHelperService();
  // authentication token
  private token = 'authToken';
  // email of signedin user
  private email = 'email';
  // name of user
  private name = 'name';
 
  private domain = window.location.hostname; 

  constructor(private cookieService: CookieService) { }

  /**
   * Stores the token in local storage
   * @param token 
   * @returns void
   */
  storeToken(token: string): void {
    localStorage.setItem(this.token, token);
  }

  /**
   * Stores the email in local storage
   * @param email 
   * @returns void
   */
  storeEmail(email: string): void {
    localStorage.setItem(this.email, email);
  }

  /**
   * Stores the name in local storage
   * @param name 
   * @returns void
   */
  storeName(name: string): void {
    localStorage.setItem(this.name, name);
  }

  /**
   * fetches the token from local storage
   * @param none 
   * @returns token
   */
  getToken(): string | null {
    return localStorage.getItem(this.token);
  }

  /**
   * fetches the name from local storage
   * @param none
   * @returns name
   */
  getName(): string | null {
    return localStorage.getItem(this.name);
  }

  /**
   * fetches the cookie token from cookie service
   * @param none 
   * @returns token from cookie
   */
  getCookieToken(): string | null {
    return this.cookieService.get(this.token);
  }

  /**
   * fetches the email from local storage
   * @param none 
   * @returns email
   */
  getEmail(): string | null {
    return localStorage.getItem(this.email) ;
  }

  /**
   * Remove userInfo from localStorage
   */
  removeUserInfo(): void {
    // localStorage.removeItem(this.token);
    // localStorage.removeItem(this.email);
    // localStorage.removeItem(this.name);
    localStorage.clear();
  }

  /**
   * Remove userInfo from cookies
   */
  removeUserCookie(): void {
    this.cookieService.delete(this.token, '/', this.domain, false, 'Lax');
    this.cookieService.delete(this.email, '/', this.domain, false, 'Lax');
    this.cookieService.delete(this.name, '/', this.domain, false, 'Lax');

    // this.cookieService.delete(this.token);
    // this.cookieService.delete(this.email);
    // this.cookieService.delete(this.name);
  }
  
  /**
   * Check if the user is authenticated or not
   * @returns authntication result
   */
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
