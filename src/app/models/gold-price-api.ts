import { DailyGoldPrice, DateOnly, GoldPurity } from './gold-price';

/** JSON metadata returned by the current sample API; prices are OMR per gram. */
export interface GoldPriceApiMetadata {
  readonly currency: 'OMR';
  readonly unit: 'gram';
  readonly isSampleData: boolean;
}

/** GET /api/gold-prices: final dataset date and four numeric purity prices. */
export interface LatestGoldPricesResponse extends GoldPriceApiMetadata, DailyGoldPrice {}

/** GET /api/gold-prices/{karat}. */
export interface GoldPriceResponse extends GoldPriceApiMetadata {
  readonly date: DateOnly;
  readonly karat: GoldPurity;
  readonly price: number;
}

/** GET /api/gold-prices/history: ISO date-only strings, oldest day first. */
export interface GoldPriceHistoryResponse extends GoldPriceApiMetadata {
  readonly startDate: DateOnly;
  readonly endDate: DateOnly;
  readonly days: readonly DailyGoldPrice[];
}

/** Standard ProblemDetails members plus ASP.NET Core extensions such as traceId. */
export interface ApiProblemDetails {
  readonly type?: string | null;
  readonly title?: string | null;
  readonly status?: number | null;
  readonly detail?: string | null;
  readonly instance?: string | null;
  readonly [extension: string]: unknown;
}
