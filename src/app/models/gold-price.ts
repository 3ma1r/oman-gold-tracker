export const GOLD_PURITIES = Object.freeze([18, 21, 22, 24] as const);

export type GoldPurity = (typeof GOLD_PURITIES)[number];

/** Gregorian calendar date (YYYY-MM-DD), never a local timestamp. */
export type DateOnly = `${number}-${number}-${number}`;

export interface DailyGoldPrice {
  readonly date: DateOnly;
  /** Numeric Omani rials per gram, rounded to three decimal places. */
  readonly prices: Readonly<Record<GoldPurity, number>>;
}
