import { DOCUMENT } from '@angular/common';
import { Component, effect, ElementRef, inject, viewChild } from '@angular/core';
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
    <section #calculatorSection id="calculator" class="panel bg-card" aria-labelledby="calculator-title">
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
              <input #weightField id="gold-weight" name="gold-weight" class="field bg-card text-primary" type="number" inputmode="decimal" min="0" step="any" required [placeholder]="lang.t('weightPlaceholder')" aria-describedby="calculator-note calculator-error" [attr.aria-invalid]="error ? 'true' : null" (input)="weightChanged(weightField)" />
            </div>
            <div class="weight-shortcuts" role="group" [attr.aria-label]="lang.t('weightShortcuts')">
              @for (weight of weightShortcuts; track weight) {
                <button type="button" [attr.data-weight]="weight" [attr.aria-pressed]="weightGrams === weight" [attr.aria-label]="lang.t('setWeight', { weight: lang.number(weight) })" (click)="setWeight(weight, weightField)">{{ lang.t('weightShortcut', { weight: lang.number(weight) }) }}</button>
              }
            </div>
            <button class="calculate-button" type="submit" [disabled]="!canCalculate" aria-describedby="calculator-availability calculator-note">{{ lang.t('calculate') }}</button>
          </form>
          <p id="calculator-availability" class="control-note availability-note text-muted">{{ goldPrices.loading() ? lang.t('calculatorLoading') : !goldPrices.latest ? lang.t('calculatorUnavailable') : '' }}</p>
          <p id="calculator-error" class="validation-message text-accent" role="alert" aria-atomic="true">{{ error }}</p>
          <p id="calculator-note" class="control-note text-muted">{{ lang.t('estimateBeforeDate') }} <time [attr.datetime]="goldPrices.sampleDate">{{ goldPrices.sampleDate ? lang.date(goldPrices.sampleDate) : '—' }}</time>{{ lang.t('estimateAfterDate') }}</p>
        </div>
        <div class="calculator-result bg-secondary" aria-labelledby="result-title" role="status" [attr.aria-live]="canCalculate ? 'polite' : 'off'" aria-atomic="true">
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
            <p class="result-value" role="img" [attr.aria-label]="lang.t('calculationEmpty')">—</p>
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
  private readonly document = inject(DOCUMENT);
  private readonly section = viewChild.required<ElementRef<HTMLElement>>('calculatorSection');
  private readonly purityField = viewChild.required<ElementRef<HTMLSelectElement>>('purityField');
  protected readonly goldPrices = inject(GoldPriceService);
  protected readonly lang = inject(LanguageService);
  readonly purities = this.goldPrices.purities;
  selectedPurity: GoldPurity = 24;
  readonly weightShortcuts = [1, 5, 10, 20];
  weightGrams: number | null = null;
  result: GoldCalculation | null = null;
  private errorKey: 'invalidWeight' | 'overflowingTotal' | null = null;

  constructor() {
    effect(() => {
      this.goldPrices.loadId();
      this.clearResult();
    });
  }

  get error(): string { return this.errorKey ? this.lang.t(this.errorKey) : ''; }
  get canCalculate(): boolean { return !this.goldPrices.loading() && this.goldPrices.latest !== null; }

  usePrice(selection: { purity: GoldPurity; keyboard: boolean }): void {
    if (!this.canCalculate) return;
    this.changePurity(String(selection.purity));
    const reduce = this.document.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    this.section().nativeElement.scrollIntoView({ behavior: reduce ? 'instant' : 'smooth', block: 'start' });
    if (selection.keyboard) this.purityField().nativeElement.focus({ preventScroll: true });
  }

  weightChanged(field: HTMLInputElement): void {
    this.weightGrams = Number.isFinite(field.valueAsNumber) ? field.valueAsNumber : null;
    this.clearResult();
  }

  setWeight(weight: number, field: HTMLInputElement): void {
    field.value = String(weight);
    this.weightChanged(field);
  }

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
