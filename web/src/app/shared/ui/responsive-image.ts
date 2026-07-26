import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { MediaRef, MediaVariantRef } from '../../core/api/site-content.model';

/**
 * One image, served at the smallest size that covers the slot (spec §13.1).
 *
 * Images are the heaviest thing a marketing page ships, and this audience is largely on mid-range
 * Android over a slow connection, so three things matter and all three are structural rather than
 * incidental:
 *
 *  - **`srcset`/`sizes`** so a 390 px phone fetches the 320 px rendition, not the 1180 px one.
 *  - **Intrinsic `width`/`height`** so the box is reserved before the bytes land. This is the whole
 *    of the CLS budget; without it every image shoves the page down as it arrives.
 *  - **A `blurHash` placeholder colour** painted underneath, so the reserved box is not a white
 *    hole. See {@link averageColourOf} for what is and is not decoded.
 *
 * Renditions are grouped into `<source>` elements by content type, best-compressing format first.
 * Today the API only produces JPEG/PNG, so exactly one group is emitted and the `<picture>` is
 * equivalent to a plain `<img>`; when AVIF/WebP encoding is added server-side the extra groups
 * appear here with no change to this component or to any template using it.
 */
@Component({
  selector: 'abc-responsive-image',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <picture>
      @for (group of sourceGroups(); track group.contentType) {
        <source [attr.type]="group.contentType" [attr.srcset]="group.srcset" [attr.sizes]="sizes()" />
      }
      <img
        [src]="media().url"
        [attr.srcset]="fallbackSrcset()"
        [attr.sizes]="fallbackSrcset() ? sizes() : null"
        [alt]="media().alt"
        [width]="media().width"
        [height]="media().height"
        [attr.loading]="priority() ? null : 'lazy'"
        [attr.fetchpriority]="priority() ? 'high' : null"
        [attr.decoding]="priority() ? 'sync' : 'async'"
        [style.background-color]="placeholderColour()"
        [class]="imgClass()"
      />
    </picture>
  `,
})
export class ResponsiveImage {
  readonly media = input.required<MediaRef>();

  /**
   * The `sizes` attribute — how wide this image renders at each breakpoint. It has no sane default:
   * a browser that is told nothing assumes 100vw and downloads the largest rendition, which is
   * exactly the waste `srcset` exists to prevent. Every caller states its own layout.
   */
  readonly sizes = input('100vw');

  /** Set on the LCP image only. It opts out of lazy loading and asks the browser to prioritise the
   * fetch; marking several images `priority` makes the term meaningless and slows the real one. */
  readonly priority = input(false);

  readonly imgClass = input('');

  private readonly renditions = computed<MediaVariantRef[]>(() => {
    const media = this.media();
    const variants = media.variants ?? [];
    // A media record with no variants (older uploads, or a fixture) still has its own URL — treat
    // that as the single rendition rather than emitting an empty srcset.
    return variants.length > 0
      ? variants
      : [{ label: 'full', width: media.width, url: media.url, contentType: 'image/jpeg' }];
  });

  /** Formats the browser should prefer over the fallback, best first. */
  protected readonly sourceGroups = computed(() => {
    const byType = new Map<string, MediaVariantRef[]>();
    for (const variant of this.renditions()) {
      byType.set(variant.contentType, [...(byType.get(variant.contentType) ?? []), variant]);
    }
    const preferenceOrder = ['image/avif', 'image/webp'];
    return preferenceOrder
      .filter((contentType) => byType.has(contentType))
      .map((contentType) => ({ contentType, srcset: srcsetOf(byType.get(contentType)!) }));
  });

  /** The `<img>` itself carries the widest-support format, which is what `<picture>` falls back to. */
  protected readonly fallbackSrcset = computed(() => {
    const fallback = this.renditions().filter(
      (variant) => variant.contentType !== 'image/avif' && variant.contentType !== 'image/webp',
    );
    return fallback.length > 1 ? srcsetOf(fallback) : null;
  });

  protected readonly placeholderColour = computed(() => averageColourOf(this.media().blurHash));
}

function srcsetOf(variants: MediaVariantRef[]): string {
  return [...variants]
    .sort((a, b) => a.width - b.width)
    .map((variant) => `${variant.url} ${variant.width}w`)
    .join(', ');
}

const BASE83 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz#$%*+,-.:;=?@[]^_{|}~";

/**
 * The average colour a blurHash encodes, as a CSS colour.
 *
 * This decodes the DC (first) component only — deliberately. The full hash decodes to a blurred
 * gradient, but rendering one needs a canvas, which does not exist during server-side rendering,
 * so the blur would pop in after hydration: motion, on the element whose entire job is to keep the
 * page still. The flat average lands identically on the server and in the browser, costs no
 * dependency and no bytes, and does the load-bearing part — the reserved box is the right colour
 * instead of a white flash. If a true blur is wanted later it belongs in a server-rendered data
 * URI, not in client-side canvas work.
 */
export function averageColourOf(blurHash: string | null | undefined): string | null {
  if (!blurHash || blurHash.length < 6) {
    return null;
  }
  let value = 0;
  for (const character of blurHash.slice(2, 6)) {
    const digit = BASE83.indexOf(character);
    if (digit < 0) {
      return null; // not a blurHash; better no placeholder than a wrong one
    }
    value = value * 83 + digit;
  }
  // The DC component stores the average as three sRGB bytes.
  return `rgb(${(value >> 16) & 255} ${(value >> 8) & 255} ${value & 255})`;
}
