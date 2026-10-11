import { DOCUMENT } from '@angular/common';
import { computed, inject, Injectable, signal } from '@angular/core';
import { Language, TRANSLATIONS, TranslationKey } from '../data/translations';
import { DateOnly, GoldPurity } from '../models/gold-price';
import { formatCurrency, formatNumber, formatPercentage, formatPrice, formatSampleDate } from './gold-price-format';

export const LANGUAGE_STORAGE_KEY = 'oman-gold-tracker.language';

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly document = inject(DOCUMENT);
  private readonly currentLanguage = signal<Language>(this.restoreLanguage());
  readonly language = this.currentLanguage.asReadonly();
  readonly direction = computed(() => this.language() === 'ar' ? 'rtl' : 'ltr');

  constructor() {
    this.updateDocument();
  }

  setLanguage(language: Language): void {
    this.currentLanguage.set(language);
    this.updateDocument();
    try {
      this.document.defaultView?.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    } catch {
      // Private browsing, denied storage access or a full quota must not block switching.
    }
  }

  toggle(): void {
    this.setLanguage(this.language() === 'ar' ? 'en' : 'ar');
  }

  t(key: TranslationKey, values: Readonly<Record<string, string>> = {}): string {
    return TRANSLATIONS[this.language()][key].replace(/\{(\w+)\}/g, (placeholder, name: string) => values[name] ?? placeholder);
  }

  number(value: number): string { return formatNumber(value, this.language()); }
  price(value: number | null): string { return formatPrice(value, this.language()); }
  currency(value: number): string { return formatCurrency(value, this.language()); }
  percentage(value: number | null): string { return formatPercentage(value, this.language()); }
  date(value: DateOnly): string { return formatSampleDate(value, this.language()); }
  purity(value: GoldPurity): string { return this.t('purityOption', { purity: this.number(value) }); }
  goldPurity(value: GoldPurity): string { return this.t('goldPurity', { purity: this.number(value) }); }

  private restoreLanguage(): Language {
    try {
      return this.document.defaultView?.localStorage.getItem(LANGUAGE_STORAGE_KEY) === 'en' ? 'en' : 'ar';
    } catch {
      return 'ar';
    }
  }

  private updateDocument(): void {
    this.document.documentElement.lang = this.language();
    this.document.documentElement.dir = this.direction();
    this.document.title = this.t('documentTitle');
  }
}
