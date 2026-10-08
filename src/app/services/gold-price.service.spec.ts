import { TestBed } from '@angular/core/testing';
import { GoldPriceService } from './gold-price.service';
import { SAMPLE_FINAL_DATE, SAMPLE_GOLD_PRICES } from '../data/sample-gold-prices';
import { formatSampleDate } from './gold-price-format';

describe('GoldPriceService', () => {
  let service: GoldPriceService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GoldPriceService);
  });

  it('supports exactly the four specified purities', () => {
    expect(service.purities).toEqual([18, 21, 22, 24]);
    for (const day of service.days) {
      expect(Object.keys(day.prices).map(Number)).toEqual([18, 21, 22, 24]);
    }
  });

  it('has exactly 30 unique consecutive Gregorian dates with fixed endpoints', () => {
    expect(service.days.length).toBe(30);
    expect(new Set(service.days.map(day => day.date)).size).toBe(30);
    expect(service.days[0].date).toBe('2025-03-29');
    expect(service.days[29].date).toBe('2025-04-27');
    expect(SAMPLE_FINAL_DATE).toBe('2025-04-27');

    for (const [index, day] of service.days.entries()) {
      expect(day.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      const expected = new Date(Date.UTC(2025, 2, 29 + index)).toISOString().slice(0, 10);
      expect(day.date).toBe(expected);
    }
  });

  it('uses the same immutable records for chronological data, history and latest prices', () => {
    expect(service.days).toBe(SAMPLE_GOLD_PRICES);
    expect(service.history.length).toBe(30);
    expect(service.latest).toBe(service.days[29]);
    expect(service.history[0]).toBe(service.latest);
    expect(service.sampleDate).toBe(service.latest.date);
    expect(Object.isFrozen(service.days)).toBeTrue();
    expect(Object.isFrozen(service.history)).toBeTrue();

    for (const [index, day] of service.history.entries()) {
      expect(day).toBe(service.days[29 - index]);
      expect(Object.isFrozen(day)).toBeTrue();
      expect(Object.isFrozen(day.prices)).toBeTrue();
    }
  });

  it('stores positive numeric prices with no precision beyond three decimals', () => {
    for (const day of service.days) {
      for (const purity of service.purities) {
        const price = day.prices[purity];
        expect(typeof price).toBe('number');
        expect(Number.isFinite(price)).toBeTrue();
        expect(price).toBeGreaterThan(0);
        expect(price * 1000).toBeCloseTo(Math.round(price * 1000), 8);
      }
    }
  });

  it('derives every purity from 24K with exact half-up rounding to one baisa', () => {
    for (const day of service.days) {
      const baisa24K = BigInt(Math.round(day.prices[24] * 1000));
      for (const purity of service.purities) {
        // Independent integer oracle: add half the denominator before division.
        const expectedBaisa = (baisa24K * BigInt(purity) + 12n) / 24n;
        expect(day.prices[purity]).toBe(Number(expectedBaisa) / 1000);
      }
    }
    // Exercise half-baisa boundaries as well as non-tie rounding.
    expect(service.days[5].prices[18]).toBe(35.987); // 47.982 * 18/24 = 35.9865
    expect(service.days[7].prices[18]).toBe(36.203); // 48.270 * 18/24 = 36.2025
    expect(service.days[1].prices[21]).toBe(41.147);
  });

  it('has fixed final prices for all four purities', () => {
    expect(service.latest.prices).toEqual({
      18: 38.400,
      21: 44.800,
      22: 46.933,
      24: 51.200,
    });
  });

  it('keeps the sample date and prices independent of the current clock', () => {
    jasmine.clock().install();
    try {
      jasmine.clock().mockDate(new Date('2035-01-01T00:00:00Z'));
      const anotherService = new GoldPriceService();
      expect(anotherService.days).toBe(service.days);
      expect(anotherService.sampleDate).toBe('2025-04-27');
      expect(anotherService.latest.prices[24]).toBe(51.200);
    } finally {
      jasmine.clock().uninstall();
    }
  });

  it('formats calendar parts directly, including month boundaries and leap days', () => {
    expect(formatSampleDate('2025-03-29')).toBe('29 مارس 2025');
    expect(formatSampleDate('2025-04-01')).toBe('1 أبريل 2025');
    expect(formatSampleDate(service.sampleDate)).toBe('27 أبريل 2025');
    expect(formatSampleDate('2024-02-29')).toBe('29 فبراير 2024');
    expect(formatSampleDate('2025-12-31')).toBe('31 ديسمبر 2025');
  });
});
