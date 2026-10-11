import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { App } from './app';
import { GoldCalculator } from './components/gold-calculator';
import { PriceTrend } from './components/price-trend';
import { Language, TRANSLATIONS } from './data/translations';
import { GoldPriceService, SAMPLE_LOADING_DELAY_MS } from './services/gold-price.service';
import { LanguageService } from './services/language.service';
import { ThemeService } from './services/theme.service';

describe('Dashboard language switching', () => {
  let fixture: ComponentFixture<App>;
  let element: HTMLElement;
  let language: LanguageService;
  let prices: GoldPriceService;
  let original: { lang: string; dir: string; title: string; className: string; scheme: string };

  beforeEach(async () => {
    original = {
      lang: document.documentElement.lang, dir: document.documentElement.dir, title: document.title,
      className: document.documentElement.className, scheme: document.documentElement.style.colorScheme,
    };
    spyOn(Storage.prototype, 'getItem').and.returnValue(null);
    spyOn(Storage.prototype, 'setItem');
    await TestBed.configureTestingModule({ imports: [App] }).compileComponents();
    fakeAsync(() => { TestBed.inject(GoldPriceService); tick(SAMPLE_LOADING_DELAY_MS); })();
    fixture = TestBed.createComponent(App);
    element = fixture.nativeElement;
    language = TestBed.inject(LanguageService);
    prices = TestBed.inject(GoldPriceService);
    fixture.detectChanges();
  });

  afterEach(() => {
    document.documentElement.lang = original.lang;
    document.documentElement.dir = original.dir;
    document.title = original.title;
    document.documentElement.className = original.className;
    document.documentElement.style.colorScheme = original.scheme;
  });

  function toggle(): void {
    element.querySelector<HTMLButtonElement>('.language-button')!.click();
    fixture.detectChanges();
  }

  function submit(value: string, purity = 22): void {
    const selector = element.querySelector<HTMLSelectElement>('#gold-purity')!;
    selector.value = String(purity);
    selector.dispatchEvent(new Event('change', { bubbles: true }));
    const input = element.querySelector<HTMLInputElement>('#gold-weight')!;
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    element.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    fixture.detectChanges();
  }

  it('exposes a native keyboard-accessible language button with a target-language accessible name', () => {
    const button = element.querySelector<HTMLButtonElement>('.language-button')!;
    expect(button.type).toBe('button');
    expect(button.tabIndex).toBe(0);
    expect(button.textContent).toBe('English');
    expect(button.getAttribute('aria-label')).toBe('Switch to English');
    expect(button.lang).toBe('en');
    toggle();
    expect(button.textContent).toBe('العربية');
    expect(button.getAttribute('aria-label')).toBe('التبديل إلى العربية');
    expect(button.lang).toBe('ar');
    expect(document.documentElement.dir).toBe('ltr');
    toggle();
    expect(document.documentElement.dir).toBe('rtl');
  });

  it('updates all section text, labels, notices, accessible names and dates in both languages', () => {
    for (const selection of ['en', 'ar'] as const) {
      language.setLanguage(selection);
      fixture.detectChanges();
      const text = TRANSLATIONS[selection];
      expect(element.querySelector('.skip-link')?.textContent).toBe(text.skipContent);
      expect(element.querySelector('.brand-name > span:first-child')?.textContent).toBe(text.siteName);
      expect(element.querySelector('.brand')?.getAttribute('aria-label')).toBe(text.brandHome);
      expect(element.querySelector('.header-nav')?.getAttribute('aria-label')).toBe(text.mainNavigation);
      expect(element.querySelector('.header-nav a[href="#prices"]')?.textContent).toBe(text.prices);
      expect(element.querySelector('.breadcrumb')?.getAttribute('aria-label')).toBe(text.breadcrumb);
      expect(element.querySelector('h1')?.textContent).toBe(text.heroTitle);
      expect(element.querySelector('.hero-copy p')?.textContent).toBe(text.heroDescription);
      expect(element.querySelector('.sample-badge')?.textContent).toContain(text.sampleData);
      expect(element.querySelector('app-hero time')?.textContent).toBe(language.date(prices.sampleDate!));
      expect(element.querySelector('.hero-details dt')?.textContent).toBe(text.lastDataUpdate);
      expect(element.querySelector('.hero-details > div:last-child dd')?.textContent).toBe(text.rialPerGram);
      expect(element.querySelector('.price-data-note')?.textContent).toContain(text.samplePricesAfterDate);
      expect(element.querySelector('#calculator-title')?.textContent).toBe(text.calculator);
      expect(element.querySelector('label[for="gold-purity"]')?.textContent).toBe(text.purityLabel);
      expect(element.querySelector('label[for="gold-weight"]')?.textContent).toBe(text.weightLabel);
      expect(element.querySelector<HTMLInputElement>('#gold-weight')?.placeholder).toBe(text.weightPlaceholder);
      expect(element.querySelector('.calculate-button')?.textContent).toBe(text.calculate);
      expect(element.querySelector('.result-value')?.getAttribute('aria-label')).toBe(text.calculationEmpty);
      expect(element.querySelector('#calculator-note')?.textContent).toContain(text.estimateAfterDate);
      expect(element.querySelector('#trends-title')?.textContent).toBe(text.trends);
      expect(element.querySelector('.purity-tabs')?.getAttribute('aria-label')).toBe(text.chartPurity);
      expect(element.querySelector('.chart-axis-title')?.textContent).toBe(text.chartAxis);
      expect(element.querySelector('.history-alternative')?.textContent).toBe(text.historyAlternative);
      expect(element.querySelector('#history-title')?.textContent).toBe(text.history);
      expect(element.querySelector('.history-scroll')?.getAttribute('aria-label')).toBe(text.historyRegion);
      expect(element.querySelector('thead th')?.textContent).toBe(text.date);
      expect(element.querySelector('.footer-brand')?.textContent).toBe(text.siteName);
      expect(element.querySelector('.copyright')?.textContent).toContain(selection === 'en' ? 'All rights reserved.' : 'جميع الحقوق محفوظة.');
      expect(document.title).toBe(text.documentTitle);
      expect(element.textContent).not.toMatch(/\{\w+\}/);
      // Only the language switch itself should contain the target language.
      const page = element.cloneNode(true) as HTMLElement;
      page.querySelector('.language-button')?.remove();
      if (selection === 'en') { expect(page.textContent).not.toMatch(/[\u0600-\u06ff]/); }
    }
  });

  it('preserves calculator inputs, unrounded result and chart selection while translating live results', () => {
    submit('2.34567', 22);
    const calculator = fixture.debugElement.query(By.directive(GoldCalculator)).componentInstance as GoldCalculator;
    const chart = fixture.debugElement.query(By.directive(PriceTrend)).componentInstance as PriceTrend;
    element.querySelector<HTMLButtonElement>('[data-purity="18"]')!.click();
    fixture.detectChanges();
    const result = calculator.result;
    const trend = chart.trend();
    const input = element.querySelector<HTMLInputElement>('#gold-weight')!;
    for (const selection of ['en', 'ar'] as const) {
      toggle();
      expect(language.language()).toBe(selection);
      expect(element.querySelector('#gold-weight')).toBe(input);
      expect(input.value).toBe('2.34567');
      expect(element.querySelector<HTMLSelectElement>('#gold-purity')?.value).toBe('22');
      expect(calculator.selectedPurity).toBe(22);
      expect(calculator.result).toBe(result);
      expect(calculator.result?.total).toBe(2.34567 * prices.latest!.prices[22]);
      expect(element.querySelector('.result-value')?.textContent).toBe(language.price(result!.total));
      const details = element.querySelectorAll('.calculation-details dd');
      expect(details[0].textContent).toBe(language.purity(22));
      expect(details[1].textContent).toContain(language.number(2.34567));
      expect(details[2].textContent).toBe(language.currency(prices.latest!.prices[22]));
      expect(chart.selectedPurity()).toBe(18);
      expect(chart.trend()).toBe(trend);
      expect(element.querySelector('button[aria-pressed="true"]')?.getAttribute('data-purity')).toBe('18');
      expect(element.querySelector('polyline')?.getAttribute('points')).toBe(trend.line);
      expect(element.querySelector('.price-chart desc')?.textContent).toBe(chart.chartDescription());
      expect(chart.chartDescription()).toContain(language.purity(18));
      expect(chart.chartDescription()).toContain(language.date(prices.days[0].date));
      expect(chart.chartDescription()).toContain(language.date(prices.sampleDate!));
      expect(chart.movement()).toBe(TRANSLATIONS[selection].movementUp);
      expect(element.querySelector('.chart-layout')?.getAttribute('dir')).toBe('ltr');
      expect(element.querySelector('.chart-dates > span')?.getAttribute('dir')).toBe(language.direction());
      expect(element.querySelector('.calculator-result')?.getAttribute('aria-live')).toBe('polite');
    }
  });

  for (const [weight, errorKey] of [['0', 'invalidWeight'], ['1e308', 'overflowingTotal']] as const) {
    it(`immediately translates the existing ${errorKey} alert without resubmission`, () => {
      submit(weight);
      const calculator = fixture.debugElement.query(By.directive(GoldCalculator)).componentInstance as GoldCalculator;
      for (const selection of ['en', 'ar'] as const) {
        toggle();
        expect(element.querySelector('#calculator-error')?.textContent).toBe(TRANSLATIONS[selection][errorKey]);
        expect(element.querySelector('#calculator-error')?.getAttribute('role')).toBe('alert');
        expect(element.querySelector('#gold-weight')?.getAttribute('aria-invalid')).toBe('true');
        expect(calculator.result).toBeNull();
        expect(element.querySelector<HTMLInputElement>('#gold-weight')?.value).toBe(weight);
      }
    });
  }

  it('keeps cards, newest history row, calculator and chart on the same dataset in either language', () => {
    const dataset = prices.days;
    for (const selection of ['en', 'ar'] as Language[]) {
      language.setLanguage(selection);
      for (const [index, purity] of ([24, 22, 21, 18] as const).entries()) {
        submit('1', purity);
        element.querySelector<HTMLButtonElement>(`[data-purity="${purity}"]`)!.click();
        fixture.detectChanges();
        const expected = language.price(prices.latest!.prices[purity]);
        expect(element.querySelectorAll('.price-value')[index].textContent).toBe(expected);
        expect(element.querySelectorAll('tbody tr:first-child td')[index].textContent).toBe(expected);
        expect(element.querySelector('.result-value')?.textContent).toBe(expected);
        expect(element.querySelector('.trend-stats dd > bdi')?.textContent).toBe(expected);
      }
      expect(prices.days).toBe(dataset);
      expect(element.querySelectorAll('tbody tr').length).toBe(30);
      const dates = element.querySelectorAll<HTMLTimeElement>('tbody time');
      dates.forEach((date, index) => {
        expect(date.dateTime).toBe(prices.history[index].date);
        expect(date.textContent).toBe(language.date(prices.history[index].date));
      });
    }
  });

  it('renders light/dark mobile and desktop RTL/LTR layouts without page overflow and keeps the chart LTR', () => {
    // Native same-origin frames provide real viewport/media-query layout in ChromeHeadless.
    // Copy only the app stylesheet, not the Jasmine runner UI styles.
    const appCss = Array.from(document.styleSheets)
      .map(sheet => Array.from(sheet.cssRules).map(rule => rule.cssText).join('\n'))
      .filter(css => css.includes('.page-shell')).join('\n');
    expect(appCss).not.toBe('');
    const theme = TestBed.inject(ThemeService);
    for (const width of [320, 390, 768, 1440]) {
      for (const selection of ['ar', 'en'] as const) {
        for (const mode of ['light', 'dark'] as const) {
          theme.setTheme(mode);
          language.setLanguage(selection);
          fixture.detectChanges();
          const frame = document.createElement('iframe');
          frame.title = 'Bilingual responsive layout test';
          frame.style.cssText = `width:${width}px;height:1000px;border:0;display:block`;
          document.body.appendChild(frame);
          try {
            const frameDocument = frame.contentDocument!;
            frameDocument.documentElement.lang = selection;
            frameDocument.documentElement.dir = selection === 'ar' ? 'rtl' : 'ltr';
            frameDocument.documentElement.classList.toggle('dark', mode === 'dark');
            const style = frameDocument.createElement('style');
            style.textContent = appCss;
            frameDocument.head.appendChild(style);
            frameDocument.body.appendChild(element.cloneNode(true));
            const rect = (selector: string) => frameDocument.querySelector(selector)!.getBoundingClientRect();
            const context = `${mode} / ${selection} at ${width}px`;
            expect(frameDocument.documentElement.scrollWidth).withContext(context).toBeLessThanOrEqual(width);
            expect(rect('.language-button').width).withContext(context).toBeGreaterThanOrEqual(44);
            expect(rect('.theme-button').width).withContext(context).toBeGreaterThanOrEqual(44);
            expect(frame.contentWindow!.getComputedStyle(frameDocument.documentElement).colorScheme).withContext(context).toBe(mode);
            const offset = parseFloat(frame.contentWindow!.getComputedStyle(frameDocument.documentElement).getPropertyValue('--anchor-offset'));
            expect(rect('app-header').height).withContext(`${context}: sticky anchor clearance`).toBeLessThanOrEqual(offset);
            const inputs = rect('.calculator-layout > div:first-child');
            const result = rect('.calculator-result');
            if (width >= 1024) {
              expect(Math.abs(inputs.top - result.top)).withContext(context).toBeLessThan(1);
              if (selection === 'ar') {
                expect(inputs.left).withContext(context).toBeGreaterThan(result.left);
              } else {
                expect(inputs.left).withContext(context).toBeLessThan(result.left);
              }
            } else {
              expect(result.top).withContext(context).toBeGreaterThan(inputs.bottom);
            }
            const chart = frameDocument.querySelector<HTMLElement>('.chart-layout')!;
            expect(frame.contentWindow!.getComputedStyle(chart).direction).withContext(context).toBe('ltr');
            expect(rect('.chart-dates > span:first-child').left).withContext(context)
              .toBeLessThan(rect('.chart-dates > span:last-child').left);
            const history = frameDocument.querySelector<HTMLElement>('.history-scroll')!;
            expect(frame.contentWindow!.getComputedStyle(history).overflowX).withContext(context).toBe('auto');
            if (width < 768) { expect(history.scrollWidth).withContext(context).toBeGreaterThan(history.clientWidth); }
          } finally {
            frame.remove();
          }
        }
      }
    }
  });
});
