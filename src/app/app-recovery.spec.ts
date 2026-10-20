import { HttpTestingController } from '@angular/common/http/testing';
import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { App } from './app';
import { API_BASE_URL } from './api.config';
import { GoldCalculator } from './components/gold-calculator';
import { PriceTrend } from './components/price-trend';
import { TRANSLATIONS, TranslationKey } from './data/translations';
import { GoldPriceService, PRICE_LOAD_TIMEOUT_MS, PriceLoadFailure } from './services/gold-price.service';
import { LanguageService } from './services/language.service';
import { ThemeService } from './services/theme.service';
import { flushGoldPriceResponses, goldPriceResponses, provideGoldPriceHttpTesting, TEST_API_BASE_URL } from './testing/gold-price-http';

describe('Dashboard error recovery', () => {
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
  });
  afterEach(() => {
    http.verify();
    document.documentElement.lang = original.lang; document.documentElement.dir = original.dir;
    document.title = original.title; document.documentElement.className = original.className;
    document.documentElement.style.colorScheme = original.scheme;
  });
  function render() {
    fixture = TestBed.createComponent(App); element = fixture.nativeElement;
    http = TestBed.inject(HttpTestingController); fixture.detectChanges();
  }
  function requests() {
    return {
      latest: http.expectOne(`${TEST_API_BASE_URL}/api/gold-prices`),
      history: http.expectOne(`${TEST_API_BASE_URL}/api/gold-prices/history`),
    };
  }
  function networkFailure() { requests().latest.error(new ProgressEvent('error')); fixture.detectChanges(); }
  const cases: readonly { failure: PriceLoadFailure; message: TranslationKey }[] = [
    { failure: 'connection', message: 'pricesConnectionError' },
    { failure: 'server', message: 'pricesServerError' },
    { failure: 'invalidResponse', message: 'pricesInvalidError' },
    { failure: 'configuration', message: 'pricesConfigurationError' },
    { failure: 'timeout', message: 'pricesTimeoutError' },
  ];
  for (const { failure, message } of cases) {
    it(`shows a localized ${failure} panel with a single failure announcement and no raw details`, fakeAsync(() => {
      if (failure === 'configuration') TestBed.overrideProvider(API_BASE_URL, { useValue: null });
      render();
      if (failure !== 'configuration') {
        const pair = requests();
        if (failure === 'connection') pair.latest.error(new ProgressEvent('error'));
        else if (failure === 'timeout') tick(PRICE_LOAD_TIMEOUT_MS);
        else if (failure === 'server') pair.latest.flush({ detail: 'DO NOT DISPLAY stack trace or credentials' }, { status: 500, statusText: 'Internal Error' });
        else {
          const replies = goldPriceResponses(); pair.latest.flush(replies.latest);
          pair.history.flush({ ...replies.history, endDate: '2040-01-01' });
        }
      }
      for (const language of ['ar', 'en'] as const) {
        TestBed.inject(LanguageService).setLanguage(language);
        for (const theme of ['light', 'dark'] as const) {
          TestBed.inject(ThemeService).setTheme(theme); fixture.detectChanges();
          const text = TRANSLATIONS[language];
          const panel = element.querySelector('.price-error-panel')!;
          expect(panel.querySelector('h2')?.textContent).toBe(text.pricesErrorTitle);
          expect(panel.querySelector('p')?.textContent).toBe(text[message]);
          expect(panel.getAttribute('role')).toBe('region');
          expect(panel.getAttribute('aria-live')).toBeNull();
          expect(element.querySelector('.page-sections > [role="status"]')?.textContent).toBe(`${text.pricesErrorTitle}. ${text[message]}`);
          const button = panel.querySelector<HTMLButtonElement>('button')!;
          expect(button.disabled).toBeFalse(); expect(button.type).toBe('button'); expect(button.tabIndex).toBe(0);
          expect(button.textContent).toBe(text.pricesRetry);
          expect(button.getAttribute('aria-describedby')).toBe('prices-error-description');
          expect(element.textContent).not.toMatch(/DO NOT DISPLAY|stack trace|credentials|localhost|HttpErrorResponse|TimeoutError/);
          expect(element.querySelector('[aria-busy="true"], .skeleton, tbody time, .price-value')).toBeNull();
          expect(element.querySelector<HTMLButtonElement>('.calculate-button:not(.retry-button)')?.disabled).toBeTrue();
          element.querySelectorAll<HTMLButtonElement>('.purity-tab').forEach(tab => expect(tab.disabled).toBeTrue());
          expect(element.querySelector('.trend-comparison')?.getAttribute('aria-live')).toBeNull();
          expect(element.querySelector('.calculator-result')?.getAttribute('aria-live')).toBe('off');
          expect(element.querySelector('.chart-selection-announcement')?.textContent).toBe('');
        }
      }
      tick(PRICE_LOAD_TIMEOUT_MS * 2); http.expectNone(() => true);
    }));
  }

  it('disables the same Retry button while both requests load, handles another failure, then recovers', () => {
    render(); networkFailure();
    const button = element.querySelector<HTMLButtonElement>('.retry-button')!;
    button.click(); button.click(); fixture.detectChanges();
    const second = requests();
    expect(button.disabled).toBeTrue(); expect(element.querySelector('.retry-button')).toBe(button);
    expect(element.querySelector('.page-sections > [role="status"]')?.textContent).toBe(TRANSLATIONS.ar.sampleLoading);
    expect(element.querySelectorAll('.skeleton-price').length).toBe(4);
    expect(element.querySelectorAll('tbody tr[aria-hidden="true"]').length).toBe(30);
    button.click(); TestBed.inject(GoldPriceService).retry(); http.expectNone(() => true);
    second.latest.flush(goldPriceResponses().latest); fixture.detectChanges(); expect(button.disabled).toBeTrue();
    second.history.flush({}, { status: 503, statusText: 'Unavailable' }); fixture.detectChanges();
    expect(button.disabled).toBeFalse(); expect(element.querySelector('#prices-error-description')?.textContent).toBe(TRANSLATIONS.ar.pricesServerError);
    button.click(); fixture.detectChanges();
    flushGoldPriceResponses(); fixture.detectChanges();
    expect(element.querySelector('.price-error-panel, .skeleton, [aria-busy="true"]')).toBeNull();
    expect(element.querySelector('.page-sections > [role="status"]')?.textContent).toBe(TRANSLATIONS.ar.sampleReady);
    expect(element.querySelectorAll('tbody time').length).toBe(30);
    expect(element.querySelector<HTMLButtonElement>('.calculate-button')?.disabled).toBeFalse();
    expect(element.querySelector('.result-value')?.textContent).toBe('—');
    http.expectNone(() => true);
  });

  it('preserves weight, purity and preferences but clears stale results, errors and chart selections per load', () => {
    render(); flushGoldPriceResponses(); fixture.detectChanges();
    const service = TestBed.inject(GoldPriceService);
    const calculator = fixture.debugElement.query(By.directive(GoldCalculator)).componentInstance as GoldCalculator;
    const chart = fixture.debugElement.query(By.directive(PriceTrend)).componentInstance as PriceTrend;
    const input = element.querySelector<HTMLInputElement>('#gold-weight')!;
    const submit = () => { element.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); fixture.detectChanges(); };
    const choose = () => {
      calculator.changePurity('21'); chart.selectedPurity.set(18);
      chart.chartKeydown(new KeyboardEvent('keydown', { key: 'End', cancelable: true }));
      chart.hoverDate.set(service.days[0].date);
    };
    input.value = '2.5'; input.dispatchEvent(new Event('input', { bubbles: true })); choose(); submit();
    expect(calculator.result).not.toBeNull(); expect(chart.selectedDate()).not.toBeNull();
    service.retry(); fixture.detectChanges();
    expect(calculator.result).toBeNull(); expect(calculator.error).toBe('');
    expect(chart.selectedDate()).toBeNull(); expect(chart.hoverDate()).toBeNull(); expect(chart.selectionAnnouncement()).toBe('');
    expect(input.value).toBe('2.5'); expect(calculator.selectedPurity).toBe(21); expect(chart.selectedPurity()).toBe(18);
    networkFailure();
    TestBed.inject(LanguageService).setLanguage('en'); TestBed.inject(ThemeService).setTheme('dark'); fixture.detectChanges();
    element.querySelector<HTMLButtonElement>('.retry-button')!.click(); fixture.detectChanges();
    const pending = requests();
    element.querySelector<HTMLButtonElement>('.language-button')!.click(); element.querySelector<HTMLButtonElement>('.theme-button')!.click(); fixture.detectChanges();
    expect(input.value).toBe('2.5'); expect(chart.selectedPurity()).toBe(18);
    expect(calculator.result).toBeNull(); expect(element.querySelector<HTMLButtonElement>('.calculate-button:not(.retry-button)')?.disabled).toBeTrue();
    http.expectNone(() => true);
    pending.history.flush(goldPriceResponses().history); pending.latest.flush(goldPriceResponses().latest); fixture.detectChanges();
    expect(calculator.result).toBeNull(); expect(chart.selectedDate()).toBeNull();
    expect(calculator.selectedPurity).toBe(21); expect(chart.selectedPurity()).toBe(18); submit();
    expect(calculator.result?.total).toBe(2.5 * service.latest!.prices[21]);
    input.value = '0'; input.dispatchEvent(new Event('input', { bubbles: true })); submit();
    expect(calculator.error).not.toBe('');
    service.retry(); fixture.detectChanges(); expect(calculator.error).toBe(''); expect(input.value).toBe('0');
    flushGoldPriceResponses(); fixture.detectChanges(); http.expectNone(() => true);
  });
});
