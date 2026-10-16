import { fakeAsync, TestBed } from '@angular/core/testing';
import { Hero } from './hero';
import { TRANSLATIONS } from '../data/translations';
import { GoldPriceService } from '../services/gold-price.service';
import { flushGoldPriceResponses, provideGoldPriceHttpTesting } from '../testing/gold-price-http';
import { LanguageService } from '../services/language.service';
import { ThemeService } from '../services/theme.service';

describe('Production hero artwork', () => {
  let original: { lang: string; dir: string; title: string; className: string; scheme: string };

  beforeEach(async () => {
    original = {
      lang: document.documentElement.lang, dir: document.documentElement.dir, title: document.title,
      className: document.documentElement.className, scheme: document.documentElement.style.colorScheme,
    };
    spyOn(Storage.prototype, 'getItem').and.returnValue(null);
    spyOn(Storage.prototype, 'setItem');
    await TestBed.configureTestingModule({ imports: [Hero], providers: provideGoldPriceHttpTesting() }).compileComponents();
  });

  afterEach(() => {
    document.documentElement.lang = original.lang;
    document.documentElement.dir = original.dir;
    document.title = original.title;
    document.documentElement.className = original.className;
    document.documentElement.style.colorScheme = original.scheme;
  });

  it('keeps live HTML, the sample badge and actual last data update in both languages/themes', fakeAsync(() => {
    const prices = TestBed.inject(GoldPriceService);
    const language = TestBed.inject(LanguageService);
    const theme = TestBed.inject(ThemeService);
    const fixture = TestBed.createComponent(Hero);
    flushGoldPriceResponses();
    for (const selection of ['ar', 'en'] as const) for (const mode of ['light', 'dark'] as const) {
      language.setLanguage(selection);
      theme.setTheme(mode);
      fixture.detectChanges();
      const element = fixture.nativeElement as HTMLElement;
      expect(element.querySelector('h1')?.textContent).toBe(TRANSLATIONS[selection].heroTitle);
      expect(element.querySelector('.hero-copy p')?.textContent).toBe(TRANSLATIONS[selection].heroDescription);
      expect(element.querySelector('.sample-badge')?.textContent).toContain(TRANSLATIONS[selection].sampleData);
      expect(element.querySelector('.hero-details dt')?.textContent).toBe(selection === 'ar' ? 'آخر تحديث للبيانات' : 'Last data update');
      expect(element.querySelector<HTMLTimeElement>('time')?.dateTime).toBe(prices.days.at(-1)!.date);
      expect(element.querySelector('time')?.textContent).toBe(language.date(prices.sampleDate!));
      expect(element.querySelector('.hero-details > div:last-child dd')?.textContent).toBe(TRANSLATIONS[selection].rialPerGram);
      expect(element.querySelector('.hero-details')?.textContent).toContain('OMR');
      expect(element.querySelector('.hero-details')?.textContent).toContain(TRANSLATIONS[selection].oman);
      const style = getComputedStyle(element.querySelector('.hero-artwork')!);
      expect(style.backgroundImage).toContain('/images/oman-gold-hero.png');
      expect(style.backgroundImage).toContain('linear-gradient');
      expect(style.backgroundSize.split(',').map(size => size.trim())).toEqual(['cover', 'cover']);
      expect(style.filter).toBe('blur(1.5px)');
      expect(element.querySelector('.hero-artwork')?.getAttribute('aria-hidden')).toBe('true');
      expect(getComputedStyle(element.querySelector('.hero-content')!).filter).toBe('none');
      const details = element.querySelector('.hero-details')!.getBoundingClientRect();
      const copy = element.querySelector('.hero-copy')!.getBoundingClientRect();
      expect(element.querySelector('.breadcrumb')).toBeNull();
      expect(copy.left).toBeCloseTo(details.left, 1);
      expect(copy.right).toBeCloseTo(details.right, 1);
      // CSS backgrounds are decorative: no image/accessibility role replaces the semantic text.
      expect(element.querySelector('img, [role="img"]')).toBeNull();
    }
  }));

  it('serves and decodes the original panorama locally with its intact 3:1 aspect ratio', async () => {
    const url = new URL('/images/oman-gold-hero.png', document.baseURI);
    const response = await fetch(url);
    expect(response.ok).toBeTrue();
    expect(response.headers.get('Content-Type')).toContain('image/png');
    const image = new Image();
    image.src = url.href;
    await image.decode();
    expect(image.naturalWidth).toBe(2172);
    expect(image.naturalHeight).toBe(724);
    expect(image.naturalWidth / image.naturalHeight).toBe(3);
    expect(new URL(image.src).origin).toBe(location.origin);
  });
});
