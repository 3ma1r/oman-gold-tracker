import { DailyGoldPrice, GoldPurity } from '../models/gold-price';

export const CHART_WIDTH = 900;
export const CHART_HEIGHT = 240;
const INSET = 12;

/** Geometry and summaries derived exclusively from the supplied shared records. */
export function buildPriceTrend(days: readonly DailyGoldPrice[], purity: GoldPurity) {
  const series = [...days].sort((a, b) => a.date.localeCompare(b.date));
  const values = series.map(day => day.prices[purity]);
  const latest = values.at(-1) ?? null;
  const previous = values.at(-2) ?? null;
  const highest = values.length ? Math.max(...values) : null;
  const lowest = values.length ? Math.min(...values) : null;
  const change = latest !== null && previous !== null ? latest - previous : null;
  const percentage = change !== null && previous !== null && previous !== 0
    ? change / previous * 100 : null;

  // Padding keeps flat (including all-zero) series away from a zero-size scale.
  const range = (highest ?? 0) - (lowest ?? 0);
  const padding = Math.max(range > 0 ? range * .08 : Math.abs(highest ?? 0) * .02, .002);
  const bottom = (lowest ?? 0) - padding;
  const top = (highest ?? 0) + padding;
  const points = series.map((day, index) => ({
    day,
    value: values[index],
    x: series.length === 1 ? CHART_WIDTH / 2
      : INSET + index / (series.length - 1) * (CHART_WIDTH - 2 * INSET),
    y: INSET + (top - values[index]) / (top - bottom) * (CHART_HEIGHT - 2 * INSET),
  }));
  const priceTicks = values.length ? Array.from({ length: 5 }, (_, index) => ({
    value: top - index / 4 * (top - bottom),
    y: INSET + index / 4 * (CHART_HEIGHT - 2 * INSET),
  })) : [];
  const line = points.map(point => `${point.x},${point.y}`).join(' ');
  const area = points.length > 1
    ? `${points[0].x},${CHART_HEIGHT - INSET} ${line} ${points.at(-1)!.x},${CHART_HEIGHT - INSET}` : '';

  return { series, points, priceTicks, line, area, latest, previous, highest, lowest, change, percentage };
}
