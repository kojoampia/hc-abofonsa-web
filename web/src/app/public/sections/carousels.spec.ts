import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { contentApiStub, translocoTesting } from '../../testing/site-content.fixture';
import { ServicesCarousel } from './services-carousel';
import { TestimonialsCarousel } from './testimonials-carousel';

describe('content carousels (spec §6 #7/#14)', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
      })),
    );
  });

  afterEach(() => vi.unstubAllGlobals());

  async function render<T>(component: new () => T) {
    await TestBed.configureTestingModule({
      imports: [component as never, translocoTesting()],
      providers: [provideZonelessChangeDetection(), contentApiStub()],
    }).compileComponents();
    const fixture = TestBed.createComponent(component);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture;
  }

  it('ServicesCarousel renders exactly one slide per seeded service', async () => {
    const fixture = await render(ServicesCarousel);
    expect(fixture.nativeElement.querySelectorAll('[aria-roledescription="slide"]').length).toBe(6);
    expect(fixture.nativeElement.textContent).toContain('Service 1');
    expect(fixture.nativeElement.textContent).toContain('Available on:');
  });

  it('ServicesCarousel navigation responds to the next arrow', async () => {
    const fixture = await render(ServicesCarousel);
    const next = fixture.nativeElement.querySelector('button[aria-label="Next slide"]') as HTMLButtonElement;
    next.click();
    fixture.detectChanges();
    await fixture.whenStable();
    const dots = fixture.nativeElement.querySelectorAll('.carousel-dot[aria-current="true"]');
    expect(dots.length).toBe(1);
  });

  it('TestimonialsCarousel renders quotes, attribution and an accessible rating', async () => {
    const fixture = await render(TestimonialsCarousel);
    expect(fixture.nativeElement.querySelectorAll('[aria-roledescription="slide"]').length).toBe(2);
    expect(fixture.nativeElement.textContent).toContain('Adwoa Boateng');
    expect(fixture.nativeElement.querySelector('[aria-label="Rating: 5/5"]')).toBeTruthy();
  });
});
