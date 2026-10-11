import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { TRANSLATIONS, TranslationKey } from '../data/translations';
import { LANGUAGE_STORAGE_KEY, LanguageService } from './language.service';
import { formatCurrency, formatNumber, formatPercentage, formatPrice, formatSampleDate } from './gold-price-format';

describe('LanguageService', () => {
  let getItem: jasmine.Spy;
  let setItem: jasmine.Spy;
  let original: { lang: string; dir: string; title: string };

  beforeEach(() => {
    TestBed.configureTestingModule({});
    original = { lang: document.documentElement.lang, dir: document.documentElement.dir, title: document.title };
    getItem = spyOn(Storage.prototype, 'getItem').and.returnValue(null);
    setItem = spyOn(Storage.prototype, 'setItem');
  });

  afterEach(() => {
    document.documentElement.lang = original.lang;
    document.documentElement.dir = original.dir;
    document.title = original.title;
  });

  it('defaults to Arabic on the first visit and sets document language, direction and title', () => {
    const service = TestBed.inject(LanguageService);
    expect(getItem).toHaveBeenCalledWith(LANGUAGE_STORAGE_KEY);
    expect(service.language()).toBe('ar');
    expect(service.direction()).toBe('rtl');
    expect(document.documentElement.lang).toBe('ar');
    expect(document.documentElement.dir).toBe('rtl');
    expect(document.title).toBe(TRANSLATIONS.ar.documentTitle);
  });

  it('switches both ways, saves the preference and updates document attributes synchronously', () => {
    const service = TestBed.inject(LanguageService);
    service.toggle();
    expect(service.language()).toBe('en');
    expect(service.direction()).toBe('ltr');
    expect(document.documentElement.lang).toBe('en');
    expect(document.documentElement.dir).toBe('ltr');
    expect(document.title).toBe(TRANSLATIONS.en.documentTitle);
    expect(setItem).toHaveBeenCalledWith(LANGUAGE_STORAGE_KEY, 'en');
    service.toggle();
    expect(service.language()).toBe('ar');
    expect(document.documentElement.lang).toBe('ar');
    expect(document.documentElement.dir).toBe('rtl');
    expect(document.title).toBe(TRANSLATIONS.ar.documentTitle);
    expect(setItem).toHaveBeenCalledWith(LANGUAGE_STORAGE_KEY, 'ar');
  });

  for (const language of ['ar', 'en'] as const) {
    it(`restores a stored ${language} preference`, () => {
      getItem.and.returnValue(language);
      const service = TestBed.inject(LanguageService);
      expect(service.language()).toBe(language);
      expect(document.documentElement.lang).toBe(language);
      expect(document.documentElement.dir).toBe(language === 'ar' ? 'rtl' : 'ltr');
      expect(document.title).toBe(TRANSLATIONS[language].documentTitle);
    });
  }

  it('restores the saved selection when the service is created again, as after a reload', () => {
    const storage = new Map<string, string>();
    getItem.and.callFake((key: string) => storage.get(key) ?? null);
    setItem.and.callFake((key: string, value: string) => storage.set(key, value));
    TestBed.inject(LanguageService).setLanguage('en');
    const restored = TestBed.runInInjectionContext(() => new LanguageService());
    expect(restored.language()).toBe('en');
  });

  it('falls back to Arabic for an unsupported stored value', () => {
    getItem.and.returnValue('fr');
    expect(TestBed.inject(LanguageService).language()).toBe('ar');
  });

  it('still defaults and switches when storage reads and writes throw', () => {
    getItem.and.throwError('Storage denied');
    setItem.and.throwError('Quota exceeded');
    const service = TestBed.inject(LanguageService);
    expect(service.language()).toBe('ar');
    expect(() => service.toggle()).not.toThrow();
    expect(service.language()).toBe('en');
    expect(document.documentElement.dir).toBe('ltr');
  });

  it('handles an inaccessible localStorage property', () => {
    spyOnProperty(window, 'localStorage', 'get').and.throwError('SecurityError');
    const service = TestBed.inject(LanguageService);
    expect(service.language()).toBe('ar');
    expect(() => service.toggle()).not.toThrow();
    expect(service.language()).toBe('en');
  });

  it('works when the document has no browser window or storage', () => {
    const isolatedDocument = document.implementation.createHTMLDocument();
    TestBed.overrideProvider(DOCUMENT, { useValue: isolatedDocument });
    const service = TestBed.inject(LanguageService);
    expect(service.language()).toBe('ar');
    expect(() => service.toggle()).not.toThrow();
    expect(isolatedDocument.documentElement.lang).toBe('en');
    expect(isolatedDocument.documentElement.dir).toBe('ltr');
  });

  it('has matching, nonempty translation keys and interpolation parameters in both languages', () => {
    const keys = Object.keys(TRANSLATIONS.ar) as TranslationKey[];
    expect(Object.keys(TRANSLATIONS.en).sort()).toEqual([...keys].sort());
    for (const key of keys) {
      expect(TRANSLATIONS.ar[key].trim()).withContext(key).not.toBe('');
      expect(TRANSLATIONS.en[key].trim()).withContext(key).not.toBe('');
      const parameters = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort();
      expect(parameters(TRANSLATIONS.en[key])).withContext(key).toEqual(parameters(TRANSLATIONS.ar[key]));
    }
  });

  it('localizes numbers, currency, percentages and dates without changing numeric inputs', () => {
    const service = TestBed.inject(LanguageService);
    for (const language of ['ar', 'en'] as const) {
      service.setLanguage(language);
      expect(service.number(2.34567)).toBe(formatNumber(2.34567, language));
      expect(service.price(51.2)).toBe(formatPrice(51.2, language));
      expect(service.currency(51.2)).toBe(formatCurrency(51.2, language));
      expect(service.percentage(20)).toBe(formatPercentage(20, language));
      expect(service.date('2025-04-27')).toBe(formatSampleDate('2025-04-27', language));
    }
  });
});

describe('Localized gold formatting', () => {
  it('uses Arabic and English digits/separators and preserves exactly three decimal places', () => {
    expect(formatPrice(51.2, 'ar')).toBe('٥١٫٢٠٠');
    expect(formatPrice(51.2, 'en')).toBe('51.200');
    expect(formatPrice(1234.5678, 'ar')).toBe('١٬٢٣٤٫٥٦٨');
    expect(formatPrice(1234.5678, 'en')).toBe('1,234.568');
    expect(formatPrice(0.00001, 'en')).toBe('0.000');
    expect(formatNumber(2.34567, 'ar')).toBe('٢٫٣٤٥٦٧');
    expect(formatNumber(2.34567, 'en')).toBe('2.34567');
    expect(formatCurrency(51.2, 'ar')).toContain('٥١٫٢٠٠');
    expect(formatCurrency(51.2, 'en')).toContain('51.200');
    expect(formatCurrency(51.2, 'en')).toContain('OMR');
    expect(formatPercentage(20, 'ar')).toContain('٢٠٫٠٠٪');
    expect(formatPercentage(20, 'en')).toBe('20.00%');
    expect(formatPrice(null)).toBe('—');
    expect(formatPercentage(null)).toBe('—');
  });

  it('formats date-only values and Gregorian leap/month boundaries without timestamp parsing', () => {
    const date = spyOn(window, 'Date').and.throwError('Date conversion must not be used');
    expect(formatSampleDate('2025-03-29', 'en')).toBe('29 March 2025');
    expect(formatSampleDate('2025-04-01', 'ar')).toBe('١ أبريل ٢٠٢٥');
    expect(formatSampleDate('2024-02-29', 'en')).toBe('29 February 2024');
    expect(formatSampleDate('2025-12-31', 'ar')).toBe('٣١ ديسمبر ٢٠٢٥');
    expect(date).not.toHaveBeenCalled();
  });
});
