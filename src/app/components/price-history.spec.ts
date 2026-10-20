import { HttpTestingController } from '@angular/common/http/testing';
import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { DailyGoldPrice, DateOnly } from '../models/gold-price';
import { GoldPriceService } from '../services/gold-price.service';
import { LanguageService } from '../services/language.service';
import { ThemeService } from '../services/theme.service';
import { flushGoldPriceResponses, provideGoldPriceHttpTesting, TEST_API_BASE_URL } from '../testing/gold-price-http';
import { createHistoryCsv, PriceHistory } from './price-history';

const API_DAYS: readonly DailyGoldPrice[] = Array.from({ length: 30 }, (_, index) => ({
  date: `2034-03-${String(index + 1).padStart(2, '0')}` as DateOnly,
  prices: { 18: 1234.5 + index, 21: 2345.6 + index, 22: 3456.7 + index, 24: 4567.8 + index },
}));

describe('History CSV content', () => {
  it('exports every row oldest first with ISO dates, English OMR/gram columns, BOM and three decimal points', () => {
    const source = Object.freeze([...API_DAYS].reverse());
    const csv = createHistoryCsv(source)!;
    expect(csv.content.charCodeAt(0)).toBe(0xFEFF);
    const lines = csv.content.slice(1).trimEnd().split('\r\n');
    expect(lines.length).toBe(31);
    expect(lines[0]).toBe('Date,18K (OMR/gram),21K (OMR/gram),22K (OMR/gram),24K (OMR/gram)');
    expect(lines[1]).toBe('2034-03-01,1234.500,2345.600,3456.700,4567.800');
    expect(lines[30]).toBe('2034-03-30,1263.500,2374.600,3485.700,4596.800');
    lines.slice(1).forEach((line, index) => {
      const [date, ...prices] = line.split(','); expect(date).toBe(API_DAYS[index].date);
      expect(prices.length).toBe(4); prices.forEach(price => expect(price).toMatch(/^\d+\.\d{3}$/));
    });
    expect(source[0]).toBe(API_DAYS[29]);
    expect(csv.filename).toBe('sample-gold-prices_2034-03-01_to_2034-03-30.csv');
  });
  it('uses actual history length and range, including a single day, and has no export for empty data', () => {
    expect(createHistoryCsv([])).toBeNull();
    expect(createHistoryCsv(API_DAYS.slice(0, 2))!.content.trimEnd().split('\r\n').length).toBe(3);
    const csv = createHistoryCsv(API_DAYS.slice(3, 4))!;
    expect(csv.filename).toBe('sample-gold-prices_2034-03-04_to_2034-03-04.csv');
    expect(csv.content.trimEnd().split('\r\n').length).toBe(2);
  });
  it('keeps zeros and trailing decimal places without locale separators', () => {
    const csv = createHistoryCsv([{ date: '2034-03-01', prices: { 18: 0, 21: 1.2, 22: 2.345, 24: 1234.567 } }])!;
    expect(csv.content).toContain('2034-03-01,0.000,1.200,2.345,1234.567\r\n');
  });
});

describe('PriceHistory CSV download', () => {
  let fixture: ComponentFixture<PriceHistory>, element: HTMLElement, http: HttpTestingController;
  let createUrl: jasmine.Spy, revoke: jasmine.Spy;
  let downloads: { href: string; filename: string; connected: boolean }[];
  let original: { lang: string; dir: string; title: string; className: string; scheme: string };
  beforeEach(async () => {
    original = { lang: document.documentElement.lang, dir: document.documentElement.dir, title: document.title,
      className: document.documentElement.className, scheme: document.documentElement.style.colorScheme };
    spyOn(Storage.prototype, 'getItem').and.returnValue(null); spyOn(Storage.prototype, 'setItem');
    createUrl = spyOn(URL, 'createObjectURL').and.callFake(() => `blob:history-${createUrl.calls.count()}`);
    revoke = spyOn(URL, 'revokeObjectURL'); downloads = [];
    spyOn(HTMLAnchorElement.prototype, 'click').and.callFake(function(this: HTMLAnchorElement) {
      downloads.push({ href: this.href, filename: this.download, connected: this.isConnected });
    });
    await TestBed.configureTestingModule({ imports: [PriceHistory], providers: provideGoldPriceHttpTesting() }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(PriceHistory); element = fixture.nativeElement; fixture.detectChanges();
  });
  afterEach(() => {
    http.verify(); fixture.destroy();
    document.documentElement.lang = original.lang; document.documentElement.dir = original.dir;
    document.title = original.title; document.documentElement.className = original.className;
    document.documentElement.style.colorScheme = original.scheme;
  });
  it('disables export while loading or failed and guards direct method calls without extra requests', () => {
    expect(element.querySelector<HTMLButtonElement>('.export-csv-button')?.disabled).toBeTrue();
    fixture.componentInstance.exportCsv(); expect(createUrl).not.toHaveBeenCalled();
    const latest = http.expectOne(`${TEST_API_BASE_URL}/api/gold-prices`);
    const history = http.expectOne(`${TEST_API_BASE_URL}/api/gold-prices/history`);
    latest.error(new ProgressEvent('error')); fixture.detectChanges();
    expect(history.cancelled).toBeTrue();
    expect(element.querySelector<HTMLButtonElement>('.export-csv-button')?.disabled).toBeTrue();
    fixture.componentInstance.exportCsv(); expect(createUrl).not.toHaveBeenCalled(); http.expectNone(() => true);
  });
  it('downloads the exact loaded API data, localizes only the button, and releases each object URL', async () => {
    flushGoldPriceResponses(API_DAYS); fixture.detectChanges();
    const expected = createHistoryCsv(API_DAYS)!;
    const before = TestBed.inject(GoldPriceService).history;
    for (const language of ['ar', 'en'] as const) for (const mode of ['light', 'dark'] as const) {
      const lang = TestBed.inject(LanguageService); lang.setLanguage(language);
      TestBed.inject(ThemeService).setTheme(mode); fixture.detectChanges();
      const button = element.querySelector<HTMLButtonElement>('.export-csv-button')!;
      expect(button.textContent).toBe(lang.t('exportCsv')); expect(button.getAttribute('aria-label')).toBe(lang.t('exportCsvLabel'));
      expect(button.type).toBe('button'); expect(button.disabled).toBeFalse(); button.click();
      const blob = createUrl.calls.mostRecent().args[0] as Blob;
      expect(blob.type).toBe('text/csv;charset=utf-8');
      const bytes = new Uint8Array(await blob.arrayBuffer());
      expect([...bytes.slice(0, 3)]).toEqual([0xEF, 0xBB, 0xBF]);
      expect([...bytes]).toEqual([...new TextEncoder().encode(expected.content)]);
      expect(downloads.at(-1)?.filename).toBe(expected.filename); expect(downloads.at(-1)?.connected).toBeTrue();
      expect(document.querySelector('a[download]')).toBeNull();
    }
    await fixture.whenStable();
    expect(revoke.calls.count()).toBe(4); expect(TestBed.inject(GoldPriceService).history).toBe(before);
    expect(downloads.length).toBe(4); http.expectNone(() => true);
  });
  it('cleans up pending download URLs and timers on component destruction', fakeAsync(() => {
    flushGoldPriceResponses(API_DAYS); fixture.detectChanges();
    fixture.componentInstance.exportCsv(); fixture.componentInstance.exportCsv();
    expect(createUrl.calls.count()).toBe(2); expect(revoke).not.toHaveBeenCalled();
    fixture.destroy(); expect(revoke.calls.count()).toBe(2);
    tick(0); expect(revoke.calls.count()).toBe(2); http.expectNone(() => true);
  }));
});
