import { HttpTestingController } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { App } from './app';
import { GoldCalculator } from './components/gold-calculator';
import { PurityExplorer } from './components/purity-explorer';
import { GOLD_PURITIES } from './models/gold-price';
import { GoldPriceService } from './services/gold-price.service';
import { flushGoldPriceResponses, provideGoldPriceHttpTesting } from './testing/gold-price-http';

describe('Explorer calculator integration', () => {
  let fixture: ComponentFixture<App>, element: HTMLElement, calculator: GoldCalculator, scroll: jasmine.Spy;
  let original: { lang: string; dir: string; title: string; className: string; scheme: string };
  beforeEach(async () => {
    original = { lang: document.documentElement.lang, dir: document.documentElement.dir, title: document.title,
      className: document.documentElement.className, scheme: document.documentElement.style.colorScheme };
    spyOn(Storage.prototype, 'getItem').and.returnValue(null); spyOn(Storage.prototype, 'setItem');
    scroll = spyOn(HTMLElement.prototype, 'scrollIntoView');
    await TestBed.configureTestingModule({ imports: [App], providers: provideGoldPriceHttpTesting() }).compileComponents();
    flushGoldPriceResponses(); fixture = TestBed.createComponent(App); element = fixture.nativeElement; fixture.detectChanges();
    calculator = fixture.debugElement.query(By.directive(GoldCalculator)).componentInstance as GoldCalculator;
  });
  afterEach(() => {
    TestBed.inject(HttpTestingController).verify(); fixture.destroy();
    document.documentElement.lang = original.lang; document.documentElement.dir = original.dir; document.title = original.title;
    document.documentElement.className = original.className; document.documentElement.style.colorScheme = original.scheme;
  });
  it('sits between price cards and calculator without adding a navigation link or preview callout', () => {
    const cards = element.querySelector('app-todays-prices')!;
    expect(cards.nextElementSibling?.tagName).toBe('APP-PURITY-EXPLORER');
    expect(cards.nextElementSibling?.nextElementSibling?.tagName).toBe('APP-GOLD-CALCULATOR');
    expect(element.querySelector('.header-nav a[href="#purity-explorer"]')).toBeNull();
    expect(element.textContent).not.toContain('Select a karat to update the breakdown');
  });
  for (const purity of GOLD_PURITIES) {
    it(`hands ${purity}K to the calculator, preserving weight, clearing stale results, scrolling and focusing for keyboard users`, () => {
      const weight = element.querySelector<HTMLInputElement>('#gold-weight')!;
      weight.value = '2.5'; weight.dispatchEvent(new Event('input', { bubbles: true }));
      element.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true })); fixture.detectChanges();
      expect(calculator.result).not.toBeNull();
      element.querySelector<HTMLButtonElement>(`[data-explorer-purity="${purity}"]`)!.click(); fixture.detectChanges();
      const field = element.querySelector<HTMLSelectElement>('#gold-purity')!;
      const focus = spyOn(field, 'focus').and.callThrough();
      element.querySelector<HTMLButtonElement>('.explorer-use-button')!.click(); fixture.detectChanges();
      expect(calculator.selectedPurity).toBe(purity); expect(field.value).toBe(String(purity)); expect(weight.value).toBe('2.5');
      expect(calculator.result).toBeNull(); expect(calculator.error).toBe('');
      expect(focus).toHaveBeenCalledWith({ preventScroll: true }); expect(document.activeElement).toBe(field);
      expect(scroll).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
      expect(scroll.calls.mostRecent().object === element.querySelector('#calculator')).toBeTrue();
      const service = TestBed.inject(GoldPriceService);
      const explorer = fixture.debugElement.query(By.directive(PurityExplorer)).componentInstance as PurityExplorer;
      expect(explorer.price()).toBe(service.latest!.prices[purity]);
      expect(explorer.sampleDate()).toBe(service.history[0].date);
      expect(element.querySelector('.explorer-price > bdi')?.textContent).toBe(element.querySelector(`#price-${purity}`)?.closest('article')?.querySelector('.price-value')?.textContent?.trim());
      TestBed.inject(HttpTestingController).expectNone(() => true);
    });
  }
  it('clears errors on pointer activation, preserves weight, does not steal focus and honors reduced motion', () => {
    const weight = element.querySelector<HTMLInputElement>('#gold-weight')!;
    weight.value = '0'; weight.dispatchEvent(new Event('input', { bubbles: true }));
    element.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true })); fixture.detectChanges();
    expect(calculator.error).not.toBe('');
    spyOn(window, 'matchMedia').and.returnValue({ matches: true } as MediaQueryList);
    const focus = spyOn(element.querySelector<HTMLSelectElement>('#gold-purity')!, 'focus');
    element.querySelector('.explorer-use-button')!.dispatchEvent(new MouseEvent('click', { detail: 1 })); fixture.detectChanges();
    expect(weight.value).toBe('0'); expect(calculator.error).toBe(''); expect(calculator.result).toBeNull();
    expect(focus).not.toHaveBeenCalled(); expect(scroll).toHaveBeenCalledWith({ behavior: 'instant', block: 'start' });
  });
});
