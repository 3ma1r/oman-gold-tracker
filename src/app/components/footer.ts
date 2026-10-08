import { Component } from '@angular/core';

@Component({
  selector: 'app-footer',
  standalone: true,
  template: `
    <footer class="site-footer bg-card">
      <div class="page-shell footer-inner">
        <div>
          <p class="footer-brand">الذهب العُماني</p>
          <p class="text-muted">أسعار الذهب في سلطنة عُمان</p>
        </div>
        <p class="copyright text-muted">© {{ year }} الذهب العُماني. جميع الحقوق محفوظة.</p>
      </div>
    </footer>
  `,
})
export class Footer {
  readonly year = new Date().getFullYear();
}
