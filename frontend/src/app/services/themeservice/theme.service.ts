import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type Theme = 'light' | 'dark';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly STORAGE_KEY = 'momenta-theme';
  private _theme: Theme;

  readonly theme$ = new BehaviorSubject<Theme>(this.getStoredTheme());

  constructor() {
    this._theme = this.getStoredTheme();
    this.apply(this._theme);
  }

  get isDark(): boolean { return this._theme === 'dark'; }

  toggle(): void {
    this.setTheme(this._theme === 'dark' ? 'light' : 'dark');
  }

  setTheme(theme: Theme): void {
    // Idempotent: if the theme isn't actually changing, do nothing. This stops a
    // stale cached user value from re-applying the old theme on component remount,
    // and prevents redundant DB writes / emit loops.
    if (theme === this._theme) return;
    this._theme = theme;
    localStorage.setItem(this.STORAGE_KEY, theme);
    this.apply(theme);
    this.theme$.next(theme);
  }

  private getStoredTheme(): Theme {
    const stored = localStorage.getItem(this.STORAGE_KEY) as Theme | null;
    if (stored === 'dark' || stored === 'light') return stored;
    return 'light';
  }

  private apply(theme: Theme): void {
    document.documentElement.setAttribute('data-theme', theme);
  }
}
