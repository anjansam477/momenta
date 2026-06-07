import { Injectable, signal } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { User } from '../../shared/models';

/**
 * User-related shared state: profile details, name, avatar, email, and the
 * per-email username resolution cache. Split out of SharedDataService.
 */
@Injectable({ providedIn: 'root' })
export class UserStore {
  readonly userEmail = signal<string>('');

  private readonly userNameSubject = new BehaviorSubject<Partial<User>>({});
  readonly userData$ = this.userNameSubject.asObservable();

  private readonly userProfilePic = new BehaviorSubject<Blob | null>(null);
  private readonly userDetailsSubject = new BehaviorSubject<User | null>(null);
  private readonly userNameCache = new Map<string, Observable<string>>();

  updateUserName(newData: Partial<User>): void {
    const currentUserData = this.userDetailsSubject.value ?? ({} as User);

    const updatedUserData = {
      ...currentUserData,
      firstname: newData.firstname !== undefined ? newData.firstname : currentUserData.firstname,
      lastname: newData.lastname !== undefined ? newData.lastname : currentUserData.lastname,
    };

    this.userDetailsSubject.next(updatedUserData as User);

    this.userNameSubject.next({
      firstname: updatedUserData.firstname,
      lastname: updatedUserData.lastname,
    });
  }

  setUpdateUserProfile(changed: Blob | null): void {
    this.userProfilePic.next(changed);
  }

  getUpdateUserProfile() {
    return this.userProfilePic.asObservable();
  }

  setUserData(data: User | null): void {
    this.userDetailsSubject.next(data);
  }

  getUserData(): Observable<User | null> {
    return this.userDetailsSubject.asObservable();
  }

  setUserEmail(email: string): void {
    this.userEmail.set(email);
  }

  getUserNameCache(): Map<string, Observable<string>> {
    return this.userNameCache;
  }

  setUserNameCache(email: string, observable: Observable<string>): void {
    this.userNameCache.set(email, observable);
  }
}
