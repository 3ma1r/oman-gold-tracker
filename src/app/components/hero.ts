import { Component } from '@angular/core';

@Component({
  selector: 'app-hero',
  standalone: true,
  template: `
    <section id="home" class="hero" aria-labelledby="hero-title">
      <div class="page-shell hero-inner">
        <nav class="breadcrumb" aria-label="مسار الصفحة">
          <ol>
            <li><a href="#home">الرئيسية</a></li>
            <li aria-hidden="true">‹</li>
            <li aria-current="page">أسعار الذهب في عُمان</li>
          </ol>
        </nav>
        <div class="hero-copy">
          <h1 id="hero-title">أسعار الذهب في عُمان</h1>
          <p>أسعار الذهب في سلطنة عُمان بمختلف العيارات، مع حاسبة للذهب ورسوم بيانية وسجل تاريخي مبسط.</p>
          <span class="sample-badge bg-oatmeal text-espresso">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.6" />
              <path d="M12 11v6m0-10v1" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
            </svg>
            بيانات تجريبية
          </span>
        </div>
        <dl class="hero-details">
          <div><dt>تاريخ البيانات التجريبية</dt><dd>—</dd></div>
          <div><dt>السوق</dt><dd>سلطنة عُمان</dd></div>
          <div><dt>العملة</dt><dd>ريال عُماني <bdi>(OMR)</bdi></dd></div>
          <div><dt>الوحدة</dt><dd>السعر لكل غرام</dd></div>
        </dl>
      </div>
    </section>
  `,
})
export class Hero {}
