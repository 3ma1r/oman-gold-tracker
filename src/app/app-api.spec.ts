import { HttpTestingController } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { App } from './app';
import { GoldCalculator } from './components/gold-calculator';
import { PriceTrend } from './components/price-trend';
import { TRANSLATIONS } from './data/translations';
import { DailyGoldPrice, DateOnly, GOLD_PURITIES } from './models/gold-price';
import { GoldPriceService } from './services/gold-price.service';
import { LanguageService } from './services/language.service';
import { ThemeService } from './services/theme.service';
import { flushGoldPriceResponses, goldPriceResponses, provideGoldPriceHttpTesting, TEST_API_BASE_URL } from './testing/gold-price-http';

// Deliberately unlike the old frontend fixture, including non-derived purity
// values: every consumer must display the response, not recalculate local data.
const API_DAYS: readonly DailyGoldPrice[] = Array.from({ length: 30 }, (_, index) => ({
  date: `2032-01-${String(index + 1).padStart(2, '0')}` as DateOnly,
  prices: { 18: 31.123 + index, 21: 41.234 + index, 22: 51.345 + index, 24: 61.456 + index },
}));

describe('Dashboard API integration', () => {
  let fixture: ComponentFixture<App>;
  let element: HTMLElement;
  let http: HttpTestingController;
  let original: { lang: string; dir: string; title: string; className: string; scheme: string };

  beforeEach(async () => {
    original = {
      lang: document.documentElement.lang, dir: document.documentElement.dir, title: document.title,
      className: document.documentElement.className, scheme: document.documentElement.style.colorScheme,
    };
    spyOn(Storage.prototype, 'getItem').and.returnValue(null);
    spyOn(Storage.prototype, 'setItem');
    await TestBed.configureTestingModule({ imports: [App], providers: provideGoldPriceHttpTesting() }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(App);
    element = fixture.nativeElement;
    fixture.detectChanges();
  });

  afterEach(() => {
    http.verify();
    document.documentElement.lang = original.lang;
    document.documentElement.dir = original.dir;
    document.title = original.title;
    document.documentElement.className = original.className;
    document.documentElement.style.colorScheme = original.scheme;
  });

  it('uses different API dates and numeric prices consistently in every section and both languages', () => {
    expect(element.querySelectorAll('.skeleton-price').length).toBe(4);
    expect(element.querySelector('app-hero time')?.getAttribute('datetime')).toBeNull();
    flushGoldPriceResponses(API_DAYS);
    fixture.detectChanges();
    const prices = TestBed.inject(GoldPriceService);
    const lang = TestBed.inject(LanguageService);
    const chart = fixture.debugElement.query(By.directive(PriceTrend)).componentInstance as PriceTrend;
    const calculator = fixture.debugElement.query(By.directive(GoldCalculator)).componentInstance as GoldCalculator;
    const latest = API_DAYS[29];
    const input = element.querySelector<HTMLInputElement>('#gold-weight')!;
    input.value = '2.34567'; input.dispatchEvent(new Event('input', { bubbles: true }));

    for (const language of ['en', 'ar'] as const) {
      lang.setLanguage(language);
      for (const purity of GOLD_PURITIES) {
        chart.selectedPurity.set(purity);
        calculator.changePurity(String(purity));
        element.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        chart.chartKeydown(new KeyboardEvent('keydown', { key: 'End', cancelable: true }));
        fixture.detectChanges();
        expect(prices.sampleDate).toBe(latest.date);
        expect(element.querySelector('app-hero time')?.getAttribute('datetime')).toBe(latest.date);
        expect(element.querySelector('app-hero time')?.textContent).toBe(lang.date(latest.date));
        expect(element.querySelector('.price-data-note time')?.textContent).toBe(lang.date(latest.date));
        expect(element.querySelector('#calculator-note time')?.textContent).toBe(lang.date(latest.date));
        expect(element.querySelector(`#price-${purity}`)?.closest('article')?.querySelector('.price-value')?.textContent?.trim()).toBe(lang.price(latest.prices[purity]));
        const rows = element.querySelectorAll('tbody tr');
        expect(rows.length).toBe(30);
        expect(rows[0].querySelector('time')?.getAttribute('datetime')).toBe(latest.date);
        expect(rows[29].querySelector('time')?.getAttribute('datetime')).toBe(API_DAYS[0].date);
        const column = [24, 22, 21, 18].indexOf(purity);
        expect(rows[0].querySelectorAll('td')[column].textContent?.trim()).toBe(lang.price(latest.prices[purity]));
        expect(calculator.result?.pricePerGram).toBe(latest.prices[purity]);
        expect(calculator.result?.total).toBe(2.34567 * latest.prices[purity]);
        expect(element.querySelector('.result-value')?.textContent).toBe(lang.price(2.34567 * latest.prices[purity]));
        expect(chart.trend().series.map(day => day.date)).toEqual(API_DAYS.map(day => day.date));
        expect(chart.trend().latest).toBe(latest.prices[purity]);
        expect(chart.trend().highest).toBe(latest.prices[purity]);
        expect(chart.trend().lowest).toBe(API_DAYS[0].prices[purity]);
        expect(chart.trend().previous).toBe(API_DAYS[28].prices[purity]);
        expect(chart.trend().change).toBeCloseTo(1, 10);
        expect(chart.trend().percentage).toBeCloseTo(100 / API_DAYS[28].prices[purity], 10);
        expect(element.querySelector('.trend-stats dd > bdi')?.textContent).toBe(lang.price(latest.prices[purity]));
        expect(element.querySelector('.chart-tooltip time')?.getAttribute('datetime')).toBe(latest.date);
        expect(element.querySelector('.chart-tooltip')?.textContent).toContain(lang.price(latest.prices[purity]));
        expect(element.querySelector('.chart-tooltip')?.textContent).toContain(lang.purity(purity));
        expect(element.querySelector('#trends svg desc')?.textContent).toContain(lang.date(API_DAYS[0].date));
        expect(element.querySelector('#trends svg desc')?.textContent).toContain(lang.date(latest.date));
        expect(element.querySelector('.chart-selection-announcement')?.textContent).toContain(lang.price(latest.prices[purity]));
      }
    }
    const result = calculator.result;
    for (let index = 0; index < 4; index++) {
      lang.toggle(); TestBed.inject(ThemeService).toggle(); fixture.detectChanges();
      expect(calculator.result).toBe(result);
      expect(input.value).toBe('2.34567');
      expect(chart.selectedPurity()).toBe(24); expect(chart.selectedDate()).toBe(latest.date);
      expect(element.querySelector('.skeleton')).toBeNull();
    }
    http.expectNone(() => true);
  });

  for (const failure of ['http', 'network', 'inconsistent'] as const) {
    it(`handles ${failure} failure without partial UI, stale prices or an enabled calculator`, () => {
      const latest = http.expectOne(`${TEST_API_BASE_URL}/api/gold-prices`);
      const history = http.expectOne(`${TEST_API_BASE_URL}/api/gold-prices/history`);
      const replies = goldPriceResponses(API_DAYS);
      history.flush(replies.history);
      fixture.detectChanges();
      expect(element.querySelector('.skeleton-price')).not.toBeNull();
      expect(element.querySelector('app-hero time')?.getAttribute('datetime')).toBeNull();
      if (failure === 'http') latest.flush({}, { status: 503, statusText: 'Unavailable' });
      else if (failure === 'network') latest.error(new ProgressEvent('error'));
      else latest.flush({ ...replies.latest, date: '2032-01-31' });
      const lang = TestBed.inject(LanguageService);
      for (const language of ['en', 'ar'] as const) {
        lang.setLanguage(language); fixture.detectChanges();
        const message = TRANSLATIONS[language][failure === 'http' ? 'pricesServerError' : failure === 'network' ? 'pricesConnectionError' : 'pricesInvalidError'];
        expect(element.querySelector('#prices-error-description')?.textContent).toBe(message);
        expect(element.querySelector('.page-sections > [role="status"]')?.textContent).toContain(message);
        expect(element.querySelector('.price-error-panel')?.getAttribute('role')).toBe('region');
        expect(element.querySelector('[aria-busy="true"], .skeleton, .price-value, .price-chart')).toBeNull();
        expect(element.querySelector('tbody time')).toBeNull();
        expect(element.querySelector('app-hero time')?.getAttribute('datetime')).toBeNull();
        expect(element.querySelector<HTMLButtonElement>('#calculator .calculate-button')?.disabled).toBeTrue();
        expect(TestBed.inject(GoldPriceService).days).toEqual([]);
      }
      http.expectNone(() => true);
    });
  }
});
