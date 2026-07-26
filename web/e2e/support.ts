import { APIRequestContext, Page, expect } from '@playwright/test';

export const BOOTSTRAP_PASSWORD = process.env['E2E_BOOTSTRAP_PASSWORD'] ?? 'local-bootstrap-password';
export const API_BASE = process.env['E2E_API_BASE'] ?? 'http://localhost:8080/api/v1';

/**
 * The bootstrap admin is seeded with mustChangePassword=true, so the very first e2e run rotates
 * it and later runs sign in with the rotated one. Both paths are tried so the suite is
 * re-runnable against a persistent volume without manual cleanup.
 */
export const ROTATED_PASSWORD = 'e2e-rotated-password-123';

export interface Tokens {
  accessToken: string;
  refreshToken: string;
  mustChangePassword: boolean;
}

export async function adminTokens(request: APIRequestContext): Promise<Tokens> {
  for (const password of [ROTATED_PASSWORD, BOOTSTRAP_PASSWORD]) {
    const response = await request.post(`${API_BASE}/admin/auth/login`, {
      data: { username: 'admin', password },
    });
    if (!response.ok()) {
      continue;
    }
    const tokens = (await response.json()) as Tokens;
    if (!tokens.mustChangePassword) {
      return tokens;
    }
    // Gated bootstrap token: rotate, then sign in again with the new password.
    const changed = await request.post(`${API_BASE}/admin/account/change-password`, {
      headers: { Authorization: `Bearer ${tokens.accessToken}` },
      data: { currentPassword: password, newPassword: ROTATED_PASSWORD },
    });
    expect(changed.ok(), 'bootstrap password rotation should succeed').toBeTruthy();
    const retry = await request.post(`${API_BASE}/admin/auth/login`, {
      data: { username: 'admin', password: ROTATED_PASSWORD },
    });
    expect(retry.ok()).toBeTruthy();
    return (await retry.json()) as Tokens;
  }
  throw new Error('Could not authenticate the e2e admin with either the bootstrap or rotated password');
}

export function authHeaders(tokens: Tokens): Record<string, string> {
  return { Authorization: `Bearer ${tokens.accessToken}` };
}

/** Seeds the browser session so the CMS considers the user signed in without driving the form. */
export async function signInBrowser(page: Page, tokens: Tokens): Promise<void> {
  await page.goto('/admin/login');
  await page.evaluate((value) => sessionStorage.setItem('abofonsa_admin_tokens', value), JSON.stringify(tokens));
}

export async function gotoLocale(page: Page, locale: string): Promise<void> {
  await page.goto(locale === 'en' ? '/' : `/${locale}`);
  await expect(page.locator('main#main')).toBeVisible();
}
