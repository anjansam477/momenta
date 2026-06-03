import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, map, Observable, of, shareReplay } from 'rxjs';
import { SERVICE_BASE_URL } from '../../environment-config';
import { AuthService } from '../authservice/auth.service';
import { SharedDataService } from '../sharedDataService/shared-data.service';
import { SocketService } from '../socketservice/socket.service';
import { User, UserDetails } from '../../shared/models';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private cacheDuration = 3 * 60 * 60 * 1000;
  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private sharedService: SharedDataService,
    private socketService: SocketService
  ) { }

  private userServiceBaseUrl = SERVICE_BASE_URL + '/api/users';

  createUser(userData: Partial<User>): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.userServiceBaseUrl}/account/create`, userData);
  }

  getUserByEmail(userEmail: string): Observable<User> {
    return this.http.get<User>(`${this.userServiceBaseUrl}/${userEmail}`);
  }

  loginUser(userData: { email: string; password: string }): Observable<{ token: string; name?: string }> {
    return this.http.post<{ token: string; name?: string }>(`${this.userServiceBaseUrl}/account/login`, userData);
  }

  forgotPassword(userData: { email: string }): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.userServiceBaseUrl}/account/password/reset`, userData);
  }

  updatePassword(userData: { token: string; password: string }): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.userServiceBaseUrl}/account/password/update`, userData);
  }

  logoutUser(token: string | null): Observable<void> {
    this.socketService.closeSocketConnection();
    return this.http.post<void>(`${this.userServiceBaseUrl}/account/logout`, token);
  }

  uploadProfilePicture(userId: string, file: Blob): Observable<void> {
    const formData = new FormData();
    formData.append('profilePicture', file);
    return this.http.put<void>(`${this.userServiceBaseUrl}/profile/picture/${userId}`, formData);
  }

  removeProfilePicture(userId: string): Observable<void> {
    return this.http.get<void>(`${this.userServiceBaseUrl}/profile/${userId}`);
  }

  updateUser(userId: string, userData: Partial<User>): Observable<User> {
    return this.http.put<User>(`${this.userServiceBaseUrl}/${userId}`, userData);
  }

  generateToken(userData: { email: string }): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.userServiceBaseUrl}/account/verify`, userData);
  }

  fetchUserNamesByEmail(email: string): Observable<UserDetails | null> {
    const cachedObservable = this.sharedService.getUserNameCache().get(email);
    if (cachedObservable) {
      return cachedObservable as unknown as Observable<UserDetails | null>;
    } else {
      const params = new HttpParams().set('emails', email);
      const request = this.http.get<Record<string, UserDetails>>(`${this.userServiceBaseUrl}/name`, { params }).pipe(
        map(response => response[email] ?? null),
        catchError(() => of(null)),
        shareReplay(1)
      );

      this.sharedService.setUserNameCache(email, request as unknown as Observable<string>);
      return request;
    }
  }

  searchNames(query: string): Observable<UserDetails[]> {
    return this.http.get<UserDetails[]>(`${this.userServiceBaseUrl}/search/names?q=${query}`);
  }
}
