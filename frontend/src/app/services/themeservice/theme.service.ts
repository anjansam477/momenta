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
    this._theme = theme;
    localStorage.setItem(this.STORAGE_KEY, theme);
    this.apply(theme);
    this.theme$.next(theme);
  }

  private getStoredTheme(): Theme {
    const stored = localStorage.getItem(this.STORAGE_KEY) as Theme | null;
    if (stored === 'dark' || stored === 'light') return stored;
    // Respect OS preference on first load
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  private apply(theme: Theme): void {
    document.documentElement.setAttribute('data-theme', theme);
  }
}
