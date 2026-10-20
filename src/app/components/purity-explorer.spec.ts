import { HttpTestingController } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DailyGoldPrice, DateOnly, GOLD_PURITIES } from '../models/gold-price';
import { GoldPriceService } from '../services/gold-price.service';
import { LanguageService } from '../services/language.service';
import { ThemeService } from '../services/theme.service';
import { flushGoldPriceResponses, goldPriceResponses, provideGoldPriceHttpTesting, TEST_API_BASE_URL } from '../testing/gold-price-http';
import { PurityExplorer } from './purity-explorer';

const API_DAYS: readonly DailyGoldPrice[] = Array.from({ length: 30 }, (_, index) => ({
  date: `2036-08-${String(index + 1).padStart(2, '0')}` as DateOnly,
  // Intentionally not locally derived: prices must be the API's numeric values.
  prices: { 18: 20.123 + index, 21: 30.234 + index, 22: 40.345 + index, 24: 50.456 + index },
}));

describe('PurityExplorer', () => {
  let fixture: ComponentFixture<PurityExplorer>, component: PurityExplorer, element: HTMLElement, http: HttpTestingController;
  let original: { lang: string; dir: string; title: string; className: string; scheme: string };
  beforeEach(async () => {
    original = { lang: document.documentElement.lang, dir: document.documentElement.dir, title: document.title,
      className: document.documentElement.className, scheme: document.documentElement.style.colorScheme };
    spyOn(Storage.prototype, 'getItem').and.returnValue(null); spyOn(Storage.prototype, 'setItem');
    await TestBed.configureTestingModule({ imports: [PurityExplorer], providers: provideGoldPriceHttpTesting() }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(PurityExplorer); component = fixture.componentInstance;
    element = fixture.nativeElement; fixture.detectChanges();
  });
  afterEach(() => {
    http.verify(); fixture.destroy(); document.documentElement.lang = original.lang; document.documentElement.dir = original.dir;
    document.title = original.title; document.documentElement.className = original.className;
    document.documentElement.style.colorScheme = original.scheme;
  });
  function choose(purity: number) {
    element.querySelector<HTMLButtonElement>(`[data-explorer-purity="${purity}"]`)!.click(); fixture.detectChanges();
  }
  function requests() {
    return { latest: http.expectOne(`${TEST_API_BASE_URL}/api/gold-prices`), history: http.expectOne(`${TEST_API_BASE_URL}/api/gold-prices/history`) };
  }

  it('defaults to 18K with four native keyboard-accessible buttons, even while prices load', () => {
    const lang = TestBed.inject(LanguageService);
    expect(component.selectedPurity()).toBe(18);
    const buttons = element.querySelectorAll<HTMLButtonElement>('.explorer-purity-button');
    expect([...buttons].map(button => button.dataset['explorerPurity'])).toEqual(['18', '21', '22', '24']);
    buttons.forEach(button => { expect(button.type).toBe('button'); expect(button.tabIndex).toBe(0); expect(button.disabled).toBeFalse(); });
    expect(element.querySelectorAll('.explorer-purity-button[aria-pressed="true"]').length).toBe(1);
    expect(element.querySelector('.explorer-tabs')?.getAttribute('aria-label')).toBe(lang.t('explorerSelection'));
    expect(element.querySelector('.explorer-model-note')?.textContent).toBe(lang.t('explorerModelNote'));
    expect(element.querySelector('.explorer-price-panel')?.getAttribute('aria-busy')).toBe('true');
    expect(element.querySelector('.explorer-price > bdi')?.textContent).toBe('—');
    expect(element.querySelector('.explorer-availability')?.textContent).toBe(lang.t('explorerPriceLoading'));
    const emitted = jasmine.createSpy('use'); component.useInCalculator.subscribe(emitted);
    component.usePrice(new MouseEvent('click')); expect(emitted).not.toHaveBeenCalled();
    flushGoldPriceResponses(API_DAYS);
  });

  for (const [purity, gold, other] of [[18, .75, .25], [21, .875, .125], [22, 22 / 24, 2 / 24], [24, 1, 0]] as const) {
    it(`draws the correct ${purity}K ratio and exactly ${purity} gold tiles plus ${24 - purity} taupe tiles`, () => {
      flushGoldPriceResponses(API_DAYS); choose(purity);
      expect(component.goldFraction()).toBeCloseTo(gold, 12); expect(component.otherFraction()).toBeCloseTo(other, 12);
      expect(component.goldFraction() + component.otherFraction()).toBeCloseTo(1, 12);
      expect(element.querySelectorAll('.explorer-tile').length).toBe(24);
      expect(element.querySelectorAll('.explorer-tile-gold').length).toBe(purity);
      expect(element.querySelectorAll('.explorer-tile:not(.explorer-tile-gold)').length).toBe(24 - purity);
      expect(element.querySelector('.explorer-gold-ring')?.getAttribute('pathLength')).toBe('24');
      expect(element.querySelector('.explorer-gold-ring')?.getAttribute('stroke-dasharray')).toBe(`${purity} ${24 - purity}`);
      expect(element.querySelector('.explorer-tiles')?.getAttribute('aria-hidden')).toBe('true');
      for (const language of ['ar', 'en'] as const) {
        const lang = TestBed.inject(LanguageService); lang.setLanguage(language); fixture.detectChanges();
        const prefix = purity === 22 ? '≈ ' : '';
        expect(component.goldPercentage()).toBe(prefix + lang.percentage(gold * 100));
        expect(component.otherPercentage()).toBe(prefix + lang.percentage(other * 100));
        const legend = element.querySelectorAll('.explorer-legend li');
        expect(legend[0].textContent).toContain(lang.t('explorerGold')); expect(legend[0].textContent).toContain(component.goldPercentage());
        expect(legend[1].textContent).toContain(lang.t('explorerOther')); expect(legend[1].textContent).toContain(component.otherPercentage());
        expect(element.querySelector('.explorer-donut svg')?.getAttribute('aria-labelledby')).toBe('explorer-donut-title explorer-donut-description');
        expect(element.querySelector('svg title')?.textContent).toContain(lang.purity(purity));
        expect(element.querySelector('svg desc')?.textContent).toContain(component.goldPercentage());
        expect(element.querySelector('svg desc')?.textContent).toContain(component.otherPercentage());
        expect(element.querySelector('.explorer-parts')?.textContent).toContain(lang.number(24 - purity));
      }
      http.expectNone(() => true);
    });
  }

  it('publishes API prices and ISO dates only after both responses, with three-decimal formatting for every purity', () => {
    const pair = requests(), replies = goldPriceResponses(API_DAYS);
    pair.latest.flush(replies.latest); fixture.detectChanges();
    expect(element.querySelector('.explorer-price > bdi')?.textContent).toBe('—');
    expect(element.querySelector('time')?.getAttribute('datetime')).toBeNull();
    pair.history.flush(replies.history);
    for (const language of ['ar', 'en'] as const) {
      const lang = TestBed.inject(LanguageService); lang.setLanguage(language);
      for (const purity of GOLD_PURITIES) {
        choose(purity);
        expect(component.price()).toBe(API_DAYS[29].prices[purity]);
        expect(element.querySelector('.explorer-price > bdi')?.textContent).toBe(lang.price(API_DAYS[29].prices[purity]));
        expect(element.querySelector('time')?.getAttribute('datetime')).toBe('2036-08-30');
        expect(element.querySelector('time')?.textContent).toBe(lang.date('2036-08-30'));
        expect(element.querySelector('.explorer-price-label')?.textContent).toBe(lang.t('explorerSamplePrice'));
        expect(element.querySelector('.explorer-date')?.textContent).toContain(lang.t('samplePricesAfterDate'));
        expect(element.querySelector<HTMLButtonElement>('.explorer-use-button')?.disabled).toBeFalse();
      }
    }
    http.expectNone(() => true);
  });

  it('preserves selection across language, theme and reload changes without extra requests', () => {
    flushGoldPriceResponses(API_DAYS); choose(22);
    for (const language of ['en', 'ar'] as const) for (const mode of ['dark', 'light'] as const) {
      const lang = TestBed.inject(LanguageService); lang.setLanguage(language); TestBed.inject(ThemeService).setTheme(mode); fixture.detectChanges();
      expect(component.selectedPurity()).toBe(22);
      expect(element.querySelector('[aria-pressed="true"]')?.getAttribute('data-explorer-purity')).toBe('22');
      expect(element.querySelector('.explorer-use-button')?.textContent).toBe(lang.t('explorerUse', { purity: lang.purity(22) }));
    }
    http.expectNone(() => true);
    TestBed.inject(GoldPriceService).retry(); fixture.detectChanges();
    expect(component.selectedPurity()).toBe(22); expect(component.price()).toBeNull();
    flushGoldPriceResponses(API_DAYS); fixture.detectChanges(); expect(component.selectedPurity()).toBe(22);
  });

  for (const failure of ['network', 'inconsistent'] as const) {
    it(`keeps explanations usable but prices and calculator action unavailable after ${failure} failure`, () => {
      const pair = requests();
      if (failure === 'network') pair.latest.error(new ProgressEvent('error'));
      else { const replies = goldPriceResponses(API_DAYS); pair.latest.flush(replies.latest); pair.history.flush({ ...replies.history, endDate: '2040-01-01' }); }
      const emitted = jasmine.createSpy('use'); component.useInCalculator.subscribe(emitted);
      for (const purity of GOLD_PURITIES) {
        choose(purity);
        const lang = TestBed.inject(LanguageService);
        expect(component.selectedPurity()).toBe(purity); expect(element.querySelectorAll('.explorer-tile-gold').length).toBe(purity);
        expect(element.querySelector('.explorer-price > bdi')?.textContent).toBe('—');
        expect(element.querySelector('time')?.getAttribute('datetime')).toBeNull();
        expect(element.querySelector('.explorer-availability')?.textContent).toBe(lang.t('explorerPriceUnavailable'));
        expect(element.querySelector<HTMLButtonElement>('.explorer-use-button')?.disabled).toBeTrue();
        component.usePrice(new MouseEvent('click')); expect(emitted).not.toHaveBeenCalled();
      }
      http.expectNone(() => true);
    });
  }

  it('emits the existing calculator handoff shape for pointer and keyboard activation', () => {
    flushGoldPriceResponses(API_DAYS); choose(21);
    const emitted = jasmine.createSpy('use'); component.useInCalculator.subscribe(emitted);
    element.querySelector('.explorer-use-button')!.dispatchEvent(new MouseEvent('click', { detail: 1 }));
    expect(emitted).toHaveBeenCalledWith({ purity: 21, keyboard: false });
    element.querySelector<HTMLButtonElement>('.explorer-use-button')!.click();
    expect(emitted).toHaveBeenCalledWith({ purity: 21, keyboard: true }); http.expectNone(() => true);
  });

  it('does not mistake a valid zero price for missing data', () => {
    const zeroDays = API_DAYS.map(day => ({ ...day, prices: { ...day.prices, 18: 0 } }));
    flushGoldPriceResponses(zeroDays); fixture.detectChanges();
    expect(component.price()).toBe(0); expect(component.canUseCalculator()).toBeTrue();
    expect(element.querySelector('.explorer-price > bdi')?.textContent).toBe(TestBed.inject(LanguageService).price(0));
  });
});
