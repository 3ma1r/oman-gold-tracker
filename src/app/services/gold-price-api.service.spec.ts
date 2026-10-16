import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../api.config';
import { SAMPLE_GOLD_PRICES } from '../testing/sample-gold-prices.fixture';
import { GOLD_PURITIES } from '../models/gold-price';
import { ApiProblemDetails, GoldPriceHistoryResponse, GoldPriceResponse, LatestGoldPricesResponse } from '../models/gold-price-api';
import { GoldPriceApiService } from './gold-price-api.service';
import { environment as developmentEnvironment } from '../../environments/environment.development';

const baseUrl = 'https://gold-api.example.test';
const metadata = { currency: 'OMR', unit: 'gram', isSampleData: true } as const;
const finalDay = SAMPLE_GOLD_PRICES[SAMPLE_GOLD_PRICES.length - 1];
const latest: LatestGoldPricesResponse = { ...metadata, ...finalDay };
const history: GoldPriceHistoryResponse = {
  ...metadata, startDate: SAMPLE_GOLD_PRICES[0].date, endDate: finalDay.date, days: SAMPLE_GOLD_PRICES,
};
const operations: { name: string; path: string; call: (client: GoldPriceApiService) => Observable<unknown> }[] = [
  { name: 'latest', path: '/api/gold-prices', call: client => client.getLatest() },
  { name: 'purity', path: '/api/gold-prices/19', call: client => client.getLatestForKarat(19) },
  { name: 'history', path: '/api/gold-prices/history', call: client => client.getHistory() },
];

describe('GoldPriceApiService', () => {
  let client: GoldPriceApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [
      provideHttpClient(), provideHttpClientTesting(), { provide: API_BASE_URL, useValue: baseUrl },
    ] });
    client = TestBed.inject(GoldPriceApiService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('does not request anything on injection or until a returned observable is subscribed', () => {
    client.getLatest(); client.getHistory(); client.getLatestForKarat(24);
    http.expectNone(() => true);
  });

  it('gets the latest typed numeric prices and preserves the ISO date and metadata', () => {
    const next = jasmine.createSpy('next');
    client.getLatest().subscribe(next);
    const request = http.expectOne(`${baseUrl}/api/gold-prices`);
    expect(request.request.method).toBe('GET');
    expect(request.request.withCredentials).toBeFalse();
    request.flush(latest);
    expect(next).toHaveBeenCalledOnceWith(latest);
    const result = next.calls.mostRecent().args[0] as LatestGoldPricesResponse;
    expect(result.date).toBe('2025-04-27');
    expect(typeof result.prices[22]).toBe('number');
  });

  it('gets chronological history without converting dates or formatting prices', () => {
    const next = jasmine.createSpy('next');
    client.getHistory().subscribe(next);
    const request = http.expectOne(`${baseUrl}/api/gold-prices/history`);
    expect(request.request.method).toBe('GET');
    request.flush(history);
    expect(next).toHaveBeenCalledOnceWith(history);
    const result = next.calls.mostRecent().args[0] as GoldPriceHistoryResponse;
    expect(result.days.length).toBe(30);
    expect(result.days[0].date).toBe('2025-03-29');
    expect(result.days[29].date).toBe(result.endDate);
  });

  for (const karat of GOLD_PURITIES) {
    it(`requests ${karat}K as a path parameter and returns the matching response`, () => {
      const response: GoldPriceResponse = { ...metadata, date: finalDay.date, karat, price: finalDay.prices[karat] };
      const next = jasmine.createSpy('next');
      client.getLatestForKarat(karat).subscribe(next);
      const request = http.expectOne(`${baseUrl}/api/gold-prices/${karat}`);
      expect(request.request.method).toBe('GET');
      expect(request.request.params.keys()).toEqual([]);
      expect(request.request.body).toBeNull();
      expect(request.request.withCredentials).toBeFalse();
      request.flush(response);
      expect(next).toHaveBeenCalledOnceWith(response);
    });
  }

  for (const operation of operations) {
    for (const status of [404, 503]) {
      it(`propagates ${status} HTTP failures and their body for ${operation.name} without fallback or retry`, () => {
        const problem: ApiProblemDetails = { status, title: 'Request failed', detail: 'Test failure', traceId: 'test-trace' };
        const error = jasmine.createSpy('error');
        operation.call(client).subscribe({ next: () => fail('Unexpected success'), error });
        http.expectOne(baseUrl + operation.path).flush(problem, { status, statusText: 'Test failure' });
        expect(error).toHaveBeenCalledOnceWith(jasmine.any(HttpErrorResponse));
        const result = error.calls.mostRecent().args[0] as HttpErrorResponse;
        expect(result.status).toBe(status);
        expect(result.error).toEqual(problem);
        expect(result.url).toBe(baseUrl + operation.path);
      });
    }
    it(`propagates a network failure for ${operation.name}`, () => {
      const event = new ProgressEvent('error');
      const error = jasmine.createSpy('error');
      operation.call(client).subscribe({ next: () => fail('Unexpected success'), error });
      http.expectOne(baseUrl + operation.path).error(event);
      expect(error).toHaveBeenCalledOnceWith(jasmine.any(HttpErrorResponse));
      const result = error.calls.mostRecent().args[0] as HttpErrorResponse;
      expect(result.status).toBe(0);
      expect(result.error).toBe(event);
    });
  }
});

describe('Gold-price API address configuration', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] }));
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('leaves the default/production API address unconfigured', () => {
    expect(TestBed.inject(API_BASE_URL)).toBeNull();
  });

  it('configures localhost only in the development environment', () => {
    expect(developmentEnvironment.apiBaseUrl).toBe('http://localhost:5118');
  });

  for (const address of [null, '']) {
    it(`fails explicitly without making a request when the address is ${address === null ? 'null' : 'empty'}`, () => {
      TestBed.overrideProvider(API_BASE_URL, { useValue: address });
      const client = TestBed.inject(GoldPriceApiService);
      const error = jasmine.createSpy('error');
      client.getLatest().subscribe({ next: () => fail('Unexpected success'), error });
      expect(error).toHaveBeenCalledOnceWith(jasmine.any(Error));
      expect((error.calls.mostRecent().args[0] as Error).message).toContain('not configured');
      TestBed.inject(HttpTestingController).expectNone(() => true);
    });
  }

  it('normalizes trailing slashes in a configured address', () => {
    TestBed.overrideProvider(API_BASE_URL, { useValue: `${baseUrl}///` });
    TestBed.inject(GoldPriceApiService).getLatest().subscribe();
    TestBed.inject(HttpTestingController).expectOne(`${baseUrl}/api/gold-prices`).flush(latest);
  });
});
