import { DateOnly } from '../models/gold-price';

const ARABIC_MONTHS = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
] as const;

/** Render Gregorian calendar parts directly, without Date or timezone conversion. */
export function formatSampleDate(date: DateOnly): string {
  const [year, month, day] = date.split('-');
  return `${Number(day)} ${ARABIC_MONTHS[Number(month) - 1]} ${year}`;
}
