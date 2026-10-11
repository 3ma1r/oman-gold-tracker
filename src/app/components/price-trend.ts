import { Component, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { GoldPurity } from '../models/gold-price';
import { GoldPriceService } from '../services/gold-price.service';
import { formatSampleDate } from '../services/gold-price-format';
import { buildPriceTrend, CHART_HEIGHT, CHART_WIDTH } from './price-trend-chart';

@Component({
  selector: 'app-price-trend',
  standalone: true,
  imports: [DecimalPipe],
  template: `
    <section id="trends" class="panel bg-card" aria-labelledby="trends-title">
      <div class="trend-top grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <div class="section-heading">
            <svg class="section-icon text-cocoa" viewBox="0 0 32 36" fill="none" aria-hidden="true">
              <path d="M5 31v-7m8 7V17m8 14V10m8 21V3" stroke="currentColor" stroke-width="4" stroke-linecap="round" />
            </svg>
            <div>
              <h2 id="trends-title">حركة الأسعار</h2>
              <p class="text-muted">حركة أسعار الذهب التجريبية خلال {{ trend().series.length }} يوماً، بالريال العُماني لكل غرام.</p>
            </div>
          </div>
          <div class="purity-tabs" role="group" aria-label="عيار الذهب للرسم البياني">
            @for (purity of purities; track purity) {
              <button class="purity-tab" type="button" [attr.data-purity]="purity" [attr.aria-pressed]="selectedPurity() === purity" (click)="selectedPurity.set(purity)">{{ purity }} قيراط</button>
            }
          </div>
        </div>
        <dl class="trend-stats">
          <div><dt class="text-muted">آخر سعر تجريبي</dt><dd><bdi>{{ trend().latest !== null ? (trend().latest | number:'1.3-3':'en-US') : '—' }}</bdi></dd><span class="text-muted">ريال عُماني / غرام</span></div>
          <div><dt class="text-muted">أعلى سعر</dt><dd><bdi>{{ trend().highest !== null ? (trend().highest | number:'1.3-3':'en-US') : '—' }}</bdi></dd><span class="text-muted">ريال عُماني / غرام</span></div>
          <div><dt class="text-muted">أدنى سعر</dt><dd><bdi>{{ trend().lowest !== null ? (trend().lowest | number:'1.3-3':'en-US') : '—' }}</bdi></dd><span class="text-muted">ريال عُماني / غرام</span></div>
        </dl>
      </div>
      <div class="trend-comparison" aria-live="polite" aria-atomic="true">
        <p class="comparison-heading">مقارنة بآخر يوم سابق في البيانات التجريبية — {{ selectedPurity() }} قيراط</p>
        <dl class="comparison-grid">
          <div><dt>آخر سعر <time [attr.datetime]="trend().series.at(-1)?.date">{{ lastDate() }}</time></dt><dd><bdi>{{ trend().latest !== null ? (trend().latest | number:'1.3-3':'en-US') : '—' }}</bdi> ريال / غرام</dd></div>
          <div><dt>سعر اليوم السابق <time [attr.datetime]="trend().series.at(-2)?.date">{{ previousDate() }}</time></dt><dd><bdi>{{ trend().previous !== null ? (trend().previous | number:'1.3-3':'en-US') : '—' }}</bdi> ريال / غرام</dd></div>
          <div><dt>التغير بالقيمة</dt><dd class="comparison-change">{{ movement() }} <bdi>{{ sign() }}{{ absoluteChange() !== null ? (absoluteChange() | number:'1.3-3':'en-US') : '—' }}</bdi> ريال / غرام</dd></div>
          <div><dt>التغير بالنسبة المئوية</dt><dd class="comparison-percentage"><bdi>{{ trend().percentage !== null ? sign() : '' }}{{ absolutePercentage() !== null ? (absolutePercentage() | number:'1.2-2':'en-US') + '%' : '—' }}</bdi></dd></div>
        </dl>
        @if (trend().previous === 0) {
          <p class="control-note text-muted">النسبة المئوية غير متاحة لأن سعر اليوم السابق صفر.</p>
        } @else if (trend().previous === null) {
          <p class="control-note text-muted">لا تتوفر بيانات لليوم السابق لإجراء المقارنة.</p>
        }
      </div>
      @if (trend().points.length) {
        <figure class="trend-chart">
          <p class="chart-axis-title text-muted">السعر (ريال عُماني / غرام)</p>
          <div class="chart-layout" dir="ltr">
            <div class="chart-y-axis text-muted" aria-hidden="true">
              @for (tick of trend().priceTicks; track $index) {
                <span [style.top.%]="tick.y / chartHeight * 100">{{ tick.value | number:'1.3-3':'en-US' }}</span>
              }
            </div>
            <svg class="price-chart" [attr.viewBox]="'0 0 ' + chartWidth + ' ' + chartHeight" preserveAspectRatio="none" role="img" aria-labelledby="trend-chart-title trend-chart-description">
              <title id="trend-chart-title">أسعار الذهب التجريبية — {{ selectedPurity() }} قيراط</title>
              <desc id="trend-chart-description">بيانات تجريبية من {{ firstDate() }} إلى {{ lastDate() }}. يبدأ السعر عند {{ trend().points[0].value | number:'1.3-3':'en-US' }} وينتهي عند {{ trend().latest | number:'1.3-3':'en-US' }} ريال عُماني لكل غرام. {{ movement() }} مقارنة باليوم السابق. التواريخ مرتبة من اليسار إلى اليمين. القيم اليومية التفصيلية متاحة في سجل الأسعار أدناه.</desc>
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
            <div class="chart-dates text-muted">
              <span>البداية <time [attr.datetime]="trend().series[0].date">{{ firstDate() }}</time></span>
              <span>النهاية <time [attr.datetime]="trend().series.at(-1)?.date">{{ lastDate() }}</time></span>
            </div>
          </div>
          <figcaption class="control-note text-muted">التواريخ من الأقدم يساراً إلى الأحدث يميناً. <a class="history-alternative" href="#history">عرض القيم اليومية في سجل الأسعار</a>.</figcaption>
        </figure>
      } @else {
        <p class="chart-empty text-muted">لا توجد بيانات أسعار تجريبية للرسم البياني.</p>
      }
    </section>
  `,
})
export class PriceTrend {
  private readonly goldPrices = inject(GoldPriceService);
  readonly purities = this.goldPrices.purities;
  readonly selectedPurity = signal<GoldPurity>(24);
  readonly trend = computed(() => buildPriceTrend(this.goldPrices.days, this.selectedPurity()));
  readonly chartWidth = CHART_WIDTH;
  readonly chartHeight = CHART_HEIGHT;
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
    return change === null ? 'المقارنة غير متاحة' : change > 0 ? '↑ ارتفاع' : change < 0 ? '↓ انخفاض' : '↔ دون تغيير';
  });

  private dateLabel(index: number): string {
    const date = this.trend().series.at(index)?.date;
    return date ? formatSampleDate(date) : '—';
  }
}
