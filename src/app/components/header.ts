import { Component, inject } from '@angular/core';
import { LanguageService } from '../services/language.service';

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
        <button class="language-button bg-card text-primary" type="button" [attr.lang]="lang.language() === 'ar' ? 'en' : 'ar'" [attr.dir]="lang.language() === 'ar' ? 'ltr' : 'rtl'" [attr.aria-label]="lang.t('languageButtonName')" (click)="lang.toggle()">{{ lang.t('languageButton') }}</button>
      </div>
    </header>
  `,
})
export class Header {
  protected readonly lang = inject(LanguageService);
}
