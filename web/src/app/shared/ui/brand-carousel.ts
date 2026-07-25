import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  TemplateRef,
  afterNextRender,
  computed,
  contentChild,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { TranslocoPipe } from '@jsverse/transloco';

/**
 * The one hand-built carousel both the services and testimonials sections use (spec §6.1) —
 * deliberately not a third-party library: the prototype's exact interaction model is a
 * requirement, encoded as behaviours C-1..C-9 with a test each (§11.2).
 */
@Component({
  selector: 'abc-brand-carousel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgTemplateOutlet, TranslocoPipe],
  templateUrl: './brand-carousel.html',
})
export class BrandCarousel<T> {
  /** Slide data. */
  readonly items = input.required<readonly T[]>();
  /** Autoplay interval in ms; 0 disables autoplay. */
  readonly autoplayMs = input(7000);
  /** Accessible label for the carousel region. */
  readonly label = input.required<string>();
  /** Template rendered for each slide. */
  readonly slide = contentChild.required<TemplateRef<{ $implicit: T; index: number }>>('slide');

  readonly index = signal(0);
  readonly count = computed(() => this.items().length);
  readonly offset = computed(() => `translateX(${-this.index() * 100}%)`);

  /** True only after first client render — autoplay must never run during SSR (§6.1 notes). */
  private readonly ready = signal(false);
  private readonly paused = signal(false);
  private readonly documentHidden = signal(false);
  /** C-8: with prefers-reduced-motion, autoplay never starts and the track does not animate. */
  readonly reducedMotion = signal(false);
  /** Bumped on any manual interaction so the autoplay effect re-runs and the interval restarts
   * from a full period (C-4). */
  private readonly interactionEpoch = signal(0);

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private touchStartX: number | null = null;

  constructor() {
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => {
      this.ready.set(true);
      if (typeof window.matchMedia === 'function') {
        const media = window.matchMedia('(prefers-reduced-motion: reduce)');
        this.reducedMotion.set(media.matches);
        const onChange = (event: MediaQueryListEvent) => this.reducedMotion.set(event.matches);
        media.addEventListener('change', onChange);
        destroyRef.onDestroy(() => media.removeEventListener('change', onChange));
      }
      const onVisibility = () => this.documentHidden.set(document.hidden);
      document.addEventListener('visibilitychange', onVisibility);
      destroyRef.onDestroy(() => document.removeEventListener('visibilitychange', onVisibility));
    });

    // The autoplay timer lives inside one effect: any dependency change (pause, visibility,
    // reduced motion, interaction epoch) clears the old interval and, when allowed, starts a
    // fresh full-length one. onCleanup also runs on destroy - C-9 for free.
    effect((onCleanup) => {
      this.interactionEpoch(); // C-4: manual interaction restarts the interval
      const runnable =
        this.ready() &&
        this.autoplayMs() > 0 &&
        !this.paused() &&
        !this.documentHidden() &&
        !this.reducedMotion() &&
        this.count() > 1;
      if (!runnable) {
        return;
      }
      const timer = setInterval(() => this.next(false), this.autoplayMs());
      onCleanup(() => clearInterval(timer));
    });
  }

  /** C-1: wraps from the last slide to the first. */
  next(manual = true): void {
    this.index.update((i) => (i + 1) % this.count());
    if (manual) {
      this.interactionEpoch.update((n) => n + 1);
    }
  }

  /** C-1: wraps from the first slide to the last. */
  prev(manual = true): void {
    this.index.update((i) => (i - 1 + this.count()) % this.count());
    if (manual) {
      this.interactionEpoch.update((n) => n + 1);
    }
  }

  goTo(i: number): void {
    this.index.set(((i % this.count()) + this.count()) % this.count());
    this.interactionEpoch.update((n) => n + 1);
  }

  /** C-3: pause on hover/focus; resume on the inverse events. */
  pause(): void {
    this.paused.set(true);
  }

  resume(): void {
    this.paused.set(false);
  }

  /** C-5: arrow keys navigate while focus is inside; the event never reaches the page. */
  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'ArrowRight') {
      this.next();
    } else if (event.key === 'ArrowLeft') {
      this.prev();
    } else {
      return;
    }
    event.stopPropagation();
    event.preventDefault();
  }

  /** C-6: a horizontal swipe beyond 45 px navigates; anything shorter restores the position. */
  onTouchStart(event: TouchEvent): void {
    this.touchStartX = event.touches[0]?.clientX ?? null;
  }

  onTouchEnd(event: TouchEvent): void {
    if (this.touchStartX === null) {
      return;
    }
    const delta = (event.changedTouches[0]?.clientX ?? this.touchStartX) - this.touchStartX;
    this.touchStartX = null;
    if (Math.abs(delta) > 45) {
      if (delta < 0) {
        this.next();
      } else {
        this.prev();
      }
    }
  }

  focusWithin(): boolean {
    return this.host.nativeElement.contains(this.host.nativeElement.ownerDocument.activeElement);
  }
}
