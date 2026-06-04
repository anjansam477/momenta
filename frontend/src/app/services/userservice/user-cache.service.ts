import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { shareReplay, catchError } from 'rxjs/operators';
import { UserService } from './user.service';
import { UserDetails } from '../../shared/models';

@Injectable({ providedIn: 'root' })
export class UserCacheService {
  private cache = new Map<string, Observable<UserDetails | null>>();

  constructor(private userService: UserService) {}

  getUser(email: string): Observable<UserDetails | null> {
    if (!email) return of(null);
    if (this.cache.has(email)) return this.cache.get(email)!;
    const user$ = this.userService.fetchUserNamesByEmail(email).pipe(
      shareReplay(1),
      catchError(() => of(null))
    );
    this.cache.set(email, user$);
    return user$;
  }

  preload(email: string, details: Partial<UserDetails>): void {
    this.cache.set(email, of(details as UserDetails).pipe(shareReplay(1)));
  }

  invalidate(email: string): void {
    this.cache.delete(email);
  }
}
