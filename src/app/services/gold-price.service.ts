import { Injectable } from '@angular/core';
import { SAMPLE_GOLD_PRICES } from '../data/sample-gold-prices';
import { GOLD_PURITIES } from '../models/gold-price';

@Injectable({ providedIn: 'root' })
export class GoldPriceService {
  readonly purities = GOLD_PURITIES;
  /** Chronological data for future chart and calculator consumers. */
  readonly days = SAMPLE_GOLD_PRICES;
  /** A reversed view of the same records; the original sequence is never mutated. */
  readonly history = Object.freeze([...this.days].reverse());
  readonly latest = this.history[0];
  readonly sampleDate = this.latest.date;
}
