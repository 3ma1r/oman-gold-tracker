import { Component, inject } from '@angular/core';
import { PriceCard } from './price-card';
import { GoldPriceService } from '../services/gold-price.service';
import { LanguageService } from '../services/language.service';

@Component({
  selector: 'app-todays-prices',
  standalone: true,
  imports: [PriceCard],
  template: `
    <section id="prices" aria-labelledby="prices-title" [attr.aria-busy]="goldPrices.loading()">
      <h2 id="prices-title" class="sr-only">{{ lang.t('samplePrices') }}</h2>
      <p class="price-data-note text-muted">{{ lang.t('samplePricesBeforeDate') }} <time [attr.datetime]="goldPrices.sampleDate">{{ goldPrices.sampleDate ? lang.date(goldPrices.sampleDate) : '—' }}</time> {{ lang.t('samplePricesAfterDate') }}</p>
      @if (goldPrices.loading() || goldPrices.latest) {
        <div class="price-grid grid grid-cols-1 min-[480px]:grid-cols-2 lg:grid-cols-4 gap-4">
          @for (purity of displayedPurities; track purity) {
            <app-price-card [purity]="purity" [price]="goldPrices.latest?.prices?.[purity] ?? null" [loading]="goldPrices.loading()" />
          }
        </div>
      } @else {
        <p class="prices-empty panel bg-card text-muted">{{ lang.t('pricesEmpty') }}</p>
      }
    </section>
  `,
})
export class TodaysPrices {
  protected readonly goldPrices = inject(GoldPriceService);
  protected readonly lang = inject(LanguageService);
  protected readonly displayedPurities = [24, 22, 21, 18] as const;
}
