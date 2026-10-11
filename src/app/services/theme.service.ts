import { DOCUMENT } from '@angular/common';
import { inject, Injectable, signal } from '@angular/core';

export type Theme = 'light' | 'dark';
// Keep the key and dark-only opt-in consistent with the pre-paint script in index.html.
export const THEME_STORAGE_KEY = 'oman-gold-tracker.theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly currentTheme = signal<Theme>(this.restoreTheme());
  readonly theme = this.currentTheme.asReadonly();

  constructor() {
    this.updateDocument();
  }

  toggle(): void {
    this.setTheme(this.theme() === 'light' ? 'dark' : 'light');
  }

  setTheme(theme: Theme): void {
    this.currentTheme.set(theme);
    this.updateDocument();
    try {
      this.document.defaultView?.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Switching still works when storage is denied or full.
    }
  }

  private restoreTheme(): Theme {
    try {
      return this.document.defaultView?.localStorage.getItem(THEME_STORAGE_KEY) === 'dark' ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  }

  private updateDocument(): void {
    this.document.documentElement.classList.toggle('dark', this.theme() === 'dark');
    this.document.documentElement.style.colorScheme = this.theme();
  }
}
