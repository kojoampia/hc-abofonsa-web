import { flatten } from './transloco-http.loader';

describe('bundle flattening (spec §10.2/§10.3)', () => {
  it('flattens nested bundle objects to the dot-delimited namespace', () => {
    expect(flatten({ nav: { pricing: 'Plans', home: 'Home' }, single: 'x' })).toEqual({
      'nav.pricing': 'Plans',
      'nav.home': 'Home',
      single: 'x',
    });
  });

  it('an override entry replaces the flattened default under the same key', () => {
    const defaults = flatten({ nav: { pricing: 'Plans and pricing' } });
    const merged = { ...defaults, ...{ 'nav.pricing': 'Fees & plans' } };
    expect(merged['nav.pricing']).toBe('Fees & plans');
  });
});
