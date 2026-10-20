import { Component, inject } from '@angular/core';
import { TranslationKey } from './data/translations';
import { LanguageService } from './services/language.service';
import { GoldPriceService, PriceLoadFailure } from './services/gold-price.service';
import { Header } from './components/header';
import { Hero } from './components/hero';
import { TodaysPrices } from './components/todays-prices';
import { PurityExplorer } from './components/purity-explorer';
import { GoldCalculator } from './components/gold-calculator';
import { PriceTrend } from './components/price-trend';
import { PriceHistory } from './components/price-history';
import { Footer } from './components/footer';

@Component({
  selector: 'app-root',
  imports: [Header, Hero, TodaysPrices, PurityExplorer, GoldCalculator, PriceTrend, PriceHistory, Footer],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly lang = inject(LanguageService);
  protected readonly goldPrices = inject(GoldPriceService);
  protected readonly failureMessages = {
    connection: 'pricesConnectionError', server: 'pricesServerError',
    invalidResponse: 'pricesInvalidError', configuration: 'pricesConfigurationError', timeout: 'pricesTimeoutError',
  } as const satisfies Record<PriceLoadFailure, TranslationKey>;

  protected loadAnnouncement(): string {
    if (this.goldPrices.loading()) return this.lang.t('sampleLoading');
    const failure = this.goldPrices.failure();
    if (failure) return `${this.lang.t('pricesErrorTitle')}. ${this.lang.t(this.failureMessages[failure])}`;
    return this.lang.t(this.goldPrices.days.length ? 'sampleReady' : 'pricesEmpty');
  }
}
