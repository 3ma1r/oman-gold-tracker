import { DailyGoldPrice, DateOnly } from '../models/gold-price';

// Fictional, fixed sample data. These dates and prices never follow the system clock.
export const SAMPLE_FINAL_DATE = '2025-04-27' satisfies DateOnly;

// The only stored price series: 24K, in OMR per gram, oldest first.
const SAMPLE_24K_PRICES = [
  46.720, 47.025, 47.087, 47.620, 47.555, 47.982,
  48.445, 48.270, 48.360, 48.652, 48.520, 48.880,
  49.355, 49.430, 49.820, 50.270, 50.510, 50.025,
  49.740, 49.825, 50.325, 50.805, 50.250, 50.310,
  50.260, 50.775, 51.095, 50.860, 50.900, 51.200,
] as const;

const [year, month, day] = SAMPLE_FINAL_DATE.split('-').map(Number);

export const SAMPLE_GOLD_PRICES: readonly DailyGoldPrice[] = Object.freeze(
  SAMPLE_24K_PRICES.map((price24K, index) => {
    // UTC is only used for calendar arithmetic; consumers receive date-only strings.
    const date = new Date(Date.UTC(year, month - 1, day - (SAMPLE_24K_PRICES.length - 1 - index)))
      .toISOString().slice(0, 10) as DateOnly;
    const baisa24K = Math.round(price24K * 1000);

    // Round positive prices half-up in integer baisa before converting back to OMR.
    // Derive each purity directly from 24K, never from another rounded purity.
    return Object.freeze({
      date,
      prices: Object.freeze({
        18: Math.round(baisa24K * 18 / 24) / 1000,
        21: Math.round(baisa24K * 21 / 24) / 1000,
        22: Math.round(baisa24K * 22 / 24) / 1000,
        24: baisa24K / 1000,
      }),
    });
  }),
);
