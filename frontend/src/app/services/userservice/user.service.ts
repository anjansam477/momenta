import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, map, Observable, of, shareReplay } from 'rxjs';
import { SERVICE_BASE_URL } from '../../environment-config';
import { AuthService } from '../authservice/auth.service';
import { SharedDataService } from '../sharedDataService/shared-data.service';
import { SocketService } from '../socketservice/socket.service';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  // private userNameCache: Map<string, Observable<string>> = new Map<string, Observable<string>>();
  private cacheDuration = 3 * 60 * 60 * 1000;
  constructor(private http: HttpClient, private authService: AuthService, private sharedService: SharedDataService,private socketService:SocketService) { }
  
  /**
   * Base Url to handle all user-service requests.
  */
  private userServiceBaseUrl = SERVICE_BASE_URL + '/api/users';

  /**
   * Create new user
   * @param userData 
   * @returns message whether the user is created or not
   */
  createUser(userData: any): Observable<any> {
    return this.http.post(`${this.userServiceBaseUrl}/account/create`, userData);
  }

  /**
   * Finds(get) user by specific email
   * @param userEmail 
   * @returns user with specific email
   */
  getUserByEmail(userEmail: string): Observable<any> {
    return this.http.get(`${this.userServiceBaseUrl}/${userEmail}`);
  }

  /**
   * Login user
   * @param userData 
   * @returns starts session for the user
   */
  loginUser(userData: any): Observable<any> {
    return this.http.post(`${this.userServiceBaseUrl}/account/login`, userData);
  }

  /**
   * Forgot password
   * @param userData 
   * @returns 
   */
  forgotPassword(userData: any): Observable<any> {
    return this.http.post(`${this.userServiceBaseUrl}/account/password/reset`, userData);
  }

  /**
   * Updates password for the user, sents mail to the respective email
   * @param userData
   * @returns 
   */
  updatePassword(userData: any): Observable<any> {
    return this.http.put(`${this.userServiceBaseUrl}/account/password/update`, userData);
  }

  /**
   * Sends logout request for the respective token
   * @param token
   * @returns 
   */
  logoutUser(token: any): Observable<any> {
    this.socketService.closeSocketConnection();
    return this.http.post(`${this.userServiceBaseUrl}/account/logout`, token);
  }

  /**
   * upload profile picture for userId
   * @param userId - email
   * @param file 
   * @returns 
   */
  uploadProfilePicture(userId: string, file: File) {
    const formData = new FormData();
    formData.append('profilePicture', file);
    return this.http.put(`${this.userServiceBaseUrl}/profile/picture/${userId}`, formData);
  }

  /**
   * fetches profile picture for the given userId
   * @param userId
   * @returns 
   */
  removeProfilePicture(userId: string) {
    return this.http.get(`${this.userServiceBaseUrl}/profile/${userId}`);
  }

  /**
   * Update user details
   * @param userId - email
   * @param userData - updated userDetails
   * @returns 
   */
  updateUser(userId: string, userData: any): Observable<any> {
    return this.http.put(`${this.userServiceBaseUrl}/${userId}`, userData);
  }

  generateToken(userData: any): Observable<any> {
    return this.http.post(`${this.userServiceBaseUrl}/account/verify`, userData);
  }

  fetchUserNamesByEmail(email: string): Observable<string> {
    const cachedObservable = this.sharedService.getUserNameCache().get(email);
    if (cachedObservable) {
      return cachedObservable;
    } else {
      const params = new HttpParams().set('emails', email);
      const request = this.http.get<any>(`${this.userServiceBaseUrl}/name`, { params }).pipe(
        map(response => {
          const userName = response[email];
          return userName;
        }),
        catchError(() => {
          return of(null);
        }),
        shareReplay(1)
      );

      this.sharedService.setUserNameCache(email, request);
      return request;
    }
  }

  searchNames(query: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.userServiceBaseUrl}/search/names?q=${query}`);
  }  

  /**
   * IMPORTANT: This method **SHOULD NOT** be removed unless the contributor themselves chooses to remove this.
   * @param email 
   * @returns userData Map
   */
  // fetchUserNamesByEmail(email: string): Observable<any> {
  //   const cachedData = this.getFromLocalStorage(email);
  //   if (cachedData) {
  //     return of(cachedData);
  //   } else {
  //     const params = new HttpParams().set('emails', email);
  //     const request = this.http.get<any>(`${this.userServiceBaseUrl}/name`, { params }).pipe(
  //       map(response => {
  //         const userDetails = response[email];
  //         this.saveToLocalStorage(email, userDetails);
  //         return userDetails;
  //       }),
  //       catchError(() => {
  //         return of(null);
  //       }),
  //       shareReplay(1)
  //     );
  //     return request;
  //   }
  // }

  // private saveToLocalStorage(email: string, userDetails: any): void {
  //   const cacheEntry = {
  //     userDetails,
  //     expiry: new Date().getTime() + this.cacheDuration
  //   };
  //   localStorage.setItem(email, JSON.stringify(cacheEntry));
  // }

  // private getFromLocalStorage(email: string): any {
  //   const cacheEntry = localStorage.getItem(email);
  //   if (cacheEntry) {
  //     const parsedEntry = JSON.parse(cacheEntry);
  //     if (parsedEntry.expiry > new Date().getTime()) {
  //       return parsedEntry.userDetails;
  //     } else {
  //       localStorage.removeItem(email);
  //     }
  //   }
  //   return null;
  // }
}
