import { Component, computed, inject, signal } from '@angular/core';
import { GoldPurity } from '../models/gold-price';
import { GoldPriceService } from '../services/gold-price.service';
import { LanguageService } from '../services/language.service';
import { buildPriceTrend, CHART_HEIGHT, CHART_WIDTH } from './price-trend-chart';

@Component({
  selector: 'app-price-trend',
  standalone: true,
  template: `
    <section id="trends" class="panel bg-card" aria-labelledby="trends-title" [attr.aria-busy]="goldPrices.loading()" [attr.data-transition]="selectedPurity()">
      <div class="trend-top grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <div class="section-heading">
            <svg class="section-icon text-accent" viewBox="0 0 32 36" fill="none" aria-hidden="true">
              <path d="M5 31v-7m8 7V17m8 14V10m8 21V3" stroke="currentColor" stroke-width="4" stroke-linecap="round" />
            </svg>
            <div>
              <h2 id="trends-title">{{ lang.t('trends') }}</h2>
              <p class="text-muted">{{ lang.t('trendDescription', { count: lang.number(trend().series.length) }) }}</p>
            </div>
          </div>
          <div class="purity-tabs" role="group" [attr.aria-label]="lang.t('chartPurity')">
            @for (purity of purities; track purity) {
              <button class="purity-tab" type="button" [attr.data-purity]="purity" [attr.aria-pressed]="selectedPurity() === purity" (click)="selectedPurity.set(purity)">{{ lang.purity(purity) }}</button>
            }
          </div>
        </div>
        <dl class="trend-stats">
          <div><dt class="text-muted">{{ lang.t('latestSample') }}</dt><dd [attr.aria-hidden]="goldPrices.loading() ? 'true' : null">@if (goldPrices.loading()) { <span class="skeleton skeleton-text skeleton-stat" aria-hidden="true"><bdi>{{ lang.price(trend().latest) }}</bdi></span> } @else { <bdi>{{ lang.price(trend().latest) }}</bdi> }</dd><span class="text-muted">{{ lang.t('rialPerGram') }}</span></div>
          <div><dt class="text-muted">{{ lang.t('highest') }}</dt><dd [attr.aria-hidden]="goldPrices.loading() ? 'true' : null">@if (goldPrices.loading()) { <span class="skeleton skeleton-text skeleton-stat" aria-hidden="true"><bdi>{{ lang.price(trend().highest) }}</bdi></span> } @else { <bdi>{{ lang.price(trend().highest) }}</bdi> }</dd><span class="text-muted">{{ lang.t('rialPerGram') }}</span></div>
          <div><dt class="text-muted">{{ lang.t('lowest') }}</dt><dd [attr.aria-hidden]="goldPrices.loading() ? 'true' : null">@if (goldPrices.loading()) { <span class="skeleton skeleton-text skeleton-stat" aria-hidden="true"><bdi>{{ lang.price(trend().lowest) }}</bdi></span> } @else { <bdi>{{ lang.price(trend().lowest) }}</bdi> }</dd><span class="text-muted">{{ lang.t('rialPerGram') }}</span></div>
        </dl>
      </div>
      <div class="trend-comparison" [class.comparison-loading]="goldPrices.loading()" [attr.aria-hidden]="goldPrices.loading() ? 'true' : null" aria-live="polite" aria-atomic="true">
        <p class="comparison-heading">{{ lang.t('comparisonHeading', { purity: lang.purity(selectedPurity()) }) }}</p>
        <dl class="comparison-grid">
          <div><dt>{{ lang.t('latestPrice') }} <time [attr.datetime]="trend().series.at(-1)?.date">{{ lastDate() }}</time></dt><dd><bdi>{{ lang.price(trend().latest) }}</bdi> {{ lang.t('rialPerGram') }}</dd></div>
          <div><dt>{{ lang.t('previousPrice') }} <time [attr.datetime]="trend().series.at(-2)?.date">{{ previousDate() }}</time></dt><dd><bdi>{{ lang.price(trend().previous) }}</bdi> {{ lang.t('rialPerGram') }}</dd></div>
          <div><dt>{{ lang.t('absoluteChange') }}</dt><dd class="comparison-change">{{ movement() }} <bdi>{{ sign() }}{{ lang.price(absoluteChange()) }}</bdi> {{ lang.t('rialPerGram') }}</dd></div>
          <div><dt>{{ lang.t('percentageChange') }}</dt><dd class="comparison-percentage"><bdi>{{ trend().percentage !== null ? sign() : '' }}{{ lang.percentage(absolutePercentage()) }}</bdi></dd></div>
        </dl>
        @if (!goldPrices.loading() && trend().previous === 0) {
          <p class="control-note text-muted">{{ lang.t('zeroPrevious') }}</p>
        } @else if (!goldPrices.loading() && trend().previous === null) {
          <p class="control-note text-muted">{{ lang.t('noPrevious') }}</p>
        }
      </div>
      @if (goldPrices.loading() || trend().points.length) {
        <figure class="trend-chart">
          <p class="chart-axis-title text-muted">{{ lang.t('chartAxis') }}</p>
          <div class="chart-layout" dir="ltr">
            <div class="chart-y-axis text-muted" aria-hidden="true">
              @if (goldPrices.loading()) {
                @for (tick of skeletonTicks; track tick) {
                  <span class="skeleton skeleton-cell" [style.top.%]="5 + tick * 22.5" aria-hidden="true"></span>
                }
              } @else {
              @for (tick of trend().priceTicks; track $index) {
                <span [style.top.%]="tick.y / chartHeight * 100">{{ lang.price(tick.value) }}</span>
              }
              }
            </div>
            @if (goldPrices.loading()) {
              <div class="price-chart chart-skeleton skeleton" aria-hidden="true"></div>
            } @else {
            <svg class="price-chart" [attr.viewBox]="'0 0 ' + chartWidth + ' ' + chartHeight" preserveAspectRatio="none" role="img" aria-labelledby="trend-chart-title trend-chart-description">
              <title id="trend-chart-title">{{ lang.t('chartTitle', { purity: lang.purity(selectedPurity()) }) }}</title>
              <desc id="trend-chart-description">{{ chartDescription() }}</desc>
              @for (tick of trend().priceTicks; track $index) {
                <line class="chart-grid" x1="12" [attr.x2]="chartWidth - 12" [attr.y1]="tick.y" [attr.y2]="tick.y" vector-effect="non-scaling-stroke" />
              }
              @for (point of gridPoints(); track point.day.date) {
                <line class="chart-grid" [attr.x1]="point.x" [attr.x2]="point.x" y1="12" [attr.y2]="chartHeight - 12" vector-effect="non-scaling-stroke" />
              }
              @if (trend().area) { <polygon class="chart-area" [attr.points]="trend().area" /> }
              <polyline class="chart-line" [attr.points]="trend().line" vector-effect="non-scaling-stroke" />
              @if (trend().points.length === 1) {
                <circle class="chart-point" [attr.cx]="trend().points[0].x" [attr.cy]="trend().points[0].y" r="3" />
              }
            </svg>
            }
            <div class="chart-dates text-muted">
              <span [attr.dir]="lang.direction()">{{ lang.t('start') }} <time [attr.datetime]="trend().series.at(0)?.date">{{ firstDate() }}</time></span>
              <span [attr.dir]="lang.direction()">{{ lang.t('end') }} <time [attr.datetime]="trend().series.at(-1)?.date">{{ lastDate() }}</time></span>
            </div>
          </div>
          <figcaption class="control-note text-muted">{{ lang.t('chartChronology') }} <a class="history-alternative" href="#history">{{ lang.t('historyAlternative') }}</a>.</figcaption>
        </figure>
      } @else {
        <p class="chart-empty text-muted">{{ lang.t('chartEmpty') }}</p>
      }
    </section>
  `,
})
export class PriceTrend {
  protected readonly goldPrices = inject(GoldPriceService);
  protected readonly lang = inject(LanguageService);
  readonly purities = this.goldPrices.purities;
  readonly selectedPurity = signal<GoldPurity>(24);
  readonly trend = computed(() => buildPriceTrend(this.goldPrices.days, this.selectedPurity()));
  readonly chartWidth = CHART_WIDTH;
  readonly chartHeight = CHART_HEIGHT;
  protected readonly skeletonTicks = [0, 1, 2, 3, 4];
  readonly gridPoints = computed(() => this.trend().points.filter((_, index, points) =>
    index === 0 || index === points.length - 1 || index % 7 === 0));
  readonly firstDate = computed(() => this.dateLabel(0));
  readonly lastDate = computed(() => this.dateLabel(-1));
  readonly previousDate = computed(() => this.dateLabel(-2));
  readonly absoluteChange = computed(() => this.trend().change === null ? null : Math.abs(this.trend().change!));
  readonly absolutePercentage = computed(() => this.trend().percentage === null ? null : Math.abs(this.trend().percentage!));
  readonly sign = computed(() => (this.trend().change ?? 0) > 0 ? '+' : (this.trend().change ?? 0) < 0 ? '−' : '');
  readonly movement = computed(() => {
    const change = this.trend().change;
    return this.lang.t(change === null ? 'comparisonUnavailable' : change > 0 ? 'movementUp' : change < 0 ? 'movementDown' : 'movementUnchanged');
  });
  readonly chartDescription = computed(() => this.lang.t('chartDescription', {
    purity: this.lang.purity(this.selectedPurity()), firstDate: this.firstDate(), lastDate: this.lastDate(),
    firstPrice: this.lang.price(this.trend().points[0]?.value ?? null), lastPrice: this.lang.price(this.trend().latest),
    movement: this.movement(),
  }));

  private dateLabel(index: number): string {
    const date = this.trend().series.at(index)?.date;
    return date ? this.lang.date(date) : '—';
  }
}
