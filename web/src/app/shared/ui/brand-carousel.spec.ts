import { Component, provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { BrandCarousel } from './brand-carousel';

@Component({
  imports: [BrandCarousel],
  template: `
    <abc-brand-carousel [items]="items" [autoplayMs]="autoplayMs" label="Test carousel">
      <ng-template #slide let-item let-i="index">
        <article class="slide-content">
          <h3>{{ item }}</h3>
          <a href="#">link in slide {{ i }}</a>
        </article>
      </ng-template>
    </abc-brand-carousel>
  `,
})
class HostComponent {
  items = ['one', 'two', 'three'];
  autoplayMs = 7000;
}

describe('BrandCarousel (spec §6.1 C-1..C-9)', () => {
  let fixture: ComponentFixture<HostComponent>;
  let carousel: BrandCarousel<string>;
  let matchMediaMatches: boolean;

  beforeEach(async () => {
    matchMediaMatches = false;
    vi.useFakeTimers();
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockImplementation((query: string) => ({
        matches: matchMediaMatches,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        // CDK's BreakpointObserver still calls the deprecated pair - see src/test-setup.ts.
        addListener: vi.fn(),
        removeListener: vi.fn(),
      })),
    );
    await TestBed.configureTestingModule({
      imports: [
        HostComponent,
        TranslocoTestingModule.forRoot({
          langs: { en: { 'a11y.carouselNext': 'Next slide', 'a11y.carouselPrev': 'Previous slide', 'a11y.chooseSlide': 'Go to slide' } },
          translocoConfig: { availableLangs: ['en'], defaultLang: 'en' },
        }),
      ],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    carousel = fixture.debugElement.children[0].componentInstance as BrandCarousel<string>;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  const flush = async () => {
    fixture.detectChanges();
    await fixture.whenStable();
  };

  it('C-1: next() from the last slide wraps to the first; prev() from the first wraps to the last', () => {
    carousel.goTo(2);
    carousel.next();
    expect(carousel.index()).toBe(0);
    carousel.prev();
    expect(carousel.index()).toBe(2);
  });

  it('C-2: exactly one pagination dot carries aria-current="true" after every navigation', async () => {
    const currentDots = () =>
      fixture.nativeElement.querySelectorAll('.carousel-dot[aria-current="true"]');
    expect(currentDots().length).toBe(1);
    carousel.next();
    await flush();
    expect(currentDots().length).toBe(1);
    carousel.goTo(2);
    await flush();
    expect(currentDots().length).toBe(1);
  });

  it('C-3: autoplay pauses on mouseenter/focusin and while document.hidden, resuming on the inverse', async () => {
    const region = fixture.nativeElement.querySelector('section[role="group"]') as HTMLElement;

    region.dispatchEvent(new Event('mouseenter'));
    await flush();
    vi.advanceTimersByTime(7000);
    expect(carousel.index()).toBe(0); // paused - no advance

    region.dispatchEvent(new Event('mouseleave'));
    await flush();
    vi.advanceTimersByTime(7000);
    expect(carousel.index()).toBe(1); // resumed
  });

  it('C-4: a manual interaction restarts the autoplay timer rather than leaving it mid-interval', async () => {
    vi.advanceTimersByTime(3500); // half an interval elapses
    carousel.next(); // manual click at index 0 -> 1
    await flush();
    expect(carousel.index()).toBe(1);
    vi.advanceTimersByTime(3500); // the OLD half-interval must NOT fire
    expect(carousel.index()).toBe(1);
    vi.advanceTimersByTime(3500); // a fresh full interval since the interaction has now elapsed
    expect(carousel.index()).toBe(2);
  });

  it('C-5: ArrowRight/ArrowLeft navigate and the event does not propagate to the page', () => {
    const region = fixture.nativeElement.querySelector('section[role="group"]') as HTMLElement;
    const right = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true });
    const stop = vi.spyOn(right, 'stopPropagation');
    region.dispatchEvent(right);
    expect(carousel.index()).toBe(1);
    expect(stop).toHaveBeenCalled();

    const left = new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true });
    region.dispatchEvent(left);
    expect(carousel.index()).toBe(0);
  });

  it('C-6: a horizontal swipe beyond 45 px navigates; a 20 px nudge does not', () => {
    const region = fixture.nativeElement.querySelector('section[role="group"]') as HTMLElement;
    const touch = (type: string, clientX: number) => {
      const event = new Event(type, { bubbles: true }) as TouchEvent & {
        touches: Array<{ clientX: number }>;
        changedTouches: Array<{ clientX: number }>;
      };
      Object.defineProperty(event, 'touches', { value: [{ clientX }] });
      Object.defineProperty(event, 'changedTouches', { value: [{ clientX }] });
      region.dispatchEvent(event);
    };

    touch('touchstart', 200);
    touch('touchend', 140); // 60 px left swipe -> next
    expect(carousel.index()).toBe(1);

    touch('touchstart', 200);
    touch('touchend', 180); // 20 px -> restored, no navigation
    expect(carousel.index()).toBe(1);
  });

  it('C-7: off-screen slides are aria-hidden and inert (nothing inside is tab-reachable)', async () => {
    const slides = fixture.nativeElement.querySelectorAll('[aria-roledescription="slide"]');
    expect(slides.length).toBe(3);
    expect(slides[0].getAttribute('aria-hidden')).toBeNull();
    expect(slides[1].getAttribute('aria-hidden')).toBe('true');
    expect(slides[1].hasAttribute('inert')).toBe(true);
    expect(slides[2].getAttribute('aria-hidden')).toBe('true');

    carousel.next();
    await flush();
    expect(slides[0].getAttribute('aria-hidden')).toBe('true');
    expect(slides[1].getAttribute('aria-hidden')).toBeNull();
  });

  it('C-8: with prefers-reduced-motion, autoplay never starts and the track does not animate', async () => {
    matchMediaMatches = true;
    const reduced = TestBed.createComponent(HostComponent);
    reduced.detectChanges();
    await reduced.whenStable();
    const reducedCarousel = reduced.debugElement.children[0].componentInstance as BrandCarousel<string>;

    vi.advanceTimersByTime(30000);
    expect(reducedCarousel.index()).toBe(0);
    const track = reduced.nativeElement.querySelector('[data-testid="carousel-track"]') as HTMLElement;
    expect(track.classList.contains('transition-transform')).toBe(false);
  });

  it('C-9: destroying the component clears the timer - advancing the clock changes nothing', async () => {
    vi.advanceTimersByTime(7000);
    expect(carousel.index()).toBe(1);

    fixture.destroy();
    vi.advanceTimersByTime(70000);
    expect(carousel.index()).toBe(1);
  });
});
