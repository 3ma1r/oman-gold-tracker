import { Component, inject } from '@angular/core';
import { LanguageService } from '../services/language.service';
import { ThemeService } from '../services/theme.service';

@Component({
  selector: 'app-header',
  standalone: true,
  template: `
    <header class="bg-card text-primary">
      <div class="page-shell header-inner">
        <a class="brand" href="#home" [attr.aria-label]="lang.t('brandHome')">
          <svg class="brand-mark text-gold" viewBox="0 0 64 48" fill="none" aria-hidden="true">
            <path d="M3 41 18 23c3-4 6-4 10 0l5 5 8-20c2-5 5-5 8 0l12 27-15-14-6 13-10-6-8 1L3 41Z" fill="currentColor" />
            <path d="M20 29c12 1 13 15 31 16-9-5-12-18-22-22" fill="currentColor" />
          </svg>
          <span>
            <span class="brand-name">{{ lang.t('siteName') }}</span>
            <span class="brand-caption text-muted">{{ lang.t('siteCaption') }}</span>
          </span>
        </a>
        <nav class="header-nav" [attr.aria-label]="lang.t('mainNavigation')">
          <a href="#home">{{ lang.t('home') }}</a>
          <a href="#prices">{{ lang.t('prices') }}</a>
          <a href="#calculator">{{ lang.t('calculator') }}</a>
          <a href="#trends">{{ lang.t('trends') }}</a>
        </nav>
        <div class="header-controls">
          <button class="language-button bg-card text-primary" type="button" [attr.lang]="lang.language() === 'ar' ? 'en' : 'ar'" [attr.dir]="lang.language() === 'ar' ? 'ltr' : 'rtl'" [attr.aria-label]="lang.t('languageButtonName')" (click)="lang.toggle()">{{ lang.t('languageButton') }}</button>
          <button class="theme-button bg-card text-primary" type="button" [attr.aria-label]="lang.t(theme.theme() === 'light' ? 'switchToDark' : 'switchToLight')" [title]="lang.t(theme.theme() === 'light' ? 'switchToDark' : 'switchToLight')" (click)="theme.toggle()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false" [attr.data-theme-icon]="theme.theme() === 'light' ? 'moon' : 'sun'">
              @if (theme.theme() === 'light') {
                <path d="M20.5 13.4A8.5 8.5 0 0 1 10.6 3.5a8.5 8.5 0 1 0 9.9 9.9Z" />
              } @else {
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
              }
            </svg>
            <span class="sr-only">{{ lang.t(theme.theme() === 'light' ? 'switchToDark' : 'switchToLight') }}</span>
          </button>
        </div>
      </div>
    </header>
  `,
})
export class Header {
  protected readonly lang = inject(LanguageService);
  protected readonly theme = inject(ThemeService);
}
