import { DOCUMENT } from '@angular/common';
import { Component, DestroyRef, inject } from '@angular/core';
import { DailyGoldPrice, GOLD_PURITIES } from '../models/gold-price';
import { GoldPriceService } from '../services/gold-price.service';
import { LanguageService } from '../services/language.service';

@Component({
  selector: 'app-price-history',
  standalone: true,
  template: `
    <section id="history" class="panel bg-card" aria-labelledby="history-title" [attr.aria-busy]="goldPrices.loading()">
      <div class="history-heading-row">
        <div class="section-heading">
          <svg class="section-icon text-accent" viewBox="0 0 32 36" fill="none" aria-hidden="true">
            <rect x="3" y="6" width="26" height="27" rx="3" stroke="currentColor" stroke-width="2.2" />
            <path d="M10 2v8m12-8v8M3 15h26M10 21h1m9 0h1m-11 6h1m9 0h1" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" />
          </svg>
          <div>
            <h2 id="history-title">{{ lang.t('history') }}</h2>
            <p class="text-muted">{{ lang.t('historyDescription', { count: lang.number(goldPrices.loading() ? skeletonRows.length : goldPrices.history.length) }) }}</p>
          </div>
        </div>
        <button class="export-csv-button" type="button" [disabled]="!canExport" [attr.aria-label]="lang.t('exportCsvLabel')" (click)="exportCsv()">{{ lang.t('exportCsv') }}</button>
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
            @if (goldPrices.loading()) {
              @for (row of skeletonRows; track row) {
                <tr aria-hidden="true">
                  <th scope="row"><span class="skeleton skeleton-text" aria-hidden="true">&#160;&#160;&#160;&#160;&#160;&#160;&#160;&#160;&#160;&#160;&#160;&#160;</span></th>
                  @for (purity of historyPurities; track purity) {
                    <td><span class="skeleton skeleton-text" aria-hidden="true">&#160;&#160;&#160;&#160;&#160;&#160;</span></td>
                  }
                </tr>
              }
            } @else {
              @for (day of goldPrices.history; track day.date) {
                <tr>
                  <th scope="row">
                    <time [attr.datetime]="day.date">{{ lang.date(day.date) }}</time>
                  </th>
                  @for (purity of historyPurities; track purity) {
                    <td>
                      <bdi>{{ lang.price(day.prices[purity]) }}</bdi>
                    </td>
                  }
                </tr>
              } @empty {
                <tr><td colspan="5">{{ lang.t('historyEmpty') }}</td></tr>
              }
            }
          </tbody>
        </table>
      </div>
    </section>
  `,
})
export class PriceHistory {
  private readonly document = inject(DOCUMENT);
  private readonly downloadUrls = new Map<string, ReturnType<typeof setTimeout>>();
  protected readonly goldPrices = inject(GoldPriceService);
  protected readonly lang = inject(LanguageService);
  protected readonly historyPurities = [24, 22, 21, 18] as const;
  protected readonly skeletonRows = Array.from({ length: 30 }, (_, index) => index);
  protected readonly formatPurity = (purity: (typeof this.historyPurities)[number]) => this.lang.purity(purity);

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.downloadUrls.forEach((timer, url) => { clearTimeout(timer); URL.revokeObjectURL(url); });
      this.downloadUrls.clear();
    });
  }

  get canExport(): boolean { return !this.goldPrices.loading() && this.goldPrices.history.length > 0; }

  exportCsv(): void {
    if (!this.canExport) return;
    const csv = createHistoryCsv(this.goldPrices.history);
    if (!csv) return;
    const url = URL.createObjectURL(new Blob([csv.content], { type: 'text/csv;charset=utf-8' }));
    const link = this.document.createElement('a');
    try {
      link.href = url; link.download = csv.filename; link.hidden = true;
      this.document.body.appendChild(link); link.click();
    } finally {
      link.remove();
      // Let the browser start consuming the download before releasing its URL.
      this.downloadUrls.set(url, setTimeout(() => {
        URL.revokeObjectURL(url); this.downloadUrls.delete(url);
      }, 0));
    }
  }
}

/** Locale-independent export of the same numeric history displayed in the table. */
export function createHistoryCsv(history: readonly DailyGoldPrice[]): { content: string; filename: string } | null {
  if (!history.length) return null;
  const days = [...history].sort((left, right) => left.date.localeCompare(right.date));
  const header = ['Date', ...GOLD_PURITIES.map(karat => `${karat}K (OMR/gram)`)].join(',');
  const rows = days.map(day => [day.date, ...GOLD_PURITIES.map(karat => day.prices[karat].toFixed(3))].join(','));
  return {
    content: '\uFEFF' + [header, ...rows].join('\r\n') + '\r\n',
    filename: `sample-gold-prices_${days[0].date}_to_${days[days.length - 1].date}.csv`,
  };
}
