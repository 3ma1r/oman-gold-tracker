import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { GoldPriceService } from './services/gold-price.service';
import { formatSampleDate } from './services/gold-price-format';

describe('App', () => {
  beforeEach(async () => {
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
        expect(cells[column].textContent?.trim()).toBe(value.toFixed(3));
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
      const expected = service.latest.prices[purity].toFixed(3);
      expect(cards[index].querySelector('h3')?.textContent).toContain(String(purity));
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

  it('preserves the inactive calculator and chart placeholder', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector<HTMLButtonElement>('.calculate-button')?.disabled).toBeTrue();
    expect(compiled.querySelector('.result-value')?.textContent).toBe('—');
    expect(compiled.querySelectorAll('.trend-stats dd').length).toBe(3);
    compiled.querySelectorAll('.trend-stats dd').forEach(stat => expect(stat.textContent).toBe('—'));
    expect(compiled.querySelector('.chart-empty')?.textContent).toContain('لا توجد بيانات للرسم البياني بعد');
  });
});
