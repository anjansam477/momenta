import { Injectable, signal } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Wall, BackgroundTheme } from '../../shared/models';

/** Live style-preview overrides applied while editing a wall's look. */
export interface StylePreview {
  bgColor?: string;
  font?: string;
  textColor?: string;
}

/**
 * Wall-related shared state: current wall details, available themes, live style
 * preview, the "send mail" toggle, and the wall search query. Split out of
 * SharedDataService.
 */
@Injectable({ providedIn: 'root' })
export class WallStore {
  readonly themes = signal<BackgroundTheme[]>([]);

  private readonly wallDetailsSubject = new BehaviorSubject<Wall | null>(null);

  private readonly stylePreviewSubject = new BehaviorSubject<StylePreview | null>(null);
  readonly stylePreview$ = this.stylePreviewSubject.asObservable();

  private readonly sendUserMail = new BehaviorSubject<boolean>(false);
  private readonly wallSearchQuery = new BehaviorSubject<string>('');

  setStylePreview(v: StylePreview | null): void {
    this.stylePreviewSubject.next(v);
  }

  clearStylePreview(): void {
    this.stylePreviewSubject.next(null);
  }

  setWallDetails(details: Wall | null): void {
    this.wallDetailsSubject.next(details);
  }

  getWallDetails(): Observable<Wall | null> {
    return this.wallDetailsSubject.asObservable();
  }

  updateWallDetailsPartially(updatedWallDetails: Partial<Wall>): void {
    const currentDetails = this.wallDetailsSubject.getValue();
    if (currentDetails) {
      this.wallDetailsSubject.next({ ...currentDetails, ...updatedWallDetails });
    }
  }

  setThemes(themes: BackgroundTheme[]): void {
    this.themes.set(themes);
  }

  setSendEmail(value: boolean): void {
    this.sendUserMail.next(value);
  }

  getSendMail(): Observable<boolean> {
    return this.sendUserMail.asObservable();
  }

  setWallSearchQuery(query: string): void {
    this.wallSearchQuery.next(query);
  }

  getWallSearchQuery(): Observable<string> {
    return this.wallSearchQuery.asObservable();
  }
}
