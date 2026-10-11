import { Component, inject } from '@angular/core';
import { LanguageService } from '../services/language.service';

@Component({
  selector: 'app-footer',
  standalone: true,
  template: `
    <footer class="site-footer bg-card">
      <div class="page-shell footer-inner">
        <div>
          <p class="footer-brand">{{ lang.t('siteName') }}</p>
          <p class="text-muted">{{ lang.t('siteCaption') }}</p>
        </div>
        <p class="copyright text-muted">{{ lang.t('copyright', { year: lang.number(year) }) }}</p>
      </div>
    </footer>
  `,
})
export class Footer {
  protected readonly lang = inject(LanguageService);
  readonly year = new Date().getFullYear();
}
