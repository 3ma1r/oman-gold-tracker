import { HttpErrorResponse } from '@angular/common/http';
import { HttpTestingController } from '@angular/common/http/testing';
import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { API_BASE_URL } from '../api.config';
import { of, throwError } from 'rxjs';
import { GOLD_PURITIES } from '../models/gold-price';
import { goldPriceResponses, provideGoldPriceHttpTesting, TEST_API_BASE_URL } from '../testing/gold-price-http';
import { SAMPLE_GOLD_PRICES } from '../testing/sample-gold-prices.fixture';
import { GoldPriceService, PRICE_LOAD_TIMEOUT_MS } from './gold-price.service';
import { GoldPriceApiService } from './gold-price-api.service';

describe('GoldPriceService shared API loading', () => {
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: provideGoldPriceHttpTesting() });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  function start() {
    const service = TestBed.inject(GoldPriceService);
    const latest = http.expectOne(`${TEST_API_BASE_URL}/api/gold-prices`);
    const history = http.expectOne(`${TEST_API_BASE_URL}/api/gold-prices/history`);
    return { service, latest, history };
  }
  function expectNoData(service: GoldPriceService) {
    expect(service.days).toEqual([]); expect(service.history).toEqual([]);
    expect(service.latest).toBeNull(); expect(service.sampleDate).toBeNull();
  }
  function expectFailed(service: GoldPriceService) {
    expect(service.loading()).toBeFalse(); expect(service.failed()).toBeTrue(); expectNoData(service);
  }

  for (const first of ['latest', 'history'] as const) {
    it(`publishes nothing until both responses succeed, with ${first} completing first`, () => {
      const state = start();
      const replies = goldPriceResponses();
      expect(state.service.loading()).toBeTrue(); expect(state.service.failed()).toBeFalse();
      expectNoData(state.service);
      state[first].flush(replies[first]);
      expect(state.service.loading()).toBeTrue(); expectNoData(state.service);
      const second = first === 'latest' ? 'history' : 'latest';
      state[second].flush(replies[second]);
      expect(state.service.loading()).toBeFalse(); expect(state.service.failed()).toBeFalse();
      expect(state.service.days).toEqual(SAMPLE_GOLD_PRICES);
      expect(state.service.purities).toEqual(GOLD_PURITIES);
      expect(state.service.sampleDate).toBe(replies.latest.date);
      expect(state.service.latest).toBe(state.service.days[29]);
      expect(state.service.history[0]).toBe(state.service.latest!);
      expect(state.service.history.map(day => day.date)).toEqual([...SAMPLE_GOLD_PRICES].reverse().map(day => day.date));
      expect(state.service.latest!.prices).toEqual(replies.latest.prices);
      expect(Object.isFrozen(state.service.days)).toBeTrue();
      expect(Object.isFrozen(state.service.history)).toBeTrue();
      expect(state.service.days.every(day => Object.isFrozen(day) && Object.isFrozen(day.prices))).toBeTrue();
    });
  }

  it('shares one pair of requests between all consumers without a separate purity request', () => {
    const state = start();
    expect(TestBed.inject(GoldPriceService)).toBe(state.service);
    http.expectNone(() => true);
    const replies = goldPriceResponses(); state.latest.flush(replies.latest); state.history.flush(replies.history);
    for (const purity of GOLD_PURITIES) expect(state.service.latest!.prices[purity]).toBe(replies.latest.prices[purity]);
    http.expectNone(() => true);
  });

  for (const endpoint of ['latest', 'history'] as const) {
    it(`discards the other successful response when ${endpoint} fails`, () => {
      const state = start(); const replies = goldPriceResponses();
      const other = endpoint === 'latest' ? 'history' : 'latest';
      state[other].flush(replies[other]); expectNoData(state.service);
      state[endpoint].flush({ title: 'Unavailable' }, { status: 503, statusText: 'Service Unavailable' });
      expectFailed(state.service);
      expect(state.service.failure()).toBe('server');
    });
    it(`handles ${endpoint} network errors and cancels the pending sibling`, () => {
      const state = start();
      state[endpoint].error(new ProgressEvent('error'));
      expectFailed(state.service);
      expect(state.service.failure()).toBe('connection');
      expect(state[endpoint === 'latest' ? 'history' : 'latest'].cancelled).toBeTrue();
    });
  }

  for (const purity of GOLD_PURITIES) {
    it(`rejects a mismatching ${purity}K latest price without partial publication`, () => {
      const state = start(); const replies = goldPriceResponses();
      state.latest.flush({ ...replies.latest, prices: { ...replies.latest.prices, [purity]: replies.latest.prices[purity] + 1 } });
      state.history.flush(replies.history); expectFailed(state.service);
      expect(state.service.failure()).toBe('invalidResponse');
    });
  }

  const valid = goldPriceResponses();
  const invalidCases = [
    { name: 'different latest date', latest: { ...valid.latest, date: '2030-01-01' }, history: valid.history },
    { name: 'wrong date range', latest: valid.latest, history: { ...valid.history, endDate: '2025-04-28' } },
    { name: 'reversed dates', latest: valid.latest, history: { ...valid.history, days: [...valid.history.days].reverse() } },
    { name: 'duplicate dates', latest: valid.latest, history: { ...valid.history, days: [valid.history.days[1], ...valid.history.days.slice(1)] } },
    { name: 'invalid calendar date', latest: { ...valid.latest, date: '2025-02-30' }, history: valid.history },
    { name: 'non-date-only value', latest: { ...valid.latest, date: '2025-04-27T00:00:00Z' }, history: valid.history },
    { name: 'empty history', latest: valid.latest, history: { ...valid.history, days: [] } },
    { name: 'missing days', latest: valid.latest, history: {} },
    { name: 'wrong currency', latest: { ...valid.latest, currency: 'USD' }, history: valid.history },
    { name: 'wrong unit', latest: valid.latest, history: { ...valid.history, unit: 'ounce' } },
    { name: 'unlabelled samples', latest: { ...valid.latest, isSampleData: false }, history: valid.history },
    { name: 'missing purity', latest: { ...valid.latest, prices: { 24: 51.2 } }, history: valid.history },
    { name: 'formatted price string', latest: { ...valid.latest, prices: { ...valid.latest.prices, 24: '51.200' } }, history: valid.history },
    { name: 'non-finite price', latest: { ...valid.latest, prices: { ...valid.latest.prices, 24: Infinity } }, history: valid.history },
    { name: 'invalid history price', latest: valid.latest, history: { ...valid.history, days: valid.history.days.map((day, i) => i ? day : { ...day, prices: { ...day.prices, 18: null } }) } },
    { name: 'null response', latest: null, history: valid.history },
  ];
  for (const invalid of invalidCases) {
    it(`rejects ${invalid.name} as a handled failure`, () => {
      const state = start(); state.latest.flush(invalid.latest); state.history.flush(invalid.history);
      expectFailed(state.service);
      expect(state.service.failure()).toBe('invalidResponse');
    });
  }

  it('ends loading and cancels requests at the deadline if the API stalls', fakeAsync(() => {
    const state = start();
    tick(PRICE_LOAD_TIMEOUT_MS - 1); expect(state.service.loading()).toBeTrue();
    tick(1); expectFailed(state.service);
    expect(state.service.failure()).toBe('timeout');
    expect(state.latest.cancelled && state.history.cancelled).toBeTrue();
  }));

  it('cancels in-flight HTTP requests when destroyed', fakeAsync(() => {
    const state = start(); TestBed.resetTestingModule();
    expect(state.latest.cancelled && state.history.cancelled).toBeTrue();
    state.service.retry();
    http.expectNone(() => true);
    tick(PRICE_LOAD_TIMEOUT_MS);
  }));

  it('handles missing production API configuration without fallback or unhandled errors', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [...provideGoldPriceHttpTesting(), { provide: API_BASE_URL, useValue: null }] });
    http = TestBed.inject(HttpTestingController);
    expectFailed(TestBed.inject(GoldPriceService));
    expect(TestBed.inject(GoldPriceService).failure()).toBe('configuration');
    http.expectNone(() => true);
  });

  it('ignores duplicate attempts until the entire pair finishes and publishes recovery atomically', () => {
    const first = start();
    first.service.retry(); first.service.retry(); http.expectNone(() => true);
    first.latest.error(new ProgressEvent('error'));
    const initialLoad = first.service.loadId();
    first.service.retry();
    expect(first.service.loading()).toBeTrue(); expect(first.service.failed()).toBeFalse();
    expect(first.service.failure()).toBe('connection');
    expect(first.service.loadId()).toBe(initialLoad + 1);
    const retry = start();
    const replies = goldPriceResponses(); retry.history.flush(replies.history);
    retry.service.retry(); http.expectNone(() => true);
    expectNoData(retry.service); expect(retry.service.loading()).toBeTrue();
    retry.latest.flush(replies.latest);
    expect(retry.service.loading()).toBeFalse(); expect(retry.service.failure()).toBeNull();
    expect(retry.service.latest).toBe(retry.service.history[0]);
    expect(retry.service.days).toEqual(replies.history.days);
  });

  it('supports repeated failed retries, cancels siblings and never retries automatically', fakeAsync(() => {
    const state = start(); state.latest.error(new ProgressEvent('error'));
    for (const status of [500, 503, 404]) {
      state.service.retry(); const attempt = start();
      attempt.history.flush({}, { status, statusText: 'Request failed' });
      expectFailed(state.service); expect(state.service.failure()).toBe('server');
      expect(attempt.latest.cancelled).toBeTrue();
      tick(PRICE_LOAD_TIMEOUT_MS * 2); http.expectNone(() => true);
    }
    state.service.retry(); const recovery = start(); const replies = goldPriceResponses();
    recovery.latest.flush(replies.latest); recovery.history.flush(replies.history);
    tick(PRICE_LOAD_TIMEOUT_MS * 2);
    expect(state.service.failed()).toBeFalse(); expect(state.service.days.length).toBe(30);
    http.expectNone(() => true);
  }));

  it('starts a fresh timeout for each manual attempt, even after one response succeeds', fakeAsync(() => {
    const first = start(); first.latest.flush(goldPriceResponses().latest);
    tick(PRICE_LOAD_TIMEOUT_MS); expectFailed(first.service); expect(first.history.cancelled).toBeTrue();
    first.service.retry(); const second = start();
    second.history.flush(goldPriceResponses().history);
    tick(PRICE_LOAD_TIMEOUT_MS - 1); expect(second.service.loading()).toBeTrue();
    tick(1); expectFailed(second.service); expect(second.service.failure()).toBe('timeout');
    expect(second.latest.cancelled).toBeTrue(); http.expectNone(() => true);
  }));

  it('discards an old valid snapshot when a new load starts and keeps it cleared if that load fails', () => {
    const first = start(); const replies = goldPriceResponses();
    first.latest.flush(replies.latest); first.history.flush(replies.history);
    first.service.retry(); expectNoData(first.service);
    const second = start(); second.latest.flush(replies.latest);
    second.history.flush({ ...replies.history, endDate: '2040-01-01' });
    expectFailed(first.service); expect(first.service.failure()).toBe('invalidResponse');
  });

  it('cancels a retried pair on destruction and refuses later attempts', fakeAsync(() => {
    const first = start(); first.latest.error(new ProgressEvent('error'));
    first.service.retry(); const second = start();
    TestBed.resetTestingModule();
    expect(second.latest.cancelled && second.history.cancelled).toBeTrue();
    first.service.retry(); tick(PRICE_LOAD_TIMEOUT_MS * 2); http.expectNone(() => true);
  }));

  it('classifies an HTTP 200 JSON parsing failure as invalid data, not a connection or server failure', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [
      ...provideGoldPriceHttpTesting(),
      { provide: GoldPriceApiService, useValue: {
        getLatest: () => throwError(() => new HttpErrorResponse({ status: 200, error: new SyntaxError('Invalid JSON') })),
        getHistory: () => of(goldPriceResponses().history),
      } },
    ] });
    http = TestBed.inject(HttpTestingController);
    const service = TestBed.inject(GoldPriceService);
    expectFailed(service); expect(service.failure()).toBe('invalidResponse'); http.expectNone(() => true);
  });

  it('ends loading as invalid data if a request completes without emitting a body', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [
      ...provideGoldPriceHttpTesting(),
      { provide: GoldPriceApiService, useValue: {
        getLatest: () => of(), getHistory: () => of(goldPriceResponses().history),
      } },
    ] });
    http = TestBed.inject(HttpTestingController);
    const service = TestBed.inject(GoldPriceService);
    expectFailed(service); expect(service.failure()).toBe('invalidResponse'); http.expectNone(() => true);
  });
});
