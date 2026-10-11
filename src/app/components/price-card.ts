import { Component, inject, input } from '@angular/core';
import { LanguageService } from '../services/language.service';
import { GoldPurity } from '../models/gold-price';

@Component({
  selector: 'app-price-card',
  standalone: true,
  template: `
    <article class="price-card panel bg-card text-primary" [attr.aria-labelledby]="'price-' + purity()">
      <div class="price-card-heading">
        <svg class="text-gold" viewBox="0 0 32 28" fill="none" aria-hidden="true">
          <path d="m3 18 8-5 10 3-7 6-11-4Zm0 0v5l11 3 10-7v-4M14 22v4M11 13l3-7 9-3 6 5-3 9M14 6l8 5 7-3M22 11l-1 5" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" />
        </svg>
        <h3 [id]="'price-' + purity()">{{ lang.goldPurity(purity()) }}</h3>
      </div>
      <p class="price-value"><bdi>{{ lang.price(price()) }}</bdi></p>
      <p class="price-unit text-muted">{{ lang.t('rialPerGram') }}</p>
    </article>
  `,
})
export class PriceCard {
  protected readonly lang = inject(LanguageService);
  readonly purity = input.required<GoldPurity>();
  readonly price = input.required<number>();
}
