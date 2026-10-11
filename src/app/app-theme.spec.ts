import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { App } from './app';
import { GoldCalculator } from './components/gold-calculator';
import { PriceTrend } from './components/price-trend';
import { TRANSLATIONS } from './data/translations';
import { GoldPriceService } from './services/gold-price.service';
import { LANGUAGE_STORAGE_KEY, LanguageService } from './services/language.service';
import { THEME_STORAGE_KEY, ThemeService } from './services/theme.service';

describe('Dashboard theme switching', () => {
  let fixture: ComponentFixture<App>;
  let element: HTMLElement;
  let theme: ThemeService;
  let language: LanguageService;
  let stored: Map<string, string>;
  let original: { className: string; scheme: string; lang: string; dir: string; title: string };

  beforeEach(async () => {
    original = {
      className: document.documentElement.className, scheme: document.documentElement.style.colorScheme,
      lang: document.documentElement.lang, dir: document.documentElement.dir, title: document.title,
    };
    stored = new Map();
    spyOn(Storage.prototype, 'getItem').and.callFake((key: string) => stored.get(key) ?? null);
    spyOn(Storage.prototype, 'setItem').and.callFake((key: string, value: string) => stored.set(key, value));
    await TestBed.configureTestingModule({ imports: [App] }).compileComponents();
  });

  afterEach(() => {
    document.documentElement.className = original.className;
    document.documentElement.style.colorScheme = original.scheme;
    document.documentElement.lang = original.lang;
    document.documentElement.dir = original.dir;
    document.title = original.title;
  });

  function render(): void {
    fixture = TestBed.createComponent(App);
    element = fixture.nativeElement;
    theme = TestBed.inject(ThemeService);
    language = TestBed.inject(LanguageService);
    fixture.detectChanges();
  }

  function click(selector: string): void {
    element.querySelector<HTMLButtonElement>(selector)!.click();
    fixture.detectChanges();
  }

  function submit(value: string): void {
    const purity = element.querySelector<HTMLSelectElement>('#gold-purity')!;
    purity.value = '22';
    purity.dispatchEvent(new Event('change', { bubbles: true }));
    const weight = element.querySelector<HTMLInputElement>('#gold-weight')!;
    weight.value = value;
    weight.dispatchEvent(new Event('input', { bubbles: true }));
    element.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    fixture.detectChanges();
  }

  it('exposes a keyboard-accessible native button with translated action labels and sun/moon SVGs', () => {
    render();
    const button = element.querySelector<HTMLButtonElement>('.theme-button')!;
    expect(button.type).toBe('button');
    expect(button.tabIndex).toBe(0);
    for (const selection of ['ar', 'en'] as const) {
      language.setLanguage(selection);
      for (const value of ['light', 'dark'] as const) {
        theme.setTheme(value);
        fixture.detectChanges();
        const label = TRANSLATIONS[selection][value === 'light' ? 'switchToDark' : 'switchToLight'];
        expect(button.getAttribute('aria-label')).toBe(label);
        expect(button.title).toBe(label);
        expect(button.textContent?.trim()).toBe(label);
        expect(button.querySelector('svg')?.getAttribute('data-theme-icon')).toBe(value === 'light' ? 'moon' : 'sun');
        expect(button.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
        expect(document.documentElement.classList.contains('dark')).toBe(value === 'dark');
        expect(document.documentElement.style.colorScheme).toBe(value);
      }
    }
    click('.theme-button');
    expect(theme.theme()).toBe('light');
  });

  it('restores theme and language independently from their own storage keys', () => {
    stored.set(THEME_STORAGE_KEY, 'dark');
    stored.set(LANGUAGE_STORAGE_KEY, 'en');
    render();
    expect(theme.theme()).toBe('dark');
    expect(language.language()).toBe('en');
    expect(document.documentElement.dir).toBe('ltr');
    click('.theme-button');
    expect(stored.get(THEME_STORAGE_KEY)).toBe('light');
    expect(stored.get(LANGUAGE_STORAGE_KEY)).toBe('en');
    click('.language-button');
    expect(stored.get(THEME_STORAGE_KEY)).toBe('light');
    expect(stored.get(LANGUAGE_STORAGE_KEY)).toBe('ar');
    expect(theme.theme()).toBe('light');
  });

  it('preserves calculator input nodes, full-precision results, sample data and chart selection in all combinations', () => {
    render();
    submit('2.34567');
    click('[data-purity="18"]');
    const calculator = fixture.debugElement.query(By.directive(GoldCalculator)).componentInstance as GoldCalculator;
    const chart = fixture.debugElement.query(By.directive(PriceTrend)).componentInstance as PriceTrend;
    const result = calculator.result;
    const trend = chart.trend();
    const prices = TestBed.inject(GoldPriceService);
    const data = prices.days;
    const input = element.querySelector<HTMLInputElement>('#gold-weight')!;
    for (let cycle = 0; cycle < 2; cycle++) {
      click('.theme-button');
      expect(language.language()).toBe(cycle === 0 ? 'ar' : 'en');
      click('.language-button');
      for (let repeat = 0; repeat < 2; repeat++) {
        click('.theme-button');
        expect(element.querySelector('#gold-weight')).toBe(input);
        expect(input.value).toBe('2.34567');
        expect(element.querySelector<HTMLSelectElement>('#gold-purity')?.value).toBe('22');
        expect(calculator.result).toBe(result);
        expect(result?.total).toBe(2.34567 * prices.latest.prices[22]);
        expect(element.querySelector('.result-value')?.textContent).toBe(language.price(result!.total));
        expect(calculator.error).toBe('');
        expect(chart.selectedPurity()).toBe(18);
        expect(chart.trend()).toBe(trend);
        expect(element.querySelector('polyline')?.getAttribute('points')).toBe(trend.line);
        expect(element.querySelector('.chart-layout')?.getAttribute('dir')).toBe('ltr');
        expect(prices.days).toBe(data);
      }
    }
  });

  for (const [weight, key] of [['0', 'invalidWeight'], ['1e308', 'overflowingTotal']] as const) {
    it(`preserves the ${key} error when theme changes and translates it when language changes`, () => {
      render();
      submit(weight);
      click('[data-purity="21"]');
      for (const selection of ['ar', 'en'] as const) {
        language.setLanguage(selection);
        fixture.detectChanges();
        for (let repeat = 0; repeat < 2; repeat++) {
          click('.theme-button');
          expect(element.querySelector('#calculator-error')?.textContent).toBe(TRANSLATIONS[selection][key]);
          expect(element.querySelector('#gold-weight')?.getAttribute('aria-invalid')).toBe('true');
          expect(element.querySelector<HTMLInputElement>('#gold-weight')?.value).toBe(weight);
          expect(element.querySelector<HTMLSelectElement>('#gold-purity')?.value).toBe('22');
          expect(element.querySelector('.result-value')?.textContent).toBe('—');
          expect(element.querySelector('button[aria-pressed="true"]')?.getAttribute('data-purity')).toBe('21');
        }
      }
    });
  }

  it('keeps text, placeholders, disabled controls, chart strokes and keyboard focus readable in both palettes', () => {
    render();
    submit('0');
    // Native canvas resolves CSS colours (including color-mix) to sRGB for contrast checks.
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 1;
    const context = canvas.getContext('2d', { willReadFrequently: true })!;
    const rgba = (colour: string): number[] => {
      context.clearRect(0, 0, 1, 1);
      context.fillStyle = colour;
      context.fillRect(0, 0, 1, 1);
      return Array.from(context.getImageData(0, 0, 1, 1).data);
    };
    const composite = (foreground: number[], background: number[]): number[] =>
      foreground.slice(0, 3).map((value, index) => value * foreground[3] / 255 + background[index] * (1 - foreground[3] / 255)).concat(255);
    const luminance = (colour: number[]) => {
      const channels = colour.slice(0, 3).map(value => value / 255)
        .map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
      return channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722;
    };
    const contrast = (a: number[], b: number[]) =>
      (Math.max(luminance(a), luminance(b)) + .05) / (Math.min(luminance(a), luminance(b)) + .05);
    const background = (node: Element): number[] => {
      const ancestors: Element[] = [];
      for (let parent: Element | null = node; parent; parent = parent.parentElement) { ancestors.unshift(parent); }
      return ancestors.reduce((colour, ancestor) => composite(rgba(getComputedStyle(ancestor).backgroundColor), colour), [255, 255, 255, 255]);
    };
    const token = (name: string): number[] => {
      const probe = document.createElement('span');
      probe.style.color = `var(${name})`;
      document.body.appendChild(probe);
      try { return rgba(getComputedStyle(probe).color); } finally { probe.remove(); }
    };
    const selectors = [
      '.brand-name', '.brand-caption', '.header-nav a', '.language-button', '.theme-button',
      '.sample-badge', '.price-card h3', '.price-value', '.price-unit', '.field-group label',
      '.field', '#calculator-error', '.calculate-button', '.calculator-result', '.calculator-result .text-muted',
      '.trend-stats dt', '.trend-stats dd', '.trend-stats span', '.purity-tab', '.comparison-grid dt',
      '.comparison-grid dd', '.chart-y-axis', '.chart-dates', '.history-scroll th', '.history-scroll td',
      '.footer-brand', '.copyright',
    ];
    for (const mode of ['light', 'dark'] as const) {
      theme.setTheme(mode);
      fixture.detectChanges();
      for (const selector of selectors) {
        element.querySelectorAll(selector).forEach(node => {
          expect(contrast(rgba(getComputedStyle(node).color), background(node)))
            .withContext(`${mode}: ${selector} text`).toBeGreaterThanOrEqual(4.5);
        });
      }
      const input = element.querySelector<HTMLInputElement>('#gold-weight')!;
      expect(contrast(rgba(getComputedStyle(input, '::placeholder').color), background(input)))
        .withContext(`${mode}: placeholder`).toBeGreaterThanOrEqual(4.5);
      expect(contrast(rgba(getComputedStyle(input).borderTopColor), background(input)))
        .withContext(`${mode}: invalid field border`).toBeGreaterThanOrEqual(3);
      input.focus();
      expect(getComputedStyle(input).outlineWidth).toBe('3px');
      expect(contrast(rgba(getComputedStyle(input).outlineColor), background(input)))
        .withContext(`${mode}: focus ring`).toBeGreaterThanOrEqual(3);
      const button = element.querySelector<HTMLButtonElement>('.calculate-button')!;
      expect(contrast(rgba(getComputedStyle(button).color), token('--action-hover')))
        .withContext(`${mode}: action hover colours`).toBeGreaterThanOrEqual(4.5);
      for (const selector of ['.calculate-button', '.theme-button', '.language-button', '.purity-tab', '.field']) {
        const control = element.querySelector<HTMLButtonElement | HTMLInputElement>(selector)!;
        control.disabled = true;
        expect(contrast(rgba(getComputedStyle(control).color), background(control)))
          .withContext(`${mode}: disabled ${selector}`).toBeGreaterThanOrEqual(4.5);
        control.disabled = false;
      }
      const line = element.querySelector('.chart-line')!;
      expect(contrast(rgba(getComputedStyle(line).stroke), background(line)))
        .withContext(`${mode}: chart line`).toBeGreaterThanOrEqual(3);
      // Bound the hero gradient by its brightest endpoint, before and after its radial highlight.
      const heroText = rgba(getComputedStyle(element.querySelector('.hero h1')!).color);
      for (const start of [token('--hero-start'), composite(token('--hero-highlight'), token('--hero-start'))]) {
        expect(contrast(heroText, composite(token('--hero-shade'), start)))
          .withContext(`${mode}: hero gradient text`).toBeGreaterThanOrEqual(4.5);
      }
    }
  });
});
