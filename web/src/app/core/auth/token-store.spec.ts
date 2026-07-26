import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TokenStore } from './token-store';

describe('TokenStore', () => {
  beforeEach(() => {
    sessionStorage.clear();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
  });

  it('starts unauthenticated', () => {
    const store = TestBed.inject(TokenStore);
    expect(store.isAuthenticated()).toBe(false);
    expect(store.accessToken()).toBeNull();
    expect(store.refreshToken()).toBeNull();
    expect(store.mustChangePassword()).toBe(false);
  });

  it('stores tokens, exposes them as signals, and clears them', () => {
    const store = TestBed.inject(TokenStore);
    store.store({ accessToken: 'a', refreshToken: 'r', mustChangePassword: true });

    expect(store.isAuthenticated()).toBe(true);
    expect(store.accessToken()).toBe('a');
    expect(store.refreshToken()).toBe('r');
    expect(store.mustChangePassword()).toBe(true);

    store.clear();
    expect(store.isAuthenticated()).toBe(false);
    expect(sessionStorage.getItem('abofonsa_admin_tokens')).toBeNull();
  });

  it('rehydrates a session from sessionStorage on construction', () => {
    sessionStorage.setItem(
      'abofonsa_admin_tokens',
      JSON.stringify({ accessToken: 'persisted', refreshToken: 'r', mustChangePassword: false }),
    );
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    expect(TestBed.inject(TokenStore).accessToken()).toBe('persisted');
  });

  it('survives unreadable storage rather than breaking the app', () => {
    sessionStorage.setItem('abofonsa_admin_tokens', 'not json');
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    expect(TestBed.inject(TokenStore).isAuthenticated()).toBe(false);
  });
});
