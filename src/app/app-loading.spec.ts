import { signal } from '@angular/core';
import { HttpTestingController } from '@angular/common/http/testing';
import { fakeAsync, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { App } from './app';
import { GoldCalculator } from './components/gold-calculator';
import { PriceTrend } from './components/price-trend';
import { TRANSLATIONS } from './data/translations';
import { GOLD_PURITIES } from './models/gold-price';
import { GoldPriceService } from './services/gold-price.service';
import { flushGoldPriceResponses, goldPriceResponses, provideGoldPriceHttpTesting, TEST_API_BASE_URL } from './testing/gold-price-http';
import { LanguageService } from './services/language.service';
import { ThemeService } from './services/theme.service';

describe('Dashboard loading and motion', () => {
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
    TestBed.inject(HttpTestingController).verify();
    document.documentElement.lang = original.lang;
    document.documentElement.dir = original.dir;
    document.title = original.title;
    document.documentElement.className = original.className;
    document.documentElement.style.colorScheme = original.scheme;
  });

  function render() {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    return { fixture, element: fixture.nativeElement as HTMLElement };
  }

  function appCss(): string {
    return Array.from(document.styleSheets)
      .map(sheet => Array.from(sheet.cssRules).map(rule => rule.cssText).join('\n'))
      .filter(css => css.includes('.page-shell')).join('\n');
  }

  it('shows decorative skeletons and busy regions, then all shared prices together', fakeAsync(() => {
    const { fixture, element } = render();
    const prices = TestBed.inject(GoldPriceService);
    const status = element.querySelector('.page-sections > [role="status"]')!;
    expect(status.textContent).toBe(TRANSLATIONS.ar.sampleLoading);
    expect(element.querySelectorAll('.skeleton-price').length).toBe(4);
    expect(element.querySelectorAll('.skeleton-stat').length).toBe(3);
    expect(element.querySelectorAll('tbody tr[aria-hidden="true"]').length).toBe(30);
    expect(element.querySelector('.chart-skeleton')).not.toBeNull();
    expect(element.querySelector('svg.price-chart')).toBeNull();
    expect(element.querySelectorAll('[aria-busy="true"]').length).toBe(4);
    element.querySelectorAll('.skeleton').forEach(node => expect(node.getAttribute('aria-hidden')).toBe('true'));
    expect(element.querySelector('.chart-empty, .prices-empty')).toBeNull();
    const http = TestBed.inject(HttpTestingController);
    const latest = http.expectOne(`${TEST_API_BASE_URL}/api/gold-prices`);
    const history = http.expectOne(`${TEST_API_BASE_URL}/api/gold-prices/history`);
    latest.flush(goldPriceResponses().latest);
    fixture.detectChanges();
    expect(element.querySelector('.skeleton-price')).not.toBeNull();
    history.flush(goldPriceResponses().history);
    fixture.detectChanges();
    expect(element.querySelector('.skeleton')).toBeNull();
    expect(element.querySelector('[aria-busy="true"]')).toBeNull();
    expect(status.textContent).toBe(TRANSLATIONS.ar.sampleReady);
    expect(element.querySelectorAll('tbody tr').length).toBe(30);
    expect(element.querySelector('polyline')?.getAttribute('points')?.split(' ').length).toBe(30);
    expect(element.querySelector('.price-value')?.textContent).toBe(TestBed.inject(LanguageService).price(prices.latest!.prices[24]));
  }));

  it('guards button and Enter-style submissions until ready and preserves entered inputs', fakeAsync(() => {
    const { fixture, element } = render();
    const calculator = fixture.debugElement.query(By.directive(GoldCalculator)).componentInstance as GoldCalculator;
    const input = element.querySelector<HTMLInputElement>('#gold-weight')!;
    const select = element.querySelector<HTMLSelectElement>('#gold-purity')!;
    const button = element.querySelector<HTMLButtonElement>('.calculate-button')!;
    input.value = '2.5';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    select.value = '21';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    const submit = () => {
      const event = new Event('submit', { bubbles: true, cancelable: true });
      element.querySelector('form')!.dispatchEvent(event);
      fixture.detectChanges();
      expect(event.defaultPrevented).toBeTrue();
    };
    expect(button.disabled).toBeTrue();
    expect(element.querySelector('#calculator-availability')?.textContent).toBe(TRANSLATIONS.ar.calculatorLoading);
    button.click();
    submit();
    expect(calculator.result).toBeNull();
    expect(calculator.error).toBe('');
    expect(element.querySelector('.result-value')?.textContent).toBe('—');
    flushGoldPriceResponses();
    fixture.detectChanges();
    expect(button.disabled).toBeFalse();
    expect(input.value).toBe('2.5');
    expect(select.value).toBe('21');
    expect(element.querySelector('#calculator-availability')?.textContent).toBe('');
    expect(calculator.result).toBeNull();
    submit();
    expect(calculator.result?.total).toBe(2.5 * TestBed.inject(GoldPriceService).latest!.prices[21]);
    expect(element.querySelector('.result-value')?.classList.contains('result-entrance')).toBeTrue();
  }));

  it('translates loading immediately and never refetches for purity, language or theme changes', fakeAsync(() => {
    const { fixture, element } = render();
    const prices = TestBed.inject(GoldPriceService);
    const language = TestBed.inject(LanguageService);
    const theme = TestBed.inject(ThemeService);
    const chart = fixture.debugElement.query(By.directive(PriceTrend)).componentInstance as PriceTrend;
    language.setLanguage('en');
    theme.setTheme('dark');
    // A saved selection is retained while price-dependent chart buttons are disabled.
    chart.selectedPurity.set(18);
    expect(element.querySelector<HTMLButtonElement>('[data-purity="18"]')!.disabled).toBeTrue();
    fixture.detectChanges();
    expect(prices.loading()).toBeTrue();
    expect(element.querySelector('.page-sections > [role="status"]')?.textContent).toBe(TRANSLATIONS.en.sampleLoading);
    expect(element.querySelector('#calculator-availability')?.textContent).toBe(TRANSLATIONS.en.calculatorLoading);
    flushGoldPriceResponses();
    fixture.detectChanges();
    expect(prices.loading()).toBeFalse();
    expect(chart.selectedPurity()).toBe(18);
    expect(element.querySelector('.trend-stats dd > bdi')?.textContent).toBe(language.price(prices.latest!.prices[18]));
    for (const purity of GOLD_PURITIES) {
      chart.selectedPurity.set(purity);
      language.toggle();
      theme.toggle();
      fixture.detectChanges();
      expect(prices.loading()).toBeFalse();
      expect(element.querySelector('.skeleton')).toBeNull();
      expect(element.querySelector('#trends')?.getAttribute('data-transition')).toBe(String(purity));
      expect(element.querySelector('polyline')?.getAttribute('points')).toBe(chart.trend().line);
      expect(element.querySelector('svg desc')?.textContent).toBe(chart.chartDescription());
    }
    TestBed.inject(HttpTestingController).expectNone(() => true);
  }));

  it('distinguishes genuinely empty records from loading and localizes every unavailable section', fakeAsync(() => {
    const loading = signal(true);
    TestBed.overrideProvider(GoldPriceService, { useValue: {
      loading: loading.asReadonly(), failed: signal(false), failure: signal(null), loadId: signal(1), days: [], history: [], latest: null, sampleDate: null, purities: GOLD_PURITIES,
    } });
    const { fixture, element } = render();
    const language = TestBed.inject(LanguageService);
    expect(element.querySelector('.chart-empty, .prices-empty')).toBeNull();
    expect(element.querySelector('tbody')?.textContent?.trim()).toBe('');
    loading.set(false);
    for (const selection of ['en', 'ar'] as const) {
      language.setLanguage(selection);
      fixture.detectChanges();
      const text = TRANSLATIONS[selection];
      expect(element.querySelector('.prices-empty')?.textContent).toBe(text.pricesEmpty);
      expect(element.querySelector('.chart-empty')?.textContent).toBe(text.chartEmpty);
      expect(element.querySelector('tbody')?.textContent?.trim()).toBe(text.historyEmpty);
      expect(element.querySelector('#calculator-availability')?.textContent).toBe(text.calculatorUnavailable);
      expect(element.querySelector('.page-sections > [role="status"]')?.textContent).toBe(text.pricesEmpty);
      expect(element.querySelector<HTMLButtonElement>('.calculate-button')?.disabled).toBeTrue();
      expect(element.querySelector('.skeleton')).toBeNull();
      expect(element.querySelector('app-hero time')?.textContent).toBe('—');
      const input = element.querySelector<HTMLInputElement>('#gold-weight')!;
      input.value = '1';
      element.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      fixture.detectChanges();
      expect(element.querySelector('.result-value')?.textContent).toBe('—');
      expect(element.querySelector('#calculator-error')?.textContent).toBe('');
    }
  }));

  it('keeps skeleton dimensions stable and bounds wrapping changes for unknown API text', fakeAsync(() => {
    const { fixture, element } = render();
    const css = appCss();
    expect(css).not.toBe('');
    // Motion affects paint only; disable it here to isolate actual layout changes.
    const disableMotion = '* { animation: none !important; transition: none !important; }';
    const frames: { frame: HTMLIFrameElement; context: string; rects: DOMRect[] }[] = [];
    const selectors = ['#prices', '.price-card', '#calculator', '#trends', '.trend-stats', '.trend-comparison', '.price-chart', '#history', 'tbody tr', 'app-footer'];
    try {
      for (const width of [320, 390, 768, 1440]) {
        for (const selection of ['ar', 'en'] as const) {
          for (const mode of ['light', 'dark'] as const) {
            TestBed.inject(LanguageService).setLanguage(selection);
            TestBed.inject(ThemeService).setTheme(mode);
            fixture.detectChanges();
            const frame = document.createElement('iframe');
            frame.title = 'Loading layout stability test';
            frame.style.cssText = `width:${width}px;height:1000px;border:0;display:block`;
            document.body.appendChild(frame);
            const doc = frame.contentDocument!;
            doc.documentElement.lang = selection;
            doc.documentElement.dir = selection === 'ar' ? 'rtl' : 'ltr';
            doc.documentElement.classList.toggle('dark', mode === 'dark');
            const style = doc.createElement('style');
            style.textContent = css + disableMotion;
            doc.head.appendChild(style);
            doc.body.appendChild(element.cloneNode(true));
            const context = `${selection}/${mode}/${width}px`;
            expect(doc.documentElement.scrollWidth).withContext(`${context}: loading overflow`).toBeLessThanOrEqual(width);
            frames.push({ frame, context, rects: selectors.map(selector => doc.querySelector(selector)!.getBoundingClientRect()) });
          }
        }
      }
      flushGoldPriceResponses();
      for (const { frame, context, rects } of frames) {
        const doc = frame.contentDocument!;
        TestBed.inject(LanguageService).setLanguage(doc.documentElement.lang as 'ar' | 'en');
        TestBed.inject(ThemeService).setTheme(doc.documentElement.classList.contains('dark') ? 'dark' : 'light');
        fixture.detectChanges();
        doc.body.replaceChildren(element.cloneNode(true));
        selectors.forEach((selector, index) => {
          const ready = doc.querySelector(selector)!.getBoundingClientRect();
          // Dates/prices are genuinely unknown during HTTP loading. Their localized
          // notices may wrap differently; allow at most two short lines of movement,
          // without seeding skeletons with hidden runtime sample values.
          expect(Math.abs(ready.top - rects[index].top)).withContext(`${context}: ${selector} position`).toBeLessThanOrEqual(48);
          const textCanWrap = ['#prices', '#calculator', '#trends', '.trend-comparison'].includes(selector);
          expect(Math.abs(ready.height - rects[index].height)).withContext(`${context}: ${selector} height`).toBeLessThanOrEqual(textCanWrap ? 48 : 1);
        });
        expect(doc.documentElement.scrollWidth).withContext(`${context}: ready overflow`).toBeLessThanOrEqual(frame.clientWidth);
      }
    } finally { frames.forEach(({ frame }) => frame.remove()); }
  }));

  it('uses short single-shot motion and disables decorative animation with the reduced-motion CSS rules', fakeAsync(() => {
    const { fixture, element } = render();
    flushGoldPriceResponses();
    fixture.detectChanges();
    const frame = document.createElement('iframe');
    frame.title = 'Reduced motion CSS test';
    document.body.appendChild(frame);
    try {
      const doc = frame.contentDocument!;
      const style = doc.createElement('style');
      style.textContent = appCss();
      doc.head.appendChild(style);
      doc.body.appendChild(element.cloneNode(true));
      const view = frame.contentWindow!;
      const stats = doc.querySelector<HTMLElement>('.trend-stats')!;
      if (!view.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        expect(view.getComputedStyle(stats).animationDuration).toBe('0.16s');
        expect(view.getComputedStyle(stats).animationIterationCount).toBe('1');
        expect(view.getComputedStyle(doc.querySelector('.calculator-empty-icon')!).animationDuration).toBe('0.6s');
      }
      // Apply the actual reduced-motion declarations even when the test host OS prefers motion.
      const rules = Array.from(style.sheet!.cssRules);
      const reduced = rules.find(rule => 'conditionText' in rule && rule.conditionText === '(prefers-reduced-motion: reduce)') as CSSMediaRule;
      expect(reduced).toBeDefined();
      const reducedStyle = doc.createElement('style');
      reducedStyle.textContent = Array.from(reduced.cssRules).map(rule => rule.cssText).join('\n');
      doc.head.appendChild(reducedStyle);
      for (const selector of ['.calculator-empty-icon', '.trend-stats', '.trend-comparison', '.trend-chart']) {
        const computed = view.getComputedStyle(doc.querySelector(selector)!);
        expect(computed.animationName).withContext(selector).toBe('none');
        expect(computed.transitionDuration).withContext(selector).toBe('0s');
      }
      const input = element.querySelector<HTMLInputElement>('#gold-weight')!;
      input.value = '2';
      element.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      fixture.detectChanges();
      doc.body.replaceChildren(element.cloneNode(true));
      expect(view.getComputedStyle(doc.querySelector('.result-entrance')!).animationName).toBe('none');
      const chart = fixture.debugElement.query(By.directive(PriceTrend)).componentInstance as PriceTrend;
      chart.selectedPurity.set(21);
      fixture.detectChanges();
      expect(element.querySelector('svg desc')?.textContent).toBe(chart.chartDescription());
      expect(element.querySelector('.trend-stats dd > bdi')?.textContent).toBe(TestBed.inject(LanguageService).price(chart.trend().latest));
    } finally { frame.remove(); }
  }));
});
