import { DestroyRef, inject, Injectable, signal } from '@angular/core';
import { SAMPLE_GOLD_PRICES } from '../data/sample-gold-prices';
import { DateOnly, DailyGoldPrice, GOLD_PURITIES } from '../models/gold-price';

/** One brief, simulated initial load of local data; not a network request or live feed. */
export const SAMPLE_LOADING_DELAY_MS = 450;

@Injectable({ providedIn: 'root' })
export class GoldPriceService {
  private readonly loadingState = signal(true);
  readonly loading = this.loadingState.asReadonly();
  readonly purities = GOLD_PURITIES;
  /** Chronological data for future chart and calculator consumers. */
  readonly days = SAMPLE_GOLD_PRICES;
  /** A reversed view of the same records; the original sequence is never mutated. */
  readonly history = Object.freeze([...this.days].reverse());
  readonly latest: DailyGoldPrice | null = this.history[0] ?? null;
  readonly sampleDate: DateOnly | null = this.latest?.date ?? null;

  constructor() {
    // The immutable records are local. Only initial UI readiness is delayed once per app.
    const timer = setTimeout(() => this.loadingState.set(false), SAMPLE_LOADING_DELAY_MS);
    inject(DestroyRef).onDestroy(() => clearTimeout(timer));
  }
}
