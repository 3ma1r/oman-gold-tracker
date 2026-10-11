import { Component, inject } from '@angular/core';
import { GoldPriceService } from '../services/gold-price.service';
import { LanguageService } from '../services/language.service';

@Component({
  selector: 'app-hero',
  standalone: true,
  template: `
    <section id="home" class="hero" aria-labelledby="hero-title">
      <div class="hero-artwork" aria-hidden="true"></div>
      <div class="page-shell hero-inner">
        <div class="hero-content">
        <nav class="breadcrumb" [attr.aria-label]="lang.t('breadcrumb')">
          <ol>
            <li><a href="#home">{{ lang.t('home') }}</a></li>
            <li aria-hidden="true">{{ lang.language() === 'ar' ? '‹' : '›' }}</li>
            <li aria-current="page">{{ lang.t('heroTitle') }}</li>
          </ol>
        </nav>
        <div class="hero-copy">
          <h1 id="hero-title">{{ lang.t('heroTitle') }}</h1>
          <p>{{ lang.t('heroDescription') }}</p>
          <span class="sample-badge bg-secondary text-primary">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.6" />
              <path d="M12 11v6m0-10v1" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
            </svg>
            {{ lang.t('sampleData') }}
          </span>
        </div>
        <dl class="hero-details">
          <div><dt>{{ lang.t('lastDataUpdate') }}</dt><dd><time [attr.datetime]="goldPrices.sampleDate">{{ goldPrices.sampleDate ? lang.date(goldPrices.sampleDate) : '—' }}</time></dd></div>
          <div><dt>{{ lang.t('market') }}</dt><dd>{{ lang.t('oman') }}</dd></div>
          <div><dt>{{ lang.t('currency') }}</dt><dd>{{ lang.t('rial') }} <bdi>(OMR)</bdi></dd></div>
          <div><dt>{{ lang.t('unit') }}</dt><dd>{{ lang.t('rialPerGram') }}</dd></div>
        </dl>
        </div>
      </div>
    </section>
  `,
})
export class Hero {
  protected readonly goldPrices = inject(GoldPriceService);
  protected readonly lang = inject(LanguageService);
}
