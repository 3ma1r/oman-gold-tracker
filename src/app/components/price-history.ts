import { Component } from '@angular/core';

@Component({
  selector: 'app-price-history',
  standalone: true,
  template: `
    <section id="history" class="panel bg-card" aria-labelledby="history-title">
      <div class="section-heading">
        <svg class="section-icon text-cocoa" viewBox="0 0 32 36" fill="none" aria-hidden="true">
          <rect x="3" y="6" width="26" height="27" rx="3" stroke="currentColor" stroke-width="2.2" />
          <path d="M10 2v8m12-8v8M3 15h26M10 21h1m9 0h1m-11 6h1m9 0h1" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" />
        </svg>
        <div>
          <h2 id="history-title">سجل الأسعار</h2>
          <p class="text-muted">سجل أسعار الذهب في سلطنة عُمان، بالريال العُماني لكل غرام.</p>
        </div>
      </div>
      <div class="history-scroll" tabindex="0" role="region" aria-label="جدول سجل الأسعار — قابل للتمرير أفقياً">
        <table>
          <caption class="sr-only">تاريخ أسعار الذهب وعيارات 24 و22 و21 و18 قيراط</caption>
          <thead class="bg-secondary text-primary">
            <tr>
              <th scope="col">التاريخ</th>
              <th scope="col">ذهب 24 قيراط</th>
              <th scope="col">ذهب 22 قيراط</th>
              <th scope="col">ذهب 21 قيراط</th>
              <th scope="col">ذهب 18 قيراط</th>
            </tr>
          </thead>
          <tbody>
            <tr><td colspan="5" class="history-empty text-muted">لا توجد بيانات تاريخية بعد</td></tr>
          </tbody>
        </table>
      </div>
    </section>
  `,
})
export class PriceHistory {}
