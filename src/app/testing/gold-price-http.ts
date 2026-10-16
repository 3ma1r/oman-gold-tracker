import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '../api.config';
import { DailyGoldPrice } from '../models/gold-price';
import { GoldPriceHistoryResponse, LatestGoldPricesResponse } from '../models/gold-price-api';
import { GoldPriceService } from '../services/gold-price.service';
import { SAMPLE_GOLD_PRICES } from './sample-gold-prices.fixture';

export const TEST_API_BASE_URL = 'https://gold-api.example.test';
export function provideGoldPriceHttpTesting() {
  return [provideHttpClient(), ...provideHttpClientTesting(), { provide: API_BASE_URL, useValue: TEST_API_BASE_URL }];
}

export function goldPriceResponses(days: readonly DailyGoldPrice[] = SAMPLE_GOLD_PRICES): {
  latest: LatestGoldPricesResponse; history: GoldPriceHistoryResponse;
} {
  const metadata = { currency: 'OMR', unit: 'gram', isSampleData: true } as const;
  return {
    latest: { ...metadata, ...days[days.length - 1] },
    history: { ...metadata, startDate: days[0].date, endDate: days[days.length - 1].date, days },
  };
}

export function flushGoldPriceResponses(days: readonly DailyGoldPrice[] = SAMPLE_GOLD_PRICES): void {
  TestBed.inject(GoldPriceService);
  const http = TestBed.inject(HttpTestingController);
  const responses = goldPriceResponses(days);
  http.expectOne(`${TEST_API_BASE_URL}/api/gold-prices`).flush(responses.latest);
  http.expectOne(`${TEST_API_BASE_URL}/api/gold-prices/history`).flush(responses.history);
}
