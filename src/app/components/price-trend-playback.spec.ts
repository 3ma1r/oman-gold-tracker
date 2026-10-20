import { signal } from '@angular/core';
import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { DailyGoldPrice, DateOnly, GOLD_PURITIES } from '../models/gold-price';
import { GoldPriceService } from '../services/gold-price.service';
import { LanguageService } from '../services/language.service';
import { ThemeService } from '../services/theme.service';
import { PriceTrend } from './price-trend';

const API_DAYS: readonly DailyGoldPrice[] = Array.from({ length: 5 }, (_, index) => ({
  date: `2033-02-0${index + 1}` as DateOnly,
  prices: { 18: 61.123 + index, 21: 71.234 + index, 22: 81.345 + index, 24: 91.456 + index },
}));

describe('PriceTrend playback', () => {
  let fixture: ComponentFixture<PriceTrend>, component: PriceTrend, element: HTMLElement;
  let days: ReturnType<typeof signal<readonly DailyGoldPrice[]>>;
  let loading: ReturnType<typeof signal<boolean>>, loadId: ReturnType<typeof signal<number>>;
  let hidden: jasmine.Spy;
  let original: { lang: string; dir: string; title: string; className: string; scheme: string };
  beforeEach(async () => {
    original = { lang: document.documentElement.lang, dir: document.documentElement.dir, title: document.title,
      className: document.documentElement.className, scheme: document.documentElement.style.colorScheme };
    spyOn(Storage.prototype, 'getItem').and.returnValue(null); spyOn(Storage.prototype, 'setItem');
    hidden = spyOnProperty(document, 'hidden', 'get').and.returnValue(false);
    days = signal(API_DAYS); loading = signal(false); loadId = signal(1);
    await TestBed.configureTestingModule({ imports: [PriceTrend], providers: [{ provide: GoldPriceService, useValue: {
      get days() { return days(); }, loading, loadId, purities: GOLD_PURITIES,
    } }] }).compileComponents();
  });
  afterEach(() => {
    fixture?.destroy(); document.documentElement.lang = original.lang; document.documentElement.dir = original.dir;
    document.title = original.title; document.documentElement.className = original.className;
    document.documentElement.style.colorScheme = original.scheme;
  });
  function render() {
    fixture = TestBed.createComponent(PriceTrend); component = fixture.componentInstance;
    element = fixture.nativeElement; fixture.detectChanges();
  }
  function click(selector: string) { element.querySelector<HTMLButtonElement>(selector)!.click(); fixture.detectChanges(); }
  function checkPosition(index: number) {
    fixture.detectChanges();
    expect(component.selectedDate()).toBe(API_DAYS[index].date);
    expect(element.querySelector<HTMLInputElement>('.playback-slider')!.value).toBe(String(index));
    expect(element.querySelector('.playback-position time')!.getAttribute('datetime')).toBe(API_DAYS[index].date);
    expect(element.querySelector('.chart-tooltip time')!.getAttribute('datetime')).toBe(API_DAYS[index].date);
    expect(element.querySelector('.chart-marker-selected')).not.toBeNull();
    expect(element.querySelector('.playback-position span')?.textContent).toBe(component.playbackDayLabel());
  }

  it('starts only on Play, uses the actual five API days, advances once per second and stops at the end', fakeAsync(() => {
    render(); tick(5000); expect(component.playing()).toBeFalse(); expect(component.selectedDate()).toBeNull();
    expect(element.querySelector<HTMLInputElement>('.playback-slider')!.max).toBe('4');
    click('.playback-toggle'); checkPosition(0);
    tick(999); checkPosition(0); tick(1); checkPosition(1);
    tick(3000); checkPosition(4); expect(component.playing()).toBeFalse();
    tick(4000); checkPosition(4); expect(component.selectionAnnouncement()).toBe('');
    click('.playback-toggle'); checkPosition(0); expect(component.playing()).toBeTrue();
    component.pausePlayback();
  }));

  it('pauses, resumes from its selected day, and Restart rewinds and pauses', fakeAsync(() => {
    render(); click('.playback-toggle'); tick(1000); click('.playback-toggle'); checkPosition(1);
    tick(3000); checkPosition(1); expect(component.playing()).toBeFalse();
    click('.playback-toggle'); tick(1000); checkPosition(2);
    click('.playback-restart'); checkPosition(0); expect(component.playing()).toBeFalse();
    expect(component.selectionAnnouncement()).toContain(TestBed.inject(LanguageService).date(API_DAYS[0].date));
    tick(3000); checkPosition(0);
  }));

  it('pauses and announces slider, clicked point and existing keyboard selections', fakeAsync(() => {
    render(); click('.playback-toggle');
    const slider = element.querySelector<HTMLInputElement>('.playback-slider')!;
    slider.value = '2'; slider.dispatchEvent(new Event('input', { bubbles: true })); checkPosition(2);
    expect(component.playing()).toBeFalse(); expect(component.selectionAnnouncement()).toContain(TestBed.inject(LanguageService).price(API_DAYS[2].prices[24]));
    tick(2000); checkPosition(2);
    click('.playback-toggle');
    const svg = element.querySelector('svg.price-chart')!;
    spyOn(svg, 'getBoundingClientRect').and.returnValue(new DOMRect(0, 0, 900, 240));
    svg.dispatchEvent(new MouseEvent('click', { clientX: 888 })); checkPosition(4);
    expect(component.playing()).toBeFalse();
    click('.playback-toggle');
    element.querySelector('.chart-plot')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', cancelable: true }));
    checkPosition(1); expect(component.playing()).toBeFalse();
    component.chartKeydown(new KeyboardEvent('keydown', { key: 'End' })); checkPosition(4);
    click('.playback-toggle');
    component.chartKeydown(new KeyboardEvent('keydown', { key: 'Escape' })); fixture.detectChanges();
    expect(component.selectedDate()).toBeNull(); expect(component.playing()).toBeFalse();
    expect(element.querySelector('.chart-tooltip')).toBeNull(); tick(3000);
  }));

  it('keeps hover previews temporary without changing progression or announcing ticks', fakeAsync(() => {
    render(); click('.playback-toggle');
    const svg = element.querySelector('svg.price-chart')!;
    spyOn(svg, 'getBoundingClientRect').and.returnValue(new DOMRect(0, 0, 900, 240));
    svg.dispatchEvent(new PointerEvent('pointermove', { clientX: 888, pointerType: 'mouse' }));
    tick(1000); fixture.detectChanges();
    expect(component.selectedDate()).toBe(API_DAYS[1].date);
    expect(component.tooltipPoint()?.day.date).toBe(API_DAYS[4].date);
    expect(component.isPreview()).toBeTrue(); expect(component.playing()).toBeTrue();
    expect(component.playbackIndex()).toBe(1); expect(component.selectionAnnouncement()).toBe('');
    element.querySelector('.chart-plot')!.dispatchEvent(new PointerEvent('pointerleave')); checkPosition(1);
    component.pausePlayback();
  }));

  it('pauses as soon as the slider is engaged, even before its value changes', fakeAsync(() => {
    render(); click('.playback-toggle'); tick(1000);
    const slider = element.querySelector<HTMLInputElement>('.playback-slider')!;
    slider.dispatchEvent(new PointerEvent('pointerdown')); tick(2000); checkPosition(1);
    expect(component.playing()).toBeFalse();
    click('.playback-toggle'); slider.dispatchEvent(new FocusEvent('focus')); tick(2000); checkPosition(1);
    expect(component.playing()).toBeFalse();
  }));

  it('preserves progression across purity, language and theme changes, with localized controls and prices', fakeAsync(() => {
    render(); click('.playback-toggle'); tick(1000);
    click('[data-purity="18"]'); checkPosition(1); expect(component.playing()).toBeTrue();
    TestBed.inject(LanguageService).setLanguage('en'); TestBed.inject(ThemeService).setTheme('dark'); fixture.detectChanges();
    expect(element.querySelector('.playback-toggle')?.textContent?.trim()).toBe('Pause');
    expect(element.querySelector('.playback-position span')?.textContent).toBe('Day 2 of 5');
    expect(element.querySelector('.chart-tooltip')?.textContent).toContain('62.123');
    expect(element.querySelector('.chart-playback')?.getAttribute('dir')).toBe('ltr');
    expect(element.querySelector('label[for="trend-date-slider"]')).not.toBeNull();
    expect(element.querySelector('.playback-slider')?.getAttribute('aria-valuetext')).toContain('18K');
    tick(1000); checkPosition(2); expect(component.selectionAnnouncement()).toBe('');
    component.pausePlayback();
  }));

  it('stops on reload/failure, clears progress, and uses the replacement dataset length', fakeAsync(() => {
    render(); click('.playback-toggle'); tick(1000);
    loadId.set(2); loading.set(true); days.set([]); fixture.detectChanges();
    expect(component.playing()).toBeFalse(); expect(component.selectedDate()).toBeNull();
    tick(5000); loading.set(false); fixture.detectChanges();
    expect(element.querySelector<HTMLButtonElement>('.playback-toggle')?.disabled).toBeTrue();
    days.set([...API_DAYS.slice(0, 3)].reverse()); loadId.set(3); fixture.detectChanges();
    click('.playback-toggle'); tick(2000); checkPosition(2);
    expect(component.playing()).toBeFalse(); expect(component.sliderMaximum()).toBe(2);
  }));

  it('pauses when hidden and never starts or resumes automatically when visible', fakeAsync(() => {
    render(); click('.playback-toggle'); tick(1000);
    hidden.and.returnValue(true); document.dispatchEvent(new Event('visibilitychange'));
    tick(3000); checkPosition(1); expect(component.playing()).toBeFalse();
    component.togglePlayback(); expect(component.playing()).toBeFalse();
    hidden.and.returnValue(false); document.dispatchEvent(new Event('visibilitychange'));
    tick(2000); checkPosition(1); expect(component.playing()).toBeFalse();
  }));

  it('cleans up its interval and document listener when destroyed', fakeAsync(() => {
    const add = spyOn(document, 'addEventListener').and.callThrough();
    const remove = spyOn(document, 'removeEventListener').and.callThrough();
    render(); click('.playback-toggle'); tick(1000);
    const listener = add.calls.allArgs().find(args => args[0] === 'visibilitychange')![1];
    fixture.destroy(); tick(5000);
    expect(component.selectedDate()).toBe(API_DAYS[1].date); expect(component.playing()).toBeFalse();
    expect(remove).toHaveBeenCalledWith('visibilitychange', listener);
  }));

  for (const size of [0, 1]) {
    it(`handles ${size} records without starting a timer or creating invalid positions`, fakeAsync(() => {
      days.set(API_DAYS.slice(0, size)); render();
      expect(element.querySelector<HTMLButtonElement>('.playback-toggle')?.disabled).toBeTrue();
      component.togglePlayback(); component.restartPlayback(); tick(5000); fixture.detectChanges();
      expect(component.playing()).toBeFalse(); expect(component.sliderMaximum()).toBe(0);
      expect(element.innerHTML).not.toMatch(/NaN|Infinity/);
      expect(component.selectedDate()).toBe(size ? API_DAYS[0].date : null);
    }));
  }
});
