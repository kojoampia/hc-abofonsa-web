import { APIRequestContext, Page, expect } from '@playwright/test';

export const BOOTSTRAP_PASSWORD = process.env['E2E_BOOTSTRAP_PASSWORD'] ?? 'local-bootstrap-password';
export const API_BASE = process.env['E2E_API_BASE'] ?? 'http://localhost:8080/api/v1';

/** The origin the handoff is expected to use once the portal is deployed (careers-plan.md §5). */
export const PROFESSIONAL_PORTAL = 'https://professional.abofonsa.com';

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

/**
 * Points the careers apply buttons at a portal for the duration of `body`, then puts the setting
 * back exactly as it was.
 *
 * The seeded state has no portal configured, because professional.abofonsa.com is not deployed
 * (careers-plan.md task 144) and a button leading to a connection error is worse than no button.
 * That is the state the site ships in and the state most tests assert. The handoff *contract* still
 * has to be verified though — those parameters are the whole agreement with hc-professional — so the
 * tests that check it turn the portal on first.
 *
 * Restores in a `finally`, because leaving it on would silently re-arm every apply button for every
 * later test and for anyone using the local stack afterwards. Careers content already drifted once
 * this way: a track left flipped to "recruiting" through the CMS, which then reached a baseline.
 */
export async function withPortalConfigured<T>(
  request: APIRequestContext,
  portalUrl: string,
  body: () => Promise<T>,
): Promise<T> {
  const tokens = await adminTokens(request);
  const headers = authHeaders(tokens);

  const listed = await request.get(`${API_BASE}/admin/content/settings`, { headers });
  expect(listed.ok(), 'could not read site settings').toBeTruthy();
  const [settings] = (await listed.json()) as Array<{ id: string }>;

  const put = async (value: string | null): Promise<void> => {
    const latest = await request.get(`${API_BASE}/admin/content/settings/${settings.id}`, { headers });
    const doc = (await latest.json()) as { document: Record<string, unknown>; version: number };
    const response = await request.put(`${API_BASE}/admin/content/settings/${settings.id}`, {
      headers,
      data: { ...doc.document, professionalPortalUrl: value, version: doc.version },
    });
    expect(response.ok(), `could not set professionalPortalUrl=${value}`).toBeTruthy();
    await request.post(`${API_BASE}/admin/content/settings/${settings.id}/publish`, { headers });
  };

  const before = await request.get(`${API_BASE}/admin/content/settings/${settings.id}`, { headers });
  const original = ((await before.json()) as { document: Record<string, unknown> }).document[
    'professionalPortalUrl'
  ] as string | null | undefined;

  await put(portalUrl);
  try {
    return await body();
  } finally {
    await put(original ?? null);
  }
}
