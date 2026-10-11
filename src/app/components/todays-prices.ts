import { Component, inject } from '@angular/core';
import { PriceCard } from './price-card';
import { GoldPriceService } from '../services/gold-price.service';
import { LanguageService } from '../services/language.service';

@Component({
  selector: 'app-todays-prices',
  standalone: true,
  imports: [PriceCard],
  template: `
    <section id="prices" aria-labelledby="prices-title">
      <h2 id="prices-title" class="sr-only">{{ lang.t('samplePrices') }}</h2>
      <p class="price-data-note text-muted">{{ lang.t('samplePricesBeforeDate') }} <time [attr.datetime]="goldPrices.sampleDate">{{ lang.date(goldPrices.sampleDate) }}</time> {{ lang.t('samplePricesAfterDate') }}</p>
      <div class="price-grid grid grid-cols-1 min-[480px]:grid-cols-2 lg:grid-cols-4 gap-4">
        <app-price-card [purity]="24" [price]="goldPrices.latest.prices[24]" />
        <app-price-card [purity]="22" [price]="goldPrices.latest.prices[22]" />
        <app-price-card [purity]="21" [price]="goldPrices.latest.prices[21]" />
        <app-price-card [purity]="18" [price]="goldPrices.latest.prices[18]" />
      </div>
    </section>
  `,
})
export class TodaysPrices {
  protected readonly goldPrices = inject(GoldPriceService);
  protected readonly lang = inject(LanguageService);
}
