import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GoldCalculator } from './gold-calculator';
import { GoldPriceService } from '../services/gold-price.service';
import { flushGoldPriceResponses, provideGoldPriceHttpTesting } from '../testing/gold-price-http';
import { formatNumber, formatPrice } from '../services/gold-price-format';

describe('GoldCalculator', () => {
  let fixture: ComponentFixture<GoldCalculator>;
  let component: GoldCalculator;
  let element: HTMLElement;
  let weight: HTMLInputElement;
  let purity: HTMLSelectElement;
  let form: HTMLFormElement;
  let prices: GoldPriceService;

  beforeEach(async () => {
    spyOn(Storage.prototype, 'getItem').and.returnValue(null);
    await TestBed.configureTestingModule({ imports: [GoldCalculator], providers: provideGoldPriceHttpTesting() }).compileComponents();
    flushGoldPriceResponses();
    fixture = TestBed.createComponent(GoldCalculator);
    component = fixture.componentInstance;
    element = fixture.nativeElement;
    fixture.detectChanges();
    weight = element.querySelector<HTMLInputElement>('#gold-weight')!;
    purity = element.querySelector<HTMLSelectElement>('#gold-purity')!;
    form = element.querySelector('form')!;
    prices = TestBed.inject(GoldPriceService);
  });

  function enterWeight(value: string): void {
    weight.value = value;
    weight.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
  }

  function selectPurity(value: number): void {
    purity.value = String(value);
    purity.dispatchEvent(new Event('change', { bubbles: true }));
    fixture.detectChanges();
  }

  function submit(): void {
    const event = new Event('submit', { bubbles: true, cancelable: true });
    form.dispatchEvent(event);
    fixture.detectChanges();
    expect(event.defaultPrevented).toBeTrue();
  }

  it('uses the shared purity list, defaults to 24K and starts empty', () => {
    expect(Array.from(purity.options, option => Number(option.value))).toEqual([...prices.purities]);
    expect(purity.value).toBe('24');
    expect(component.result).toBeNull();
    expect(element.querySelector('.result-value')?.textContent).toBe('—');
    expect(element.querySelector('.calculation-details')).toBeNull();
    expect(form.noValidate).toBeTrue();
    expect(weight.step).toBe('any');
  });

  it('gives the visual empty-state symbol a nameable semantic role', () => {
    const empty = element.querySelector('.result-value')!;
    expect(empty.getAttribute('role')).toBe('img');
    expect(empty.getAttribute('aria-label')).toBeTruthy();
    expect(element.querySelector('.calculator-result')?.getAttribute('aria-live')).toBe('polite');
    enterWeight('1'); submit();
    expect(element.querySelector('.result-value')?.hasAttribute('role')).toBeFalse();
    expect(element.querySelector('.result-value')?.hasAttribute('aria-label')).toBeFalse();
  });

  for (const karat of [18, 21, 22, 24] as const) {
    it(`calculates ${karat}K using the latest shared sample price`, () => {
      selectPurity(karat);
      enterWeight('2.5');
      expect(component.result).toBeNull();
      submit();
      const price = prices.latest!.prices[karat];
      expect(component.result).toEqual({ purity: karat, weight: 2.5, pricePerGram: price, total: 2.5 * price });
      const displayedTotals = { 18: 96, 21: 112, 22: 117.333, 24: 128 };
      expect(element.querySelector('.result-value')?.textContent?.trim()).toBe(formatPrice(displayedTotals[karat]));
      const details = element.querySelectorAll('.calculation-details dd');
      expect(details[0].textContent).toContain(formatNumber(karat));
      expect(details[1].textContent).toContain(formatNumber(2.5));
      expect(details[2].textContent).toContain(formatPrice(price));
      expect(component.error).toBe('');
    });
  }

  it('retains decimal precision and only rounds the displayed total', () => {
    selectPurity(22);
    enterWeight('2.34567');
    submit();
    const total = 2.34567 * prices.latest!.prices[22];
    expect(component.result?.total).toBe(total);
    expect(component.result?.total).not.toBe(Number(total.toFixed(3)));
    expect(component.result?.weight).toBe(2.34567);
    expect(element.querySelector('.result-value')?.textContent?.trim()).toBe(formatPrice(total));
    expect(element.querySelector('.calculation-details')?.textContent).toContain(formatNumber(2.34567));
  });

  it('accepts small positive weights with more than two decimal places', () => {
    enterWeight('0.00001');
    submit();
    expect(component.result?.total).toBe(0.00001 * prices.latest!.prices[24]);
    expect(element.querySelector('.result-value')?.textContent?.trim()).toBe(formatPrice(0.001));
  });

  it('calculates through the native submit button', () => {
    enterWeight('1');
    element.querySelector<HTMLButtonElement>('button[type="submit"]')!.click();
    fixture.detectChanges();
    expect(component.result?.total).toBe(prices.latest!.prices[24]);
  });

  for (const invalid of ['', '0', '-2', 'abc', 'NaN', 'Infinity', '-Infinity', '1e309']) {
    it(`rejects invalid weight ${JSON.stringify(invalid)} with an associated Arabic alert`, () => {
      enterWeight(invalid);
      submit();
      expect(component.result).toBeNull();
      expect(component.error).toContain('أدخل وزناً صالحاً أكبر من صفر');
      expect(element.querySelector('.result-value')?.textContent).toBe('—');
      expect(weight.getAttribute('aria-invalid')).toBe('true');
      expect(weight.getAttribute('aria-describedby')?.split(' ')).toContain('calculator-error');
      expect(element.querySelector('#calculator-error')?.getAttribute('role')).toBe('alert');
      expect(element.querySelector('#calculator-error')?.textContent).toBe(component.error);
    });
  }

  it('rejects non-finite numeric values before computing a result', () => {
    const numericValue = spyOnProperty(weight, 'valueAsNumber', 'get');
    for (const value of [NaN, Infinity, -Infinity]) {
      numericValue.and.returnValue(value);
      submit();
      expect(component.result).toBeNull();
      expect(component.error).toContain('أدخل وزناً صالحاً');
    }
  });

  it('rejects an overflowing total even when the weight itself is finite', () => {
    enterWeight('1e308');
    expect(Number.isFinite(weight.valueAsNumber)).toBeTrue();
    submit();
    expect(component.result).toBeNull();
    expect(component.error).toContain('أدخل وزناً أصغر');
    expect(weight.getAttribute('aria-invalid')).toBe('true');
  });

  it('clears a previous result immediately when the weight changes without recalculating', () => {
    enterWeight('2');
    submit();
    expect(component.result).not.toBeNull();
    enterWeight('3');
    expect(component.result).toBeNull();
    expect(element.querySelector('.result-value')?.textContent).toBe('—');
    expect(element.querySelector('.calculation-details')).toBeNull();
    expect(component.error).toBe('');
    submit();
    expect(component.result?.weight).toBe(3);
  });

  it('clears a previous result immediately when the purity changes without recalculating', () => {
    enterWeight('2');
    submit();
    selectPurity(18);
    expect(component.result).toBeNull();
    expect(element.querySelector('.result-value')?.textContent).toBe('—');
    expect(component.error).toBe('');
    submit();
    expect(component.result?.pricePerGram).toBe(prices.latest!.prices[18]);
  });

  it('clears validation and invalid state when either input changes', () => {
    submit();
    expect(component.error).not.toBe('');
    enterWeight('1');
    expect(component.error).toBe('');
    expect(weight.getAttribute('aria-invalid')).toBeNull();
    expect(component.result).toBeNull();
    enterWeight('0');
    submit();
    selectPurity(21);
    expect(component.error).toBe('');
    expect(weight.getAttribute('aria-invalid')).toBeNull();
    expect(component.result).toBeNull();
  });

  it('labels sample prices and fees and exposes a persistent result live region', () => {
    const note = element.querySelector('#calculator-note')!;
    expect(note.textContent).toContain('أسعار تجريبية');
    expect(note.textContent).toContain('لا يشمل المصنعية أو الرسوم الأخرى');
    expect(note.querySelector('time')?.dateTime).toBe(prices.sampleDate!);
    expect(element.querySelector('.calculator-result')?.getAttribute('role')).toBe('status');
    expect(element.querySelector('.calculator-result')?.getAttribute('aria-live')).toBe('polite');
    expect(element.querySelector('label[for="gold-weight"]')).not.toBeNull();
    expect(element.querySelector('label[for="gold-purity"]')).not.toBeNull();
  });
});
