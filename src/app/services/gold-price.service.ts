import { HttpErrorResponse } from '@angular/common/http';
import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin, map, throwIfEmpty, timeout, TimeoutError } from 'rxjs';
import { DateOnly, DailyGoldPrice, GOLD_PURITIES, GoldPurity } from '../models/gold-price';
import { GoldPriceApiMetadata, GoldPriceHistoryResponse, LatestGoldPricesResponse } from '../models/gold-price-api';
import { ApiConfigurationError, GoldPriceApiService } from './gold-price-api.service';

/** A deadline for genuinely stalled requests, not a simulated loading delay. */
export const PRICE_LOAD_TIMEOUT_MS = 15_000;
const EMPTY_DAYS: readonly DailyGoldPrice[] = Object.freeze([]);
interface PriceDataset {
  readonly days: readonly DailyGoldPrice[];
  readonly history: readonly DailyGoldPrice[];
  readonly latest: DailyGoldPrice;
}
export type PriceLoadFailure = 'connection' | 'server' | 'invalidResponse' | 'configuration' | 'timeout';
interface PriceState {
  status: 'idle' | 'loading' | 'error' | 'ready';
  data: PriceDataset | null;
  failure: PriceLoadFailure | null;
  loadId: number;
}

@Injectable({ providedIn: 'root' })
export class GoldPriceService {
  private readonly api = inject(GoldPriceApiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly state = signal<PriceState>({ status: 'idle', data: null, failure: null, loadId: 0 });
  readonly loading = computed(() => this.state().status === 'loading');
  readonly failed = computed(() => this.state().status === 'error');
  // Retain the previous failure during retry so its button stays present, disabled.
  readonly failure = computed(() => this.state().failure);
  readonly loadId = computed(() => this.state().loadId);
  readonly purities = GOLD_PURITIES;
  // Getters preserve existing component bindings while tracking the shared signal.
  get days(): readonly DailyGoldPrice[] { return this.state().data?.days ?? EMPTY_DAYS; }
  get history(): readonly DailyGoldPrice[] { return this.state().data?.history ?? EMPTY_DAYS; }
  get latest(): DailyGoldPrice | null { return this.state().data?.latest ?? null; }
  get sampleDate(): DateOnly | null { return this.latest?.date ?? null; }

  constructor() {
    this.retry();
  }

  /** One coordinated load per explicit attempt; never retry automatically. */
  retry(): void {
    if (this.loading() || this.destroyRef.destroyed) return;
    const loadId = this.state().loadId + 1;
    this.state.set({ status: 'loading', data: null, failure: this.failure(), loadId });
    forkJoin({ latest: this.api.getLatest(), history: this.api.getHistory() }).pipe(
      timeout(PRICE_LOAD_TIMEOUT_MS),
      throwIfEmpty(() => new Error('The price requests completed without data.')),
      map(({ latest, history }) => validateDataset(latest, history)),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: data => this.state.set({ status: 'ready', data, failure: null, loadId }),
      error: error => this.state.set({ status: 'error', data: null, failure: classifyFailure(error), loadId }),
    });
  }
}

function classifyFailure(error: unknown): PriceLoadFailure {
  if (error instanceof ApiConfigurationError) return 'configuration';
  if (error instanceof TimeoutError) return 'timeout';
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) return 'connection';
    // HttpClient reports malformed JSON as an HTTP error even for a 200 response.
    return error.status >= 200 && error.status < 300 ? 'invalidResponse' : 'server';
  }
  return 'invalidResponse';
}

function hasSampleMetadata(value: GoldPriceApiMetadata | null | undefined): boolean {
  return value?.currency === 'OMR' && value.unit === 'gram' && value.isSampleData === true;
}

function calendarDay(value: unknown): number {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return NaN;
  // UTC is used only to validate calendar dates and their spacing, never for display.
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value ? date.getTime() / 86_400_000 : NaN;
}

function isPriceMap(value: unknown): value is Readonly<Record<GoldPurity, number>> {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).length !== 4) return false;
  const prices = value as Record<string, unknown>;
  return GOLD_PURITIES.every(karat => {
    const price = prices[karat];
    return typeof price === 'number' && Number.isFinite(price) && price >= 0;
  });
}

function validateDataset(latest: LatestGoldPricesResponse, history: GoldPriceHistoryResponse): PriceDataset {
  const invalid = () => new Error('Invalid or inconsistent gold-price API responses.');
  if (!hasSampleMetadata(latest) || !hasSampleMetadata(history) || !Array.isArray(history.days)
      || history.days.length !== 30 || !isPriceMap(latest.prices) || !Number.isFinite(calendarDay(latest.date))) throw invalid();
  const firstDay = calendarDay(history.startDate);
  if (!Number.isFinite(firstDay) || calendarDay(history.endDate) !== firstDay + history.days.length - 1) throw invalid();
  const days = Object.freeze(history.days.map((day, index) => {
    if (!day || calendarDay(day.date) !== firstDay + index || !isPriceMap(day.prices)) throw invalid();
    const prices = Object.freeze(Object.fromEntries(GOLD_PURITIES.map(karat => [karat, day.prices[karat]])) as Record<GoldPurity, number>);
    return Object.freeze({ date: day.date, prices });
  }));
  const finalDay = days[days.length - 1];
  if (latest.date !== finalDay.date || latest.date !== history.endDate
      || GOLD_PURITIES.some(karat => latest.prices[karat] !== finalDay.prices[karat])) throw invalid();
  return Object.freeze({ days, history: Object.freeze([...days].reverse()), latest: finalDay });
}
