import { Injectable, computed, signal } from '@angular/core';

interface StoredTokens {
  accessToken: string;
  refreshToken: string;
  mustChangePassword: boolean;
}

const STORAGE_KEY = 'abofonsa_admin_tokens';

/**
 * Admin-only token store (spec §4 layout: {@code core/auth}). Tokens live in sessionStorage —
 * the CMS is a staff tool on trusted machines, and sessionStorage clears with the tab, which
 * beats localStorage for tokens this short-lived (30 min access / 14 d rotated refresh).
 */
@Injectable({ providedIn: 'root' })
export class TokenStore {
  private readonly tokens = signal<StoredTokens | null>(readInitial());

  readonly accessToken = computed(() => this.tokens()?.accessToken ?? null);
  readonly refreshToken = computed(() => this.tokens()?.refreshToken ?? null);
  readonly mustChangePassword = computed(() => this.tokens()?.mustChangePassword ?? false);
  readonly isAuthenticated = computed(() => !!this.tokens());

  store(tokens: StoredTokens): void {
    this.tokens.set(tokens);
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
    } catch {
      /* SSR / storage unavailable - in-memory only */
    }
  }

  clear(): void {
    this.tokens.set(null);
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }
}

function readInitial(): StoredTokens | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredTokens) : null;
  } catch {
    return null;
  }
}
