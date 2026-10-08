import { Component } from '@angular/core';

@Component({
  selector: 'app-header',
  standalone: true,
  template: `
    <header class="bg-card text-primary">
      <div class="page-shell header-inner">
        <a class="brand" href="#home" aria-label="الذهب العُماني — الرئيسية">
          <svg class="brand-mark text-gold" viewBox="0 0 64 48" fill="none" aria-hidden="true">
            <path d="M3 41 18 23c3-4 6-4 10 0l5 5 8-20c2-5 5-5 8 0l12 27-15-14-6 13-10-6-8 1L3 41Z" fill="currentColor" />
            <path d="M20 29c12 1 13 15 31 16-9-5-12-18-22-22" fill="currentColor" />
          </svg>
          <span>
            <span class="brand-name">الذهب العُماني</span>
            <span class="brand-caption text-muted">أسعار الذهب في سلطنة عُمان</span>
          </span>
        </a>
        <nav class="header-nav" aria-label="التنقل الرئيسي">
          <a href="#home">الرئيسية</a>
          <a href="#prices">الأسعار</a>
          <a href="#calculator">حاسبة الذهب</a>
          <a href="#trends">حركة الأسعار</a>
        </nav>
      </div>
    </header>
  `,
})
export class Header {}
