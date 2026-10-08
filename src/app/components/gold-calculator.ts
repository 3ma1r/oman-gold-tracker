import { Component } from '@angular/core';

@Component({
  selector: 'app-gold-calculator',
  standalone: true,
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
          <div class="calculator-fields grid grid-cols-1 sm:grid-cols-[1.2fr_1fr_auto] gap-4">
            <div class="field-group">
              <label for="gold-purity">عيار الذهب</label>
              <select id="gold-purity" name="gold-purity" class="field bg-card text-primary">
                <option value="24">24 قيراط</option>
                <option value="22">22 قيراط</option>
                <option value="21">21 قيراط</option>
                <option value="18">18 قيراط</option>
              </select>
            </div>
            <div class="field-group">
              <label for="gold-weight">الوزن (غرام)</label>
              <input id="gold-weight" name="gold-weight" class="field bg-card text-primary" type="number" inputmode="decimal" min="0" step="0.01" placeholder="أدخل الوزن" aria-describedby="calculator-note" />
            </div>
            <button class="calculate-button" type="button" disabled aria-describedby="calculator-note">احسب</button>
          </div>
          <p id="calculator-note" class="control-note text-muted">الحاسبة قيد الإعداد، ولا تُجري حسابات بعد.</p>
        </div>
        <div class="calculator-result bg-secondary" aria-labelledby="result-title">
          <svg class="result-icon text-gold" viewBox="0 0 40 40" fill="none" aria-hidden="true">
            <ellipse cx="25" cy="8" rx="10" ry="4" stroke="currentColor" stroke-width="1.5" />
            <path d="M15 8v14c0 5 20 5 20 0V8M15 13c0 5 20 5 20 0M15 18c0 5 20 5 20 0" stroke="currentColor" stroke-width="1.5" />
            <ellipse cx="13" cy="25" rx="10" ry="4" stroke="currentColor" stroke-width="1.5" />
            <path d="M3 25v9c0 5 20 5 20 0v-9M3 30c0 5 20 5 20 0" stroke="currentColor" stroke-width="1.5" />
          </svg>
          <h3 id="result-title">قيمة الذهب</h3>
          <div class="result-divider"></div>
          <p class="result-value" aria-label="لم تُحسب القيمة بعد">—</p>
          <p class="text-muted">ريال عُماني</p>
        </div>
      </div>
    </section>
  `,
})
export class GoldCalculator {}
