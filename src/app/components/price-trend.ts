import { Component } from '@angular/core';

@Component({
  selector: 'app-price-trend',
  standalone: true,
  template: `
    <section id="trends" class="panel bg-card" aria-labelledby="trends-title">
      <div class="trend-top grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <div class="section-heading">
            <svg class="section-icon text-cocoa" viewBox="0 0 32 36" fill="none" aria-hidden="true">
              <path d="M5 31v-7m8 7V17m8 14V10m8 21V3" stroke="currentColor" stroke-width="4" stroke-linecap="round" />
            </svg>
            <div>
              <h2 id="trends-title">حركة الأسعار</h2>
              <p class="text-muted">الرسم البياني لأسعار الذهب حسب العيار.</p>
            </div>
          </div>
          <fieldset class="purity-tabs">
            <legend class="sr-only">عيار الذهب للرسم البياني</legend>
            <label class="purity-tab"><input type="radio" name="trend-purity" value="24" checked /><span>24 قيراط</span></label>
            <label class="purity-tab"><input type="radio" name="trend-purity" value="22" /><span>22 قيراط</span></label>
            <label class="purity-tab"><input type="radio" name="trend-purity" value="21" /><span>21 قيراط</span></label>
            <label class="purity-tab"><input type="radio" name="trend-purity" value="18" /><span>18 قيراط</span></label>
          </fieldset>
        </div>
        <dl class="trend-stats">
          <div><dt class="text-muted">السعر الحالي</dt><dd>—</dd><span class="text-muted">ريال عُماني</span></div>
          <div><dt class="text-muted">أعلى سعر</dt><dd>—</dd><span class="text-muted">ريال عُماني</span></div>
          <div><dt class="text-muted">أدنى سعر</dt><dd>—</dd><span class="text-muted">ريال عُماني</span></div>
        </dl>
      </div>
      <div class="chart-empty" role="img" aria-label="منطقة الرسم البياني: لا توجد بيانات أسعار بعد">
        <div>
          <svg class="empty-icon text-taupe" viewBox="0 0 48 48" fill="none" aria-hidden="true">
            <path d="M8 7v33h33M16 31l8-9 8 4 9-12" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          <p>لا توجد بيانات للرسم البياني بعد</p>
        </div>
      </div>
    </section>
  `,
})
export class PriceTrend {}
