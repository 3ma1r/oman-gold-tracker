import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { App } from './app';
import { GoldCalculator } from './components/gold-calculator';
import { PriceTrend } from './components/price-trend';
import { Header } from './components/header';
import { flushGoldPriceResponses, provideGoldPriceHttpTesting } from './testing/gold-price-http';
import { LanguageService } from './services/language.service';
import { ThemeService } from './services/theme.service';

describe('Dashboard interactions', () => {
  let fixture: ComponentFixture<App>;
  let element: HTMLElement;
  let calculator: GoldCalculator;
  let weight: HTMLInputElement;
  let scroll: jasmine.Spy;
  let original: { lang: string; dir: string; title: string; className: string; scheme: string };

  beforeEach(async () => {
    original = { lang: document.documentElement.lang, dir: document.documentElement.dir,
      title: document.title, className: document.documentElement.className, scheme: document.documentElement.style.colorScheme };
    spyOn(Storage.prototype, 'getItem').and.returnValue(null);
    spyOn(Storage.prototype, 'setItem');
    scroll = spyOn(HTMLElement.prototype, 'scrollIntoView');
    await TestBed.configureTestingModule({ imports: [App], providers: provideGoldPriceHttpTesting() }).compileComponents();
    flushGoldPriceResponses();
    fixture = TestBed.createComponent(App); fixture.detectChanges();
    element = fixture.nativeElement;
    calculator = fixture.debugElement.query(By.directive(GoldCalculator)).componentInstance;
    weight = element.querySelector('#gold-weight')!;
  });

  afterEach(() => {
    fixture.destroy();
    document.documentElement.lang = original.lang; document.documentElement.dir = original.dir;
    document.title = original.title; document.documentElement.className = original.className;
    document.documentElement.style.colorScheme = original.scheme;
  });

  function enter(value: string) {
    weight.value = value; weight.dispatchEvent(new Event('input', { bubbles: true })); fixture.detectChanges();
  }
  function submit() {
    element.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true })); fixture.detectChanges();
  }

  for (const purity of [18, 21, 22, 24] as const) {
    it(`uses the ${purity}K card without changing weight or calculating, and focuses on keyboard activation`, () => {
      enter('2.5'); submit();
      const field = element.querySelector<HTMLSelectElement>('#gold-purity')!;
      const focus = spyOn(field, 'focus');
      const card = element.querySelector<HTMLButtonElement>(`[aria-labelledby="price-${purity} price-hint-${purity}"]`)!;
      expect(card.type).toBe('button');
      expect(card.querySelector('a, button, input, select')).toBeNull();
      card.click(); fixture.detectChanges();
      expect(calculator.selectedPurity).toBe(purity);
      expect(field.value).toBe(String(purity));
      expect(weight.value).toBe('2.5');
      expect(calculator.result).toBeNull(); expect(calculator.error).toBe('');
      expect(scroll).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
      expect(focus).toHaveBeenCalledWith({ preventScroll: true });
      expect(scroll.calls.mostRecent().object === element.querySelector('#calculator')).toBeTrue();
    });
  }

  it('clears validation on pointer card activation without stealing focus and honors reduced motion', () => {
    submit(); expect(calculator.error).not.toBe('');
    spyOn(window, 'matchMedia').and.returnValue({ matches: true } as MediaQueryList);
    const focus = spyOn(element.querySelector<HTMLSelectElement>('#gold-purity')!, 'focus');
    element.querySelector('.price-card-action')!.dispatchEvent(new MouseEvent('click', { detail: 1 }));
    fixture.detectChanges();
    expect(calculator.error).toBe(''); expect(calculator.result).toBeNull();
    expect(focus).not.toHaveBeenCalled();
    expect(scroll).toHaveBeenCalledWith({ behavior: 'instant', block: 'start' });
  });

  for (const grams of [1, 5, 10, 20]) {
    it(`fills ${grams}g and clears stale results and validation without submitting`, () => {
      const button = element.querySelector<HTMLButtonElement>(`[data-weight="${grams}"]`)!;
      expect(button.type).toBe('button');
      enter('2.5'); submit(); expect(calculator.result).not.toBeNull();
      button.click(); fixture.detectChanges();
      expect(weight.valueAsNumber).toBe(grams); expect(calculator.result).toBeNull();
      expect(button.getAttribute('aria-pressed')).toBe('true');
      expect(element.querySelectorAll('.weight-shortcuts [aria-pressed="true"]').length).toBe(1);
      enter('0'); submit(); expect(calculator.error).not.toBe('');
      button.click(); fixture.detectChanges(); expect(calculator.error).toBe('');
      expect(weight.getAttribute('aria-invalid')).toBeNull(); expect(calculator.result).toBeNull();
      enter('2.5');
      expect(element.querySelectorAll('.weight-shortcuts [aria-pressed="true"]').length).toBe(0);
      enter(`${grams}.0`); expect(button.getAttribute('aria-pressed')).toBe('true');
    });
  }

  it('preserves chart selection, calculator input/results and shortcut selection across language/theme changes', () => {
    element.querySelector<HTMLButtonElement>('[data-weight="5"]')!.click(); submit();
    const trend: PriceTrend = fixture.debugElement.query(By.directive(PriceTrend)).componentInstance;
    element.querySelector('.chart-plot')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'End' }));
    trend.selectedPurity.set(21); fixture.detectChanges();
    const result = calculator.result;
    for (const language of ['en', 'ar'] as const) for (const theme of ['dark', 'light'] as const) {
      const lang = TestBed.inject(LanguageService); lang.setLanguage(language);
      TestBed.inject(ThemeService).setTheme(theme); fixture.detectChanges();
      expect(calculator.result).toBe(result); expect(weight.valueAsNumber).toBe(5);
      expect(trend.selectedPurity()).toBe(21); expect(trend.selectedDate()).toBe('2025-04-27');
      expect(element.querySelector('[data-weight="5"]')?.getAttribute('aria-pressed')).toBe('true');
      expect(element.querySelector('.price-card-hint')?.textContent).toBe(lang.t('useInCalculator'));
      expect(element.querySelector('.chart-selection-announcement')?.textContent).toContain(lang.price(44.8));
    }
  });

  it('marks only the active native anchor as the current location', () => {
    const header: Header = fixture.debugElement.query(By.directive(Header)).componentInstance;
    for (const id of ['home', 'prices', 'calculator', 'trends', null]) {
      header.activeSection.set(id); fixture.detectChanges();
      const current = element.querySelectorAll('.header-nav [aria-current="location"]');
      expect(current.length).toBe(id ? 1 : 0);
      if (id) expect(current[0].getAttribute('href')).toBe(`#${id}`);
    }
  });

  it('omits the header sample-data badge but keeps the hero badge in both languages', () => {
    const lang = TestBed.inject(LanguageService);
    for (const language of ['ar', 'en'] as const) {
      lang.setLanguage(language); fixture.detectChanges();
      expect(element.querySelector('app-header .header-sample-badge')).toBeNull();
      expect(element.querySelector('.hero-copy .sample-badge')?.textContent).toContain(lang.t('sampleData'));
    }
  });

  it('starts with a closed menu and translates its accessible toggle without losing active navigation', () => {
    const lang = TestBed.inject(LanguageService);
    const button = element.querySelector<HTMLButtonElement>('.menu-button')!;
    const nav = element.querySelector<HTMLElement>('.header-nav')!;
    expect(button.type).toBe('button');
    expect(button.getAttribute('aria-controls')).toBe(nav.id);
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(nav.classList.contains('menu-open')).toBeFalse();
    for (const language of ['ar', 'en'] as const) {
      lang.setLanguage(language); fixture.detectChanges();
      expect(button.getAttribute('aria-label')).toBe(lang.t('openMenu'));
      button.click(); fixture.detectChanges();
      expect(button.getAttribute('aria-expanded')).toBe('true');
      expect(button.getAttribute('aria-label')).toBe(lang.t('closeMenu'));
      expect(nav.classList.contains('menu-open')).toBeTrue();
      expect(nav.querySelector('[aria-current="location"]')?.getAttribute('href')).toBe('#home');
      button.click(); fixture.detectChanges();
    }
  });

  it('closes the menu on each section link without preventing native anchor navigation', () => {
    const button = element.querySelector<HTMLButtonElement>('.menu-button')!;
    for (const link of element.querySelectorAll<HTMLAnchorElement>('.header-nav a')) {
      button.click(); fixture.detectChanges();
      const event = new MouseEvent('click', { bubbles: true, cancelable: true });
      // Do not scroll the test runner; separately verify our handler did not prevent default.
      let prevented = true;
      let collapsedBeforeDefault = false;
      link.addEventListener('click', e => {
        prevented = e.defaultPrevented;
        collapsedBeforeDefault = button.getAttribute('aria-expanded') === 'false'
          && !element.querySelector('.header-nav')!.classList.contains('menu-open');
        e.preventDefault();
      }, { once: true });
      link.dispatchEvent(event); fixture.detectChanges();
      expect(prevented).toBeFalse();
      expect(collapsedBeforeDefault).toBeTrue();
      expect(button.getAttribute('aria-expanded')).toBe('false');
      expect(link.getAttribute('href')).toMatch(/^#(home|prices|calculator|trends)$/);
    }
  });

  it('closes with Escape and restores menu-button focus only when the menu was open', () => {
    const button = element.querySelector<HTMLButtonElement>('.menu-button')!;
    const focus = spyOn(button, 'focus');
    button.click(); fixture.detectChanges();
    // Escape also closes after focus has moved outside the expanded navigation.
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(focus).toHaveBeenCalledOnceWith({ preventScroll: true });
    button.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(focus).toHaveBeenCalledTimes(1);
  });

  it('preserves an open menu and application state while switching language and theme', () => {
    enter('2.5'); submit();
    const result = calculator.result;
    const button = element.querySelector<HTMLButtonElement>('.menu-button')!;
    button.click(); fixture.detectChanges();
    element.querySelector<HTMLButtonElement>('.language-button')!.click();
    element.querySelector<HTMLButtonElement>('.theme-button')!.click(); fixture.detectChanges();
    expect(button.getAttribute('aria-expanded')).toBe('true');
    expect(button.getAttribute('aria-label')).toBe(TestBed.inject(LanguageService).t('closeMenu'));
    expect(weight.value).toBe('2.5');
    expect(calculator.result).toBe(result);
  });

  it('tracks scrolling at the sticky anchor boundary and removes its native listeners', async () => {
    const frame = () => new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
    await frame(); await frame();
    const header: Header = fixture.debugElement.query(By.directive(Header)).componentInstance;
    const anchor = Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--anchor-offset'));
    spyOn(element.querySelector('app-header')!, 'getBoundingClientRect').and.returnValue(new DOMRect(0, 0, 1000, anchor - 40));
    const positions = {
      home: new DOMRect(0, -600, 1000, 300),
      prices: new DOMRect(0, -280, 1000, anchor + 258),
      calculator: new DOMRect(0, anchor, 1000, 400),
      trends: new DOMRect(0, anchor + 422, 1000, 600),
      history: new DOMRect(0, anchor + 1044, 1000, 1000),
    };
    for (const id of Object.keys(positions) as (keyof typeof positions)[]) {
      spyOn(element.querySelector(`#${id}`)!, 'getBoundingClientRect').and.callFake(() => positions[id]);
    }
    window.dispatchEvent(new Event('scroll')); await frame(); await frame();
    expect(header.activeSection()).toBe('calculator');
    positions.calculator = new DOMRect(0, -280, 1000, anchor + 258);
    positions.trends = new DOMRect(0, anchor, 1000, 600);
    window.dispatchEvent(new Event('scroll')); await frame(); await frame();
    expect(header.activeSection()).toBe('trends');
    const remove = spyOn(window, 'removeEventListener').and.callThrough();
    fixture.destroy();
    expect(remove).toHaveBeenCalledWith('scroll', jasmine.any(Function));
    expect(remove).toHaveBeenCalledWith('resize', jasmine.any(Function));
  });
});
