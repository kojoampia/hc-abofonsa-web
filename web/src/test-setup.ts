/**
 * Global unit-test setup. jsdom implements neither `matchMedia` nor the modern/legacy listener
 * pair, and Angular CDK's BreakpointObserver (pulled in by every Material overlay component)
 * calls the deprecated `addListener` form — so the stub has to provide both.
 *
 * Tests that need `prefers-reduced-motion` to match (BrandCarousel C-8) override this with their
 * own `vi.stubGlobal`.
 */
const mediaQueryList = (query: string): MediaQueryList =>
  ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
  }) as unknown as MediaQueryList;

if (!window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: (query: string) => mediaQueryList(query),
  });
}

// jsdom has no layout engine; Material's overlay/ripple code paths call these on occasion.
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => undefined;
}
