import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { THEME_STORAGE_KEY, ThemeService } from './theme.service';

describe('ThemeService', () => {
  let getItem: jasmine.Spy;
  let setItem: jasmine.Spy;
  let originalClass: string;
  let originalScheme: string;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    originalClass = document.documentElement.className;
    originalScheme = document.documentElement.style.colorScheme;
    getItem = spyOn(Storage.prototype, 'getItem').and.returnValue(null);
    setItem = spyOn(Storage.prototype, 'setItem');
  });

  afterEach(() => {
    document.documentElement.className = originalClass;
    document.documentElement.style.colorScheme = originalScheme;
  });

  it('defaults to light with no saved preference, regardless of the OS or a stale root class', () => {
    document.documentElement.classList.add('dark');
    const media = spyOn(window, 'matchMedia').and.returnValue({ matches: true } as MediaQueryList);
    const service = TestBed.inject(ThemeService);
    expect(service.theme()).toBe('light');
    expect(getItem).toHaveBeenCalledWith(THEME_STORAGE_KEY);
    expect(document.documentElement.classList.contains('dark')).toBeFalse();
    expect(document.documentElement.style.colorScheme).toBe('light');
    expect(media).not.toHaveBeenCalled();
    expect(setItem).not.toHaveBeenCalled();
  });

  it('toggles the existing dark class and color-scheme and explicitly persists both preferences', () => {
    const service = TestBed.inject(ThemeService);
    document.documentElement.classList.add('theme-test-unrelated');
    service.toggle();
    expect(service.theme()).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBeTrue();
    expect(document.documentElement.style.colorScheme).toBe('dark');
    expect(setItem).toHaveBeenCalledWith(THEME_STORAGE_KEY, 'dark');
    service.toggle();
    expect(service.theme()).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBeFalse();
    expect(document.documentElement.classList.contains('theme-test-unrelated')).toBeTrue();
    expect(document.documentElement.style.colorScheme).toBe('light');
    expect(setItem).toHaveBeenCalledWith(THEME_STORAGE_KEY, 'light');
  });

  for (const theme of ['light', 'dark'] as const) {
    it(`restores an explicit ${theme} preference`, () => {
      getItem.and.returnValue(theme);
      const service = TestBed.inject(ThemeService);
      expect(service.theme()).toBe(theme);
      expect(document.documentElement.classList.contains('dark')).toBe(theme === 'dark');
      expect(document.documentElement.style.colorScheme).toBe(theme);
    });
  }

  for (const value of ['', 'system', 'DARK', 'invalid', 'en']) {
    it(`falls back to light for invalid stored value ${JSON.stringify(value)}`, () => {
      getItem.and.returnValue(value);
      expect(TestBed.inject(ThemeService).theme()).toBe('light');
      expect(document.documentElement.classList.contains('dark')).toBeFalse();
      expect(document.documentElement.style.colorScheme).toBe('light');
    });
  }

  it('restores the saved selection after recreating the service, as on reload', () => {
    const storage = new Map<string, string>();
    getItem.and.callFake((key: string) => storage.get(key) ?? null);
    setItem.and.callFake((key: string, value: string) => storage.set(key, value));
    TestBed.inject(ThemeService).setTheme('dark');
    const restored = TestBed.runInInjectionContext(() => new ThemeService());
    expect(restored.theme()).toBe('dark');
  });

  it('defaults and switches when storage reads and writes throw', () => {
    getItem.and.throwError('Storage denied');
    setItem.and.throwError('Quota exceeded');
    const service = TestBed.inject(ThemeService);
    expect(service.theme()).toBe('light');
    expect(() => service.toggle()).not.toThrow();
    expect(service.theme()).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBeTrue();
    expect(document.documentElement.style.colorScheme).toBe('dark');
  });

  it('handles an inaccessible localStorage property', () => {
    spyOnProperty(window, 'localStorage', 'get').and.throwError('SecurityError');
    const service = TestBed.inject(ThemeService);
    expect(service.theme()).toBe('light');
    expect(() => service.toggle()).not.toThrow();
    expect(service.theme()).toBe('dark');
  });

  it('works without a browser window or storage', () => {
    const isolatedDocument = document.implementation.createHTMLDocument();
    TestBed.overrideProvider(DOCUMENT, { useValue: isolatedDocument });
    const service = TestBed.inject(ThemeService);
    expect(service.theme()).toBe('light');
    expect(() => service.toggle()).not.toThrow();
    expect(isolatedDocument.documentElement.classList.contains('dark')).toBeTrue();
    expect(isolatedDocument.documentElement.style.colorScheme).toBe('dark');
  });
});
