import { Component, inject } from '@angular/core';
import { GoldPriceService } from '../services/gold-price.service';
import { LanguageService } from '../services/language.service';

@Component({
  selector: 'app-price-history',
  standalone: true,
  template: `
    <section id="history" class="panel bg-card" aria-labelledby="history-title">
      <div class="section-heading">
        <svg class="section-icon text-accent" viewBox="0 0 32 36" fill="none" aria-hidden="true">
          <rect x="3" y="6" width="26" height="27" rx="3" stroke="currentColor" stroke-width="2.2" />
          <path d="M10 2v8m12-8v8M3 15h26M10 21h1m9 0h1m-11 6h1m9 0h1" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" />
        </svg>
        <div>
          <h2 id="history-title">{{ lang.t('history') }}</h2>
          <p class="text-muted">{{ lang.t('historyDescription', { count: lang.number(goldPrices.history.length) }) }}</p>
        </div>
      </div>
      <div class="history-scroll" tabindex="0" role="region" [attr.aria-label]="lang.t('historyRegion')">
        <table>
          <caption class="sr-only">{{ lang.t('historyCaption', { purities: historyPurities.map(formatPurity).join(' / ') }) }}</caption>
          <thead class="bg-secondary text-primary">
            <tr>
              <th scope="col">{{ lang.t('date') }}</th>
              @for (purity of historyPurities; track purity) {
                <th scope="col">{{ lang.goldPurity(purity) }}</th>
              }
            </tr>
          </thead>
          <tbody>
            @for (day of goldPrices.history; track day.date) {
              <tr>
                <th scope="row"><time [attr.datetime]="day.date">{{ lang.date(day.date) }}</time></th>
                @for (purity of historyPurities; track purity) {
                  <td><bdi>{{ lang.price(day.prices[purity]) }}</bdi></td>
                }
              </tr>
            } @empty {
              <tr><td colspan="5">{{ lang.t('historyEmpty') }}</td></tr>
            }
          </tbody>
        </table>
      </div>
    </section>
  `,
})
export class PriceHistory {
  protected readonly goldPrices = inject(GoldPriceService);
  protected readonly lang = inject(LanguageService);
  protected readonly historyPurities = [24, 22, 21, 18] as const;
  protected readonly formatPurity = (purity: (typeof this.historyPurities)[number]) => this.lang.purity(purity);
}
