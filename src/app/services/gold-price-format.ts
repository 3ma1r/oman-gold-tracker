import { DateOnly } from '../models/gold-price';
import { Language } from '../data/translations';

const ARABIC_MONTHS = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
] as const;

const ENGLISH_MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;
const LOCALES: Record<Language, string> = { ar: 'ar-OM', en: 'en-GB' };
const numberFormats = {
  ar: new Intl.NumberFormat(LOCALES.ar, { maximumSignificantDigits: 21, useGrouping: false }),
  en: new Intl.NumberFormat(LOCALES.en, { maximumSignificantDigits: 21, useGrouping: false }),
};
const priceFormats = {
  ar: new Intl.NumberFormat(LOCALES.ar, { minimumFractionDigits: 3, maximumFractionDigits: 3 }),
  en: new Intl.NumberFormat(LOCALES.en, { minimumFractionDigits: 3, maximumFractionDigits: 3 }),
};
const currencyFormats = {
  ar: new Intl.NumberFormat(LOCALES.ar, { style: 'currency', currency: 'OMR', currencyDisplay: 'code', minimumFractionDigits: 3, maximumFractionDigits: 3 }),
  en: new Intl.NumberFormat(LOCALES.en, { style: 'currency', currency: 'OMR', currencyDisplay: 'code', minimumFractionDigits: 3, maximumFractionDigits: 3 }),
};
const percentageFormats = {
  ar: new Intl.NumberFormat(LOCALES.ar, { style: 'percent', minimumFractionDigits: 2, maximumFractionDigits: 2 }),
  en: new Intl.NumberFormat(LOCALES.en, { style: 'percent', minimumFractionDigits: 2, maximumFractionDigits: 2 }),
};

export function formatNumber(value: number, language: Language = 'ar'): string {
  return numberFormats[language].format(value);
}

export function formatPrice(value: number | null, language: Language = 'ar'): string {
  return value === null ? '—' : priceFormats[language].format(value);
}

export function formatCurrency(value: number, language: Language = 'ar'): string {
  return currencyFormats[language].format(value);
}

/** Input is a percentage value (e.g. 20 means 20%), not a fraction. */
export function formatPercentage(value: number | null, language: Language = 'ar'): string {
  return value === null ? '—' : percentageFormats[language].format(value / 100);
}

/** Render Gregorian calendar parts directly, without Date or timezone conversion. */
export function formatSampleDate(date: DateOnly, language: Language = 'ar'): string {
  const [year, month, day] = date.split('-');
  const months = language === 'ar' ? ARABIC_MONTHS : ENGLISH_MONTHS;
  // Years are intentionally ungrouped; the Gregorian date is never parsed as a timestamp.
  const yearLabel = formatNumber(Number(year), language);
  return `${formatNumber(Number(day), language)} ${months[Number(month) - 1]} ${yearLabel}`;
}
