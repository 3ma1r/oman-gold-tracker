import { Component, inject } from '@angular/core';
import { GoldPurity } from '../models/gold-price';
import { GoldPriceService } from '../services/gold-price.service';
import { LanguageService } from '../services/language.service';

interface GoldCalculation {
  readonly purity: GoldPurity;
  readonly weight: number;
  readonly pricePerGram: number;
  readonly total: number;
}

@Component({
  selector: 'app-gold-calculator',
  standalone: true,
  template: `
    <section id="calculator" class="panel bg-card" aria-labelledby="calculator-title">
      <div class="calculator-layout grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-8">
        <div>
          <div class="section-heading">
            <svg class="section-icon text-accent" viewBox="0 0 32 36" fill="none" aria-hidden="true">
              <rect x="5" y="2" width="22" height="32" rx="3" stroke="currentColor" stroke-width="2.2" />
              <path d="M10 8h12v6H10zM10 20h2m4 0h2m4 0h0M10 26h2m4 0h2m4 0h0" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" />
            </svg>
            <div>
              <h2 id="calculator-title">{{ lang.t('calculator') }}</h2>
              <p class="text-muted">{{ lang.t('calculatorDescription') }}</p>
            </div>
          </div>
          <form class="calculator-fields grid grid-cols-1 sm:grid-cols-[1.2fr_1fr_auto] gap-4" novalidate [attr.aria-busy]="goldPrices.loading()" (submit)="calculate($event, weightField)">
            <div class="field-group">
              <label for="gold-purity">{{ lang.t('purityLabel') }}</label>
              <select #purityField id="gold-purity" name="gold-purity" class="field bg-card text-primary" (change)="changePurity(purityField.value)">
                @for (purity of purities; track purity) {
                  <option [value]="purity" [selected]="purity === selectedPurity">{{ lang.purity(purity) }}</option>
                }
              </select>
            </div>
            <div class="field-group">
              <label for="gold-weight">{{ lang.t('weightLabel') }}</label>
              <input #weightField id="gold-weight" name="gold-weight" class="field bg-card text-primary" type="number" inputmode="decimal" min="0" step="any" required [placeholder]="lang.t('weightPlaceholder')" aria-describedby="calculator-note calculator-error" [attr.aria-invalid]="error ? 'true' : null" (input)="clearResult()" />
            </div>
            <button class="calculate-button" type="submit" [disabled]="!canCalculate" aria-describedby="calculator-availability calculator-note">{{ lang.t('calculate') }}</button>
          </form>
          <p id="calculator-availability" class="control-note availability-note text-muted">{{ goldPrices.loading() ? lang.t('calculatorLoading') : !goldPrices.latest ? lang.t('calculatorUnavailable') : '' }}</p>
          <p id="calculator-error" class="validation-message text-accent" role="alert" aria-atomic="true">{{ error }}</p>
          <p id="calculator-note" class="control-note text-muted">{{ lang.t('estimateBeforeDate') }} <time [attr.datetime]="goldPrices.sampleDate">{{ goldPrices.sampleDate ? lang.date(goldPrices.sampleDate) : '—' }}</time>{{ lang.t('estimateAfterDate') }}</p>
        </div>
        <div class="calculator-result bg-secondary" aria-labelledby="result-title" role="status" aria-live="polite" aria-atomic="true">
          <svg class="result-icon text-gold" [class.calculator-empty-icon]="!result" viewBox="0 0 40 40" fill="none" aria-hidden="true">
            <ellipse cx="25" cy="8" rx="10" ry="4" stroke="currentColor" stroke-width="1.5" />
            <path d="M15 8v14c0 5 20 5 20 0V8M15 13c0 5 20 5 20 0M15 18c0 5 20 5 20 0" stroke="currentColor" stroke-width="1.5" />
            <ellipse cx="13" cy="25" rx="10" ry="4" stroke="currentColor" stroke-width="1.5" />
            <path d="M3 25v9c0 5 20 5 20 0v-9M3 30c0 5 20 5 20 0" stroke="currentColor" stroke-width="1.5" />
          </svg>
          <h3 id="result-title">{{ lang.t('goldValue') }}</h3>
          <div class="result-divider"></div>
          @if (result; as calculation) {
            <p class="result-value result-entrance"><bdi>{{ lang.price(calculation.total) }}</bdi></p>
          } @else {
            <p class="result-value" [attr.aria-label]="lang.t('calculationEmpty')">—</p>
          }
          <p class="text-muted">{{ lang.t('rial') }}</p>
          @if (result; as calculation) {
            <dl class="calculation-details result-entrance text-muted">
              <div><dt>{{ lang.t('purity') }}</dt><dd>{{ lang.purity(calculation.purity) }}</dd></div>
              <div><dt>{{ lang.t('weight') }}</dt><dd><bdi>{{ lang.number(calculation.weight) }}</bdi> {{ lang.t('grams') }}</dd></div>
              <div><dt>{{ lang.t('gramPrice') }}</dt><dd><bdi>{{ lang.currency(calculation.pricePerGram) }}</bdi></dd></div>
            </dl>
          }
        </div>
      </div>
    </section>
  `,
})
export class GoldCalculator {
  protected readonly goldPrices = inject(GoldPriceService);
  protected readonly lang = inject(LanguageService);
  readonly purities = this.goldPrices.purities;
  selectedPurity: GoldPurity = 24;
  result: GoldCalculation | null = null;
  private errorKey: 'invalidWeight' | 'overflowingTotal' | null = null;

  get error(): string { return this.errorKey ? this.lang.t(this.errorKey) : ''; }
  get canCalculate(): boolean { return !this.goldPrices.loading() && this.goldPrices.latest !== null; }

  changePurity(value: string): void {
    const purity = this.purities.find(purity => String(purity) === value);
    if (purity !== undefined) {
      this.selectedPurity = purity;
    }
    this.clearResult();
  }

  clearResult(): void {
    this.result = null;
    this.errorKey = null;
  }

  calculate(event: Event, weightField: HTMLInputElement): void {
    event.preventDefault();
    // Guard native Enter/programmatic submissions as well as the disabled button.
    if (!this.canCalculate) return;
    this.clearResult();
    const weight = weightField.valueAsNumber;

    if (!Number.isFinite(weight) || weight <= 0) {
      this.errorKey = 'invalidWeight';
      return;
    }

    const pricePerGram = this.goldPrices.latest!.prices[this.selectedPurity];
    const total = weight * pricePerGram;
    if (!Number.isFinite(total)) {
      this.errorKey = 'overflowingTotal';
      return;
    }

    // Keep full numeric precision. Only the template formats the displayed total.
    this.result = { purity: this.selectedPurity, weight, pricePerGram, total };
  }
}
