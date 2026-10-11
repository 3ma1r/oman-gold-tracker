import { signal } from '@angular/core';
import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { PriceTrend } from './price-trend';
import { buildPriceTrend, CHART_HEIGHT, CHART_WIDTH } from './price-trend-chart';
import { GoldPriceService, SAMPLE_LOADING_DELAY_MS } from '../services/gold-price.service';
import { SAMPLE_GOLD_PRICES } from '../data/sample-gold-prices';
import { DailyGoldPrice, DateOnly, GOLD_PURITIES } from '../models/gold-price';
import { formatNumber, formatPercentage, formatPrice, formatSampleDate } from '../services/gold-price-format';
import { LanguageService } from '../services/language.service';

// Edge-case fixtures only; the application always reads the shared sample dataset.
function seriesWith(values: readonly number[]): DailyGoldPrice[] {
  return values.map((value, index) => ({
    date: `2025-04-${String(index + 1).padStart(2, '0')}` as DateOnly,
    prices: { 18: value, 21: value, 22: value, 24: value },
  }));
}

describe('Price trend geometry and comparisons', () => {
  for (const purity of GOLD_PURITIES) {
    it(`plots every ${purity}K shared value faithfully and calculates its summaries`, () => {
      const view = buildPriceTrend(SAMPLE_GOLD_PRICES, purity);
      const values = SAMPLE_GOLD_PRICES.map(day => day.prices[purity]);
      expect(view.points.length).toBe(30);
      expect(view.latest).toBe(values[29]);
      expect(view.previous).toBe(values[28]);
      expect(view.highest).toBe(Math.max(...values));
      expect(view.lowest).toBe(Math.min(...values));
      expect(view.change).toBeCloseTo(values[29] - values[28], 10);
      expect(view.percentage).toBeCloseTo((values[29] - values[28]) / values[28] * 100, 10);
      expect(view.line.split(' ').length).toBe(30);

      const topTick = view.priceTicks[0];
      const bottomTick = view.priceTicks[4];
      view.points.forEach((point, index) => {
        expect(point.day).toBe(SAMPLE_GOLD_PRICES[index]);
        expect(point.value).toBe(values[index]);
        expect(Number.isFinite(point.x) && Number.isFinite(point.y)).toBeTrue();
        const plottedValue = bottomTick.value + (bottomTick.y - point.y)
          / (bottomTick.y - topTick.y) * (topTick.value - bottomTick.value);
        expect(plottedValue).toBeCloseTo(values[index], 10);
        if (index > 0) { expect(point.x).toBeGreaterThan(view.points[index - 1].x); }
      });
    });
  }

  it('sorts dates chronologically without mutating the supplied records', () => {
    const reversed = [...SAMPLE_GOLD_PRICES].reverse();
    const originalOrder = reversed.map(day => day.date);
    const view = buildPriceTrend(reversed, 24);
    expect(view.points[0].day.date).toBe('2025-03-29');
    expect(view.points[29].day.date).toBe('2025-04-27');
    expect(view.latest).toBe(51.200);
    expect(reversed.map(day => day.date)).toEqual(originalOrder);
    expect(view.points[0].x).toBeLessThan(view.points[29].x);
  });

  it('handles an empty series without producing coordinates or numeric summaries', () => {
    const view = buildPriceTrend([], 24);
    expect(view.points).toEqual([]);
    expect(view.priceTicks).toEqual([]);
    expect(view.line).toBe('');
    expect(view.area).toBe('');
    expect(view.latest).toBeNull();
    expect(view.previous).toBeNull();
    expect(view.highest).toBeNull();
    expect(view.lowest).toBeNull();
    expect(view.change).toBeNull();
    expect(view.percentage).toBeNull();
  });

  it('centres a single point and has no previous-day comparison or area polygon', () => {
    const view = buildPriceTrend(seriesWith([50]), 24);
    expect(view.latest).toBe(50);
    expect(view.highest).toBe(50);
    expect(view.lowest).toBe(50);
    expect(view.points[0].x).toBe(CHART_WIDTH / 2);
    expect(view.points[0].y).toBeCloseTo(CHART_HEIGHT / 2, 10);
    expect(view.previous).toBeNull();
    expect(view.change).toBeNull();
    expect(view.percentage).toBeNull();
    expect(view.area).toBe('');
  });

  for (const value of [0, 0.001, 50]) {
    it(`keeps a constant ${value} series finite with a horizontal line and valid axis`, () => {
      const view = buildPriceTrend(seriesWith([value, value, value]), 24);
      expect(view.highest).toBe(value);
      expect(view.lowest).toBe(value);
      expect(view.change).toBe(0);
      expect(view.percentage).toBe(value === 0 ? null : 0);
      for (const point of view.points) {
        expect(Number.isFinite(point.x) && Number.isFinite(point.y)).toBeTrue();
        expect(point.x).toBeGreaterThanOrEqual(0);
        expect(point.x).toBeLessThanOrEqual(CHART_WIDTH);
        expect(point.y).toBeCloseTo(CHART_HEIGHT / 2, 10);
      }
      expect(view.priceTicks.every(tick => Number.isFinite(tick.value))).toBeTrue();
      expect(view.line + view.area).not.toMatch(/NaN|Infinity/);
    });
  }

  it('calculates positive, negative and unchanged previous-day comparisons', () => {
    const up = buildPriceTrend(seriesWith([10, 12]), 24);
    expect(up.change).toBe(2);
    expect(up.percentage).toBe(20);
    const down = buildPriceTrend(seriesWith([12, 9]), 24);
    expect(down.change).toBe(-3);
    expect(down.percentage).toBe(-25);
    const unchanged = buildPriceTrend(seriesWith([9, 9]), 24);
    expect(unchanged.change).toBe(0);
    expect(unchanged.percentage).toBe(0);
  });

  it('keeps the absolute change but omits the percentage when the previous price is zero', () => {
    const view = buildPriceTrend(seriesWith([0, 3]), 24);
    expect(view.previous).toBe(0);
    expect(view.change).toBe(3);
    expect(view.percentage).toBeNull();
    expect(view.line + view.area).not.toMatch(/NaN|Infinity/);
  });
});

describe('PriceTrend', () => {
  beforeEach(async () => {
    spyOn(Storage.prototype, 'getItem').and.returnValue(null);
    await TestBed.configureTestingModule({ imports: [PriceTrend] }).compileComponents();
  });

  function render(days?: readonly DailyGoldPrice[]) {
    if (days) {
      TestBed.overrideProvider(GoldPriceService, { useValue: { days, purities: GOLD_PURITIES, loading: signal(false) } });
    }
    fakeAsync(() => { TestBed.inject(GoldPriceService); tick(SAMPLE_LOADING_DELAY_MS); })();
    const fixture = TestBed.createComponent(PriceTrend);
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance, element: fixture.nativeElement as HTMLElement };
  }

  it('defaults to 24K and exposes four native buttons with one pressed selection', () => {
    const { element, component } = render();
    expect(component.selectedPurity()).toBe(24);
    expect(element.querySelectorAll('.purity-tab').length).toBe(4);
    expect(element.querySelectorAll('button[aria-pressed="true"]').length).toBe(1);
    expect(element.querySelector('button[aria-pressed="true"]')?.textContent).toContain(formatNumber(24));
  });

  for (const purity of GOLD_PURITIES) {
    it(`switches to ${purity}K and updates the line, summaries and comparison`, () => {
      const { fixture, element, component } = render();
      element.querySelector<HTMLButtonElement>(`button[data-purity="${purity}"]`)!.click();
      fixture.detectChanges();
      const values = SAMPLE_GOLD_PRICES.map(day => day.prices[purity]);
      const stats = element.querySelectorAll('.trend-stats dd');
      expect(component.selectedPurity()).toBe(purity);
      expect(stats[0].textContent?.trim()).toBe(formatPrice(values[29]));
      expect(stats[1].textContent?.trim()).toBe(formatPrice(Math.max(...values)));
      expect(stats[2].textContent?.trim()).toBe(formatPrice(Math.min(...values)));
      expect(element.querySelector('polyline')?.getAttribute('points')).toBe(component.trend().line);
      expect(element.querySelector('button[aria-pressed="true"]')?.getAttribute('data-purity')).toBe(String(purity));
      expect(element.querySelectorAll('button[aria-pressed="true"]').length).toBe(1);
      expect(element.querySelector('.comparison-change')?.textContent).toContain('↑ ارتفاع');
      expect(element.querySelector('.comparison-change')?.textContent).toContain('+');
      expect(element.querySelector('.comparison-percentage')?.textContent).toContain('٪');
      const comparison = element.querySelectorAll('.comparison-grid dd');
      expect(comparison[0].textContent).toContain(formatPrice(values[29]));
      expect(comparison[1].textContent).toContain(formatPrice(values[28]));
    });
  }

  it('provides an accessible title, date range, left-to-right endpoints and history alternative', () => {
    const { element } = render();
    const svg = element.querySelector('.price-chart')!;
    expect(svg.getAttribute('role')).toBe('img');
    expect(svg.getAttribute('aria-labelledby')).toBe('trend-chart-title trend-chart-description');
    expect(svg.querySelector('title')?.textContent).toContain(`${formatNumber(24)} قيراط`);
    expect(svg.querySelector('desc')?.textContent).toContain(formatSampleDate('2025-03-29'));
    expect(svg.querySelector('desc')?.textContent).toContain(formatSampleDate('2025-04-27'));
    expect(svg.querySelector('desc')?.textContent).toContain('من اليسار إلى اليمين');
    expect(element.querySelector('.chart-layout')?.getAttribute('dir')).toBe('ltr');
    const endpoints = element.querySelectorAll<HTMLTimeElement>('.chart-dates time');
    expect(endpoints[0].dateTime).toBe('2025-03-29');
    expect(endpoints[1].dateTime).toBe('2025-04-27');
    expect(element.querySelector('.history-alternative')?.getAttribute('href')).toBe('#history');
    expect(element.querySelectorAll('.chart-y-axis span').length).toBe(5);
  });

  it('shows Arabic downward text and signed amounts without relying on colour', () => {
    const { element } = render(seriesWith([12, 9]));
    expect(element.querySelector('.comparison-change')?.textContent).toContain('↓ انخفاض');
    expect(element.querySelector('.comparison-change')?.textContent).toContain(`−${formatPrice(3)}`);
    expect(element.querySelector('.comparison-percentage')?.textContent).toContain(`−${formatPercentage(25)}`);
  });

  it('shows unchanged movement explicitly', () => {
    const { element } = render(seriesWith([12, 12]));
    expect(element.querySelector('.comparison-change')?.textContent).toContain('↔ دون تغيير');
    expect(element.querySelector('.comparison-percentage')?.textContent).toContain(formatPercentage(0));
  });

  it('explains an unavailable percentage when the previous price is zero', () => {
    const { element } = render(seriesWith([0, 3]));
    expect(element.querySelector('.comparison-percentage')?.textContent).toBe('—');
    expect(element.querySelector('.trend-comparison')?.textContent).toContain('سعر اليوم السابق صفر');
    expect(element.textContent).not.toMatch(/NaN|Infinity/);
  });

  it('renders an empty state rather than an invalid SVG for an empty series', () => {
    const { element } = render([]);
    expect(element.querySelector('.price-chart')).toBeNull();
    expect(element.querySelector('.chart-empty')?.textContent).toContain('لا توجد بيانات');
    element.querySelectorAll('.trend-stats dd').forEach(stat => expect(stat.textContent).toBe('—'));
    expect(element.textContent).not.toMatch(/NaN|Infinity/);
  });

  it('renders one point with a marker and explains the missing comparison', () => {
    const { element } = render(seriesWith([50]));
    expect(element.querySelector('.chart-point')).not.toBeNull();
    expect(element.querySelector('.chart-area')).toBeNull();
    expect(element.querySelector('polyline')?.getAttribute('points')?.split(' ').length).toBe(1);
    expect(element.querySelector('.trend-comparison')?.textContent).toContain('لا تتوفر بيانات لليوم السابق');
  });

  it('selects the nearest date at different SVG scales and clamps endpoints', () => {
    const { fixture, component, element } = render();
    const svg = element.querySelector('svg.price-chart')!;
    const rect = spyOn(svg, 'getBoundingClientRect');
    for (const width of [180, 340, 900]) {
      rect.and.returnValue(new DOMRect(30, 0, width, 210));
      for (const index of [0, 8, 15, 29]) {
        const x = 30 + component.trend().points[index].x / CHART_WIDTH * width;
        svg.dispatchEvent(new MouseEvent('click', { clientX: x }));
        fixture.detectChanges();
        expect(component.selectedDate()).toBe(SAMPLE_GOLD_PRICES[index].date);
        expect(element.querySelector('.chart-tooltip time')?.getAttribute('datetime')).toBe(SAMPLE_GOLD_PRICES[index].date);
        expect(element.querySelector('.chart-tooltip')?.textContent).toContain(formatPrice(SAMPLE_GOLD_PRICES[index].prices[24]));
      }
      svg.dispatchEvent(new MouseEvent('click', { clientX: -50 }));
      expect(component.selectedDate()).toBe(SAMPLE_GOLD_PRICES[0].date);
      svg.dispatchEvent(new MouseEvent('click', { clientX: width + 100 }));
      expect(component.selectedDate()).toBe(SAMPLE_GOLD_PRICES[29].date);
    }
  });

  it('keeps hover previews temporary, distinct and silent, including after keyboard selection', () => {
    const { fixture, component, element } = render();
    const svg = element.querySelector('svg.price-chart')!;
    spyOn(svg, 'getBoundingClientRect').and.returnValue(new DOMRect(0, 0, 900, 240));
    const control = element.querySelector('.chart-plot')!;
    control.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', cancelable: true }));
    fixture.detectChanges();
    const announcement = element.querySelector('.chart-selection-announcement')!.textContent;
    svg.dispatchEvent(new PointerEvent('pointermove', { clientX: 888, pointerType: 'mouse' }));
    fixture.detectChanges();
    expect(component.selectedDate()).toBe(SAMPLE_GOLD_PRICES[0].date);
    expect(component.tooltipPoint()?.day.date).toBe(SAMPLE_GOLD_PRICES[29].date);
    expect(element.querySelector('.tooltip-state')?.textContent).toContain('معاينة');
    expect(element.querySelector('.chart-marker-preview')).not.toBeNull();
    expect(element.querySelector('.chart-marker-selected')).not.toBeNull();
    expect(element.querySelector('.chart-selection-announcement')!.textContent).toBe(announcement);
    control.dispatchEvent(new PointerEvent('pointerleave'));
    fixture.detectChanges();
    expect(component.tooltipPoint()?.day.date).toBe(SAMPLE_GOLD_PRICES[0].date);
    expect(element.querySelector('.chart-marker-preview')).toBeNull();
    svg.dispatchEvent(new PointerEvent('pointermove', { clientX: 888, pointerType: 'touch' }));
    expect(component.hoverDate()).toBeNull();
  });

  it('supports a single keyboard control, chronological arrows, endpoints and clearing in both directions', () => {
    const { fixture, component, element } = render();
    const language = TestBed.inject(LanguageService);
    for (const lang of ['ar', 'en'] as const) {
      language.setLanguage(lang);
      fixture.detectChanges();
      const control = element.querySelector('.chart-plot')!;
      expect(element.querySelectorAll('.chart-plot[tabindex="0"]').length).toBe(1);
      const key = (value: string) => {
        const event = new KeyboardEvent('keydown', { key: value, cancelable: true });
        control.dispatchEvent(event); fixture.detectChanges();
        expect(event.defaultPrevented).toBeTrue();
      };
      key('Home'); expect(component.selectedDate()).toBe(SAMPLE_GOLD_PRICES[0].date);
      key('ArrowLeft'); expect(component.selectedDate()).toBe(SAMPLE_GOLD_PRICES[0].date);
      key('ArrowRight'); expect(component.selectedDate()).toBe(SAMPLE_GOLD_PRICES[1].date);
      key('ArrowUp'); expect(component.selectedDate()).toBe(SAMPLE_GOLD_PRICES[2].date);
      key('ArrowDown'); expect(component.selectedDate()).toBe(SAMPLE_GOLD_PRICES[1].date);
      key('End'); key('ArrowRight'); expect(component.selectedDate()).toBe(SAMPLE_GOLD_PRICES[29].date);
      expect(element.querySelector('.chart-selection-announcement')?.textContent).toContain(language.price(51.2));
      key('Escape');
      expect(component.selectedDate()).toBeNull();
      expect(element.querySelector('.chart-tooltip')).toBeNull();
      expect(element.querySelector('.chart-selection-announcement')?.textContent).toBe(language.t('chartSelectionCleared'));
    }
  });

  it('preserves the selected date and translates its updated price when purity/language changes', () => {
    const { fixture, component, element } = render();
    element.querySelector('.chart-plot')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'End' }));
    for (const purity of GOLD_PURITIES) {
      element.querySelector<HTMLButtonElement>(`[data-purity="${purity}"]`)!.click();
      fixture.detectChanges();
      expect(component.selectedDate()).toBe(SAMPLE_GOLD_PRICES[29].date);
      expect(component.tooltipPoint()?.value).toBe(SAMPLE_GOLD_PRICES[29].prices[purity]);
    }
    const lang = TestBed.inject(LanguageService);
    lang.setLanguage('en'); fixture.detectChanges();
    expect(element.querySelector('.tooltip-state')?.textContent).toBe('Selected day');
    expect(element.querySelector('.chart-selection-announcement')?.textContent).toContain('24K, 51.200 OMR / gram');
  });

  for (const values of [[], [50], [50, 50, 50]]) {
    it(`handles selection safely for ${values.length} edge-case records`, () => {
      const { fixture, component, element } = render(seriesWith(values));
      for (const key of ['Home', 'ArrowRight', 'End', 'ArrowLeft']) {
        component.chartKeydown(new KeyboardEvent('keydown', { key }));
        fixture.detectChanges();
        expect(element.innerHTML).not.toMatch(/NaN|Infinity/);
      }
      const svg = element.querySelector('svg.price-chart');
      if (svg) {
        spyOn(svg, 'getBoundingClientRect').and.returnValue(new DOMRect(0, 0, 200, 210));
        component.selectPoint(new MouseEvent('click', { clientX: 199 }), svg);
        expect(component.selectedDate()).toBe(component.trend().series.at(-1)!.date);
      } else expect(component.selectedDate()).toBeNull();
    });
  }
});
