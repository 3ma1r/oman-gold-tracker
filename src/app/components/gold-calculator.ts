import { Component, inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { GoldPurity } from '../models/gold-price';
import { GoldPriceService } from '../services/gold-price.service';
import { formatSampleDate } from '../services/gold-price-format';

interface GoldCalculation {
  readonly purity: GoldPurity;
  readonly weight: number;
  readonly pricePerGram: number;
  readonly total: number;
}

@Component({
  selector: 'app-gold-calculator',
  standalone: true,
  imports: [DecimalPipe],
  template: `
    <section id="calculator" class="panel bg-card" aria-labelledby="calculator-title">
      <div class="calculator-layout grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-8">
        <div>
          <div class="section-heading">
            <svg class="section-icon text-cocoa" viewBox="0 0 32 36" fill="none" aria-hidden="true">
              <rect x="5" y="2" width="22" height="32" rx="3" stroke="currentColor" stroke-width="2.2" />
              <path d="M10 8h12v6H10zM10 20h2m4 0h2m4 0h0M10 26h2m4 0h2m4 0h0" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" />
            </svg>
            <div>
              <h2 id="calculator-title">حاسبة الذهب</h2>
              <p class="text-muted">احسب قيمة الذهب بناءً على العيار والوزن.</p>
            </div>
          </div>
          <form class="calculator-fields grid grid-cols-1 sm:grid-cols-[1.2fr_1fr_auto] gap-4" novalidate (submit)="calculate($event, weightField)">
            <div class="field-group">
              <label for="gold-purity">عيار الذهب</label>
              <select #purityField id="gold-purity" name="gold-purity" class="field bg-card text-primary" (change)="changePurity(purityField.value)">
                @for (purity of purities; track purity) {
                  <option [value]="purity" [selected]="purity === selectedPurity">{{ purity }} قيراط</option>
                }
              </select>
            </div>
            <div class="field-group">
              <label for="gold-weight">الوزن (غرام)</label>
              <input #weightField id="gold-weight" name="gold-weight" class="field bg-card text-primary" type="number" inputmode="decimal" min="0" step="any" required placeholder="أدخل الوزن" aria-describedby="calculator-note calculator-error" [attr.aria-invalid]="error ? 'true' : null" (input)="clearResult()" />
            </div>
            <button class="calculate-button" type="submit" aria-describedby="calculator-note">احسب</button>
          </form>
          <p id="calculator-error" class="validation-message text-cocoa" role="alert" aria-atomic="true">{{ error }}</p>
          <p id="calculator-note" class="control-note text-muted">تقدير بأسعار تجريبية بتاريخ <time [attr.datetime]="goldPrices.sampleDate">{{ sampleDateLabel }}</time>، ولا يشمل المصنعية أو الرسوم الأخرى.</p>
        </div>
        <div class="calculator-result bg-secondary" aria-labelledby="result-title" role="status" aria-live="polite" aria-atomic="true">
          <svg class="result-icon text-gold" viewBox="0 0 40 40" fill="none" aria-hidden="true">
            <ellipse cx="25" cy="8" rx="10" ry="4" stroke="currentColor" stroke-width="1.5" />
            <path d="M15 8v14c0 5 20 5 20 0V8M15 13c0 5 20 5 20 0M15 18c0 5 20 5 20 0" stroke="currentColor" stroke-width="1.5" />
            <ellipse cx="13" cy="25" rx="10" ry="4" stroke="currentColor" stroke-width="1.5" />
            <path d="M3 25v9c0 5 20 5 20 0v-9M3 30c0 5 20 5 20 0" stroke="currentColor" stroke-width="1.5" />
          </svg>
          <h3 id="result-title">قيمة الذهب</h3>
          <div class="result-divider"></div>
          @if (result; as calculation) {
            <p class="result-value"><bdi>{{ calculation.total | number:'1.3-3':'en-US' }}</bdi></p>
          } @else {
            <p class="result-value" aria-label="لم تُحسب القيمة بعد">—</p>
          }
          <p class="text-muted">ريال عُماني</p>
          @if (result; as calculation) {
            <dl class="calculation-details text-muted">
              <div><dt>العيار</dt><dd>{{ calculation.purity }} قيراط</dd></div>
              <div><dt>الوزن</dt><dd><bdi>{{ calculation.weight }}</bdi> غرام</dd></div>
              <div><dt>سعر الغرام</dt><dd><bdi>{{ calculation.pricePerGram | number:'1.3-3':'en-US' }}</bdi> ريال عُماني</dd></div>
            </dl>
          }
        </div>
      </div>
    </section>
  `,
})
export class GoldCalculator {
  protected readonly goldPrices = inject(GoldPriceService);
  readonly purities = this.goldPrices.purities;
  readonly sampleDateLabel = formatSampleDate(this.goldPrices.sampleDate);
  selectedPurity: GoldPurity = 24;
  result: GoldCalculation | null = null;
  error = '';

  changePurity(value: string): void {
    const purity = this.purities.find(purity => String(purity) === value);
    if (purity !== undefined) {
      this.selectedPurity = purity;
    }
    this.clearResult();
  }

  clearResult(): void {
    this.result = null;
    this.error = '';
  }

  calculate(event: Event, weightField: HTMLInputElement): void {
    event.preventDefault();
    this.clearResult();
    const weight = weightField.valueAsNumber;

    if (!Number.isFinite(weight) || weight <= 0) {
      this.error = 'أدخل وزناً صالحاً أكبر من صفر بالغرام.';
      return;
    }

    const pricePerGram = this.goldPrices.latest.prices[this.selectedPurity];
    const total = weight * pricePerGram;
    if (!Number.isFinite(total)) {
      this.error = 'القيمة الناتجة كبيرة جداً. أدخل وزناً أصغر لإجراء الحساب.';
      return;
    }

    // Keep full numeric precision. Only the template formats the displayed total.
    this.result = { purity: this.selectedPurity, weight, pricePerGram, total };
  }
}
