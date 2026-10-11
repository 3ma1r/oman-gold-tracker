import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { GoldPriceService } from './services/gold-price.service';
import { formatNumber, formatPrice, formatSampleDate } from './services/gold-price-format';

describe('App', () => {
  beforeEach(async () => {
    spyOn(Storage.prototype, 'getItem').and.returnValue(null);
    await TestBed.configureTestingModule({
      imports: [App],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render the Arabic page and all 30 sample history rows newest first', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('أسعار الذهب في عُمان');
    expect(compiled.querySelectorAll('app-price-card').length).toBe(4);
    const service = TestBed.inject(GoldPriceService);
    const rows = compiled.querySelectorAll<HTMLTableRowElement>('tbody tr');
    expect(rows.length).toBe(30);
    rows.forEach((row, index) => {
      expect(row.querySelector('time')?.dateTime).toBe(service.history[index].date);
      const cells = row.querySelectorAll('td');
      [24, 22, 21, 18].forEach((purity, column) => {
        const value = service.history[index].prices[purity as 18 | 21 | 22 | 24];
        expect(cells[column].textContent?.trim()).toBe(formatPrice(value));
      });
    });
    expect(compiled.querySelector('#history')?.textContent).toContain('البيانات التجريبية');
  });

  it('shows the same three-decimal prices on cards and the newest history row for every purity', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const service = TestBed.inject(GoldPriceService);
    const cards = compiled.querySelectorAll('app-price-card');
    const newestCells = compiled.querySelectorAll('tbody tr:first-child td');
    const displayedPurities = [24, 22, 21, 18] as const;

    displayedPurities.forEach((purity, index) => {
      const expected = formatPrice(service.latest.prices[purity]);
      expect(cards[index].querySelector('h3')?.textContent).toContain(formatNumber(purity));
      expect(cards[index].querySelector('.price-value')?.textContent?.trim()).toBe(expected);
      expect(newestCells[index].textContent?.trim()).toBe(expected);
    });
  });

  it('uses the final dataset date in the hero and labels card prices as samples', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const service = TestBed.inject(GoldPriceService);
    const heroDate = compiled.querySelector<HTMLTimeElement>('app-hero time');
    const pricesDate = compiled.querySelector<HTMLTimeElement>('#prices time');

    expect(heroDate?.dateTime).toBe(service.history[0].date);
    expect(heroDate?.textContent).toBe(formatSampleDate(service.sampleDate));
    expect(pricesDate?.dateTime).toBe(heroDate?.dateTime);
    expect(compiled.querySelector('.price-data-note')?.textContent).toContain('ليست أسعار السوق الحالية');
  });

  it('calculates with the same latest price displayed by each card and history column', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const selector = compiled.querySelector<HTMLSelectElement>('#gold-purity')!;
    const weight = compiled.querySelector<HTMLInputElement>('#gold-weight')!;
    const form = compiled.querySelector<HTMLFormElement>('#calculator form')!;
    const cards = compiled.querySelectorAll('app-price-card .price-value');
    const cells = compiled.querySelectorAll('tbody tr:first-child td');

    [24, 22, 21, 18].forEach((purity, index) => {
      selector.value = String(purity);
      selector.dispatchEvent(new Event('change', { bubbles: true }));
      weight.value = '1';
      weight.dispatchEvent(new Event('input', { bubbles: true }));
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      fixture.detectChanges();
      const total = compiled.querySelector('.result-value')?.textContent?.trim();
      expect(total).toBe(cards[index].textContent?.trim());
      expect(total).toBe(cells[index].textContent?.trim());
    });
  });

  it('preserves the initial calculator empty state and renders the sample chart', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector<HTMLButtonElement>('.calculate-button')?.disabled).toBeFalse();
    expect(compiled.querySelector('.result-value')?.textContent).toBe('—');
    expect(compiled.querySelectorAll('.trend-stats dd').length).toBe(3);
    expect(compiled.querySelector('.price-chart polyline')?.getAttribute('points')?.split(' ').length).toBe(30);
    expect(compiled.querySelector('.chart-empty')).toBeNull();
  });

  it('matches the latest chart price to each purity card and newest history row', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const cards = compiled.querySelectorAll('app-price-card .price-value');
    const cells = compiled.querySelectorAll('tbody tr:first-child td');

    [24, 22, 21, 18].forEach((purity, index) => {
      compiled.querySelector<HTMLButtonElement>(`#trends button[data-purity="${purity}"]`)!.click();
      fixture.detectChanges();
      const latest = compiled.querySelector('.trend-stats dd')?.textContent?.trim();
      expect(latest).toBe(cards[index].textContent?.trim());
      expect(latest).toBe(cells[index].textContent?.trim());
    });
  });
});
