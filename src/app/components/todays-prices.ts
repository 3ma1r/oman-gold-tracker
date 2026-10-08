import { Component } from '@angular/core';
import { PriceCard } from './price-card';

@Component({
  selector: 'app-todays-prices',
  standalone: true,
  imports: [PriceCard],
  template: `
    <section id="prices" aria-labelledby="prices-title">
      <h2 id="prices-title" class="sr-only">أسعار الذهب اليوم</h2>
      <div class="price-grid grid grid-cols-1 min-[480px]:grid-cols-2 lg:grid-cols-4 gap-4">
        <app-price-card [purity]="24" />
        <app-price-card [purity]="22" />
        <app-price-card [purity]="21" />
        <app-price-card [purity]="18" />
      </div>
    </section>
  `,
})
export class TodaysPrices {}
