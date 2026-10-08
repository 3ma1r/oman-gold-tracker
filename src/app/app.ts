import { Component } from '@angular/core';
import { Header } from './components/header';
import { Hero } from './components/hero';
import { TodaysPrices } from './components/todays-prices';
import { GoldCalculator } from './components/gold-calculator';
import { PriceTrend } from './components/price-trend';
import { PriceHistory } from './components/price-history';
import { Footer } from './components/footer';

@Component({
  selector: 'app-root',
  imports: [Header, Hero, TodaysPrices, GoldCalculator, PriceTrend, PriceHistory, Footer],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {}
