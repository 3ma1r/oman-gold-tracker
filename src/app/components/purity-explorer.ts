import { Component, computed, inject, output, signal } from '@angular/core';
import { GoldPurity } from '../models/gold-price';
import { GoldPriceService } from '../services/gold-price.service';
import { LanguageService } from '../services/language.service';

@Component({
  selector: 'app-purity-explorer',
  standalone: true,
  template: `
    <section id="purity-explorer" class="panel bg-card" aria-labelledby="explorer-title">
      <div class="explorer-heading">
        <div class="section-heading">
          <svg class="section-icon text-gold" viewBox="0 0 32 36" fill="none" aria-hidden="true">
            <circle cx="16" cy="18" r="12" stroke="currentColor" stroke-width="2.2" />
            <path d="m16 10 6 8-6 8-6-8 6-8Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" />
          </svg>
          <div><h2 id="explorer-title">{{ lang.t('explorerTitle') }}</h2><p class="text-muted">{{ lang.t('explorerIntro') }}</p></div>
        </div>
        <span class="explorer-badge bg-secondary text-primary">{{ lang.t('sampleData') }}</span>
      </div>
      <div class="explorer-tabs" role="group" [attr.aria-label]="lang.t('explorerSelection')">
        @for (purity of purities; track purity) {
          <button class="explorer-purity-button" type="button" [attr.data-explorer-purity]="purity" [attr.aria-pressed]="selectedPurity() === purity" (click)="selectedPurity.set(purity)">{{ lang.purity(purity) }}</button>
        }
      </div>
      <div class="explorer-layout">
        <div class="explorer-visual">
          <div class="explorer-donut">
            <svg viewBox="0 0 240 240" role="img" aria-labelledby="explorer-donut-title explorer-donut-description" focusable="false">
              <title id="explorer-donut-title">{{ lang.t('explorerDonutTitle', { purity: lang.purity(selectedPurity()) }) }}</title>
              <desc id="explorer-donut-description">{{ lang.t('explorerDonutDescription', { gold: goldPercentage(), other: otherPercentage() }) }}</desc>
              <circle class="explorer-other-ring" cx="120" cy="120" r="90" stroke-width="40" fill="none" />
              <circle class="explorer-gold-ring" cx="120" cy="120" r="90" stroke-width="40" fill="none" pathLength="24" [attr.stroke-dasharray]="selectedPurity() + ' ' + (24 - selectedPurity())" transform="rotate(-90 120 120)" />
            </svg>
            <div class="explorer-donut-label" aria-hidden="true"><strong>{{ lang.purity(selectedPurity()) }}</strong><bdi>{{ goldPercentage() }}</bdi><span class="text-muted">{{ lang.t('explorerGold') }}</span></div>
          </div>
          <ul class="explorer-legend">
            <li><span class="explorer-swatch explorer-swatch-gold" aria-hidden="true"></span><span>{{ lang.t('explorerGold') }} — <bdi>{{ goldPercentage() }}</bdi></span></li>
            <li><span class="explorer-swatch explorer-swatch-other" aria-hidden="true"></span><span>{{ lang.t('explorerOther') }} — <bdi>{{ otherPercentage() }}</bdi></span></li>
          </ul>
        </div>
        <div class="explorer-explanation">
          <h3>{{ lang.goldPurity(selectedPurity()) }}</h3>
          <p class="text-muted">{{ lang.t('explorerParts', { gold: lang.number(selectedPurity()), total: lang.number(24) }) }}</p>
          <div class="explorer-tiles" aria-hidden="true">
            @for (tile of tiles; track tile) {
              <span class="explorer-tile" [class.explorer-tile-gold]="tile < selectedPurity()"></span>
            }
          </div>
          <p class="explorer-parts text-muted">{{ lang.t('explorerBreakdown', { gold: lang.number(selectedPurity()), other: lang.number(24 - selectedPurity()) }) }}</p>
          <p class="explorer-model-note text-muted">{{ lang.t('explorerModelNote') }}</p>
          <div class="explorer-price-panel bg-secondary" [attr.aria-busy]="goldPrices.loading()">
            <div>
              <p class="explorer-price-label">{{ lang.t('explorerSamplePrice') }}</p>
              <p class="explorer-price"><bdi>{{ lang.price(price()) }}</bdi> <span class="text-muted">{{ lang.t('rialPerGram') }}</span></p>
              <p class="explorer-date text-muted">{{ lang.t('samplePricesBeforeDate') }} <time [attr.datetime]="sampleDate()">{{ sampleDate() ? lang.date(sampleDate()!) : '—' }}</time> {{ lang.t('samplePricesAfterDate') }}</p>
              <p id="explorer-availability" class="explorer-availability text-muted">{{ goldPrices.loading() ? lang.t('explorerPriceLoading') : !canUseCalculator() ? lang.t('explorerPriceUnavailable') : '' }}</p>
            </div>
            <button class="explorer-use-button calculate-button" type="button" [disabled]="!canUseCalculator()" aria-describedby="explorer-availability" (click)="usePrice($event)">{{ lang.t('explorerUse', { purity: lang.purity(selectedPurity()) }) }}</button>
          </div>
        </div>
      </div>
    </section>
  `,
})
export class PurityExplorer {
  protected readonly goldPrices = inject(GoldPriceService);
  protected readonly lang = inject(LanguageService);
  readonly useInCalculator = output<{ purity: GoldPurity; keyboard: boolean }>();
  readonly purities = this.goldPrices.purities;
  readonly selectedPurity = signal<GoldPurity>(18);
  readonly tiles = Array.from({ length: 24 }, (_, index) => index);
  // Numeric karat fractions remain exact; only their displayed percentages round.
  readonly goldFraction = computed(() => this.selectedPurity() / 24);
  readonly otherFraction = computed(() => (24 - this.selectedPurity()) / 24);
  readonly goldPercentage = computed(() => this.percentage(this.goldFraction()));
  readonly otherPercentage = computed(() => this.percentage(this.otherFraction()));
  readonly canUseCalculator = computed(() => !this.goldPrices.loading() && this.goldPrices.latest !== null);
  readonly price = computed(() => this.canUseCalculator() ? this.goldPrices.latest!.prices[this.selectedPurity()] : null);
  readonly sampleDate = computed(() => this.canUseCalculator() ? this.goldPrices.sampleDate : null);

  private percentage(fraction: number): string {
    return `${this.selectedPurity() === 22 ? '≈ ' : ''}${this.lang.percentage(fraction * 100)}`;
  }

  usePrice(event: MouseEvent): void {
    if (this.canUseCalculator()) this.useInCalculator.emit({ purity: this.selectedPurity(), keyboard: event.detail === 0 });
  }
}
