import { TestBed } from '@angular/core/testing';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render the Arabic page and empty history', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('أسعار الذهب في عُمان');
    expect(compiled.querySelectorAll('app-price-card').length).toBe(4);
    expect(compiled.querySelector('tbody')?.textContent).toContain('لا توجد بيانات تاريخية بعد');
  });
});
