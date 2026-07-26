import { TestBed } from '@angular/core/testing';
import { Component, provideZonelessChangeDetection, signal } from '@angular/core';
import { MediaRef } from '../../core/api/site-content.model';
import { ResponsiveImage, averageColourOf } from './responsive-image';

function mediaFixture(overrides: Partial<MediaRef> = {}): MediaRef {
  return {
    id: 'media-1',
    url: '/media/2026/07/photo-full.jpg',
    alt: 'A nurse checking a patient at home',
    width: 1180,
    height: 760,
    blurHash: 'LEHV6nWB2yk8pyo0adR*.7kCMdnj',
    variants: [
      { label: 'thumb', width: 320, url: '/media/2026/07/photo-thumb.jpg', contentType: 'image/jpeg' },
      { label: 'full', width: 1180, url: '/media/2026/07/photo-full.jpg', contentType: 'image/jpeg' },
      { label: 'medium', width: 760, url: '/media/2026/07/photo-medium.jpg', contentType: 'image/jpeg' },
    ],
    ...overrides,
  };
}

@Component({
  imports: [ResponsiveImage],
  template: `<abc-responsive-image [media]="media()" [priority]="priority()" [sizes]="sizes()" />`,
})
class Host {
  readonly media = signal<MediaRef>(mediaFixture());
  readonly priority = signal(false);
  readonly sizes = signal('(min-width: 1024px) 50vw, 100vw');
}

describe('ResponsiveImage (spec §13.1)', () => {
  async function render(): Promise<{ host: Host; img: HTMLImageElement; picture: HTMLElement }> {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    return {
      host: fixture.componentInstance,
      img: fixture.nativeElement.querySelector('img'),
      picture: fixture.nativeElement.querySelector('picture'),
    };
  }

  it('offers every rendition, narrowest first, so the browser can pick the smallest that fits', async () => {
    const { img } = await render();
    expect(img.getAttribute('srcset')).toBe(
      '/media/2026/07/photo-thumb.jpg 320w, /media/2026/07/photo-medium.jpg 760w, /media/2026/07/photo-full.jpg 1180w',
    );
  });

  it('passes sizes through — without it a browser assumes 100vw and defeats the srcset', async () => {
    const { img } = await render();
    expect(img.getAttribute('sizes')).toBe('(min-width: 1024px) 50vw, 100vw');
  });

  it('reserves the box with intrinsic dimensions, which is the whole CLS budget', async () => {
    const { img } = await render();
    expect(img.getAttribute('width')).toBe('1180');
    expect(img.getAttribute('height')).toBe('760');
  });

  it('lazy-loads by default and opts out only when marked priority', async () => {
    const { host, img } = await render();
    expect(img.getAttribute('loading')).toBe('lazy');
    expect(img.getAttribute('fetchpriority')).toBeNull();

    host.priority.set(true);
    TestBed.tick();
    expect(img.getAttribute('loading')).toBeNull();
    expect(img.getAttribute('fetchpriority')).toBe('high');
  });

  it('paints the blurHash average colour under the image so the reserved box is not a white hole', async () => {
    const { img } = await render();
    expect(img.style.backgroundColor).not.toBe('');
  });

  it('emits no <source> while the API produces only JPEG, and degrades to a plain img', async () => {
    // Guards the forward-compatible path: the picture element must not emit an empty or
    // JPEG-typed <source>, which would gain nothing and risk shadowing the fallback.
    const { picture } = await render();
    expect(picture.querySelectorAll('source').length).toBe(0);
  });

  it('prefers AVIF then WebP when the API starts producing them, keeping JPEG as the fallback', async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.media.set(
      mediaFixture({
        variants: [
          { label: 'full', width: 1180, url: '/m/full.jpg', contentType: 'image/jpeg' },
          { label: 'full', width: 1180, url: '/m/full.webp', contentType: 'image/webp' },
          { label: 'full', width: 1180, url: '/m/full.avif', contentType: 'image/avif' },
        ],
      }),
    );
    await fixture.whenStable();
    const sources = [...fixture.nativeElement.querySelectorAll('source')] as HTMLSourceElement[];
    expect(sources.map((source) => source.getAttribute('type'))).toEqual(['image/avif', 'image/webp']);
    expect(fixture.nativeElement.querySelector('img').getAttribute('src')).toContain('.jpg');
  });

  it('falls back to the single url when a record carries no variants', async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.media.set(mediaFixture({ variants: [] }));
    await fixture.whenStable();
    const img = fixture.nativeElement.querySelector('img');
    expect(img.getAttribute('src')).toBe('/media/2026/07/photo-full.jpg');
    expect(img.getAttribute('srcset')).toBeNull();
  });
});

describe('averageColourOf', () => {
  it('decodes the DC component to an rgb() colour', () => {
    expect(averageColourOf('LEHV6nWB2yk8pyo0adR*.7kCMdnj')).toMatch(/^rgb\(\d+ \d+ \d+\)$/);
  });

  it('returns null rather than a wrong colour for input that is not a blurHash', () => {
    expect(averageColourOf('')).toBeNull();
    expect(averageColourOf(null)).toBeNull();
    expect(averageColourOf('abc')).toBeNull();
    // '\\' is outside the base83 alphabet.
    expect(averageColourOf('LE\\\\\\\\6nWB')).toBeNull();
  });
});
