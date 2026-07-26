import { Injectable, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { TokenStore } from '../../core/auth/token-store';
import { AdminApi } from './admin-api';

/** CMS session orchestration: login routes to the dashboard — or straight to the forced
 * password-change screen when the token is gated (spec §8.2 mustChangePassword, task 83). */
@Injectable({ providedIn: 'root' })
export class AdminAuthService {
  private readonly api = inject(AdminApi);
  private readonly tokenStore = inject(TokenStore);
  private readonly router = inject(Router);

  readonly isAuthenticated = this.tokenStore.isAuthenticated;
  readonly mustChangePassword = this.tokenStore.mustChangePassword;

  /** Roles decoded from the access token's `auth` claim (hc-admin-gw convention). */
  readonly roles = computed<string[]>(() => {
    const token = this.tokenStore.accessToken();
    if (!token) {
      return [];
    }
    try {
      const payload = JSON.parse(atob(token.split('.')[1] ?? '')) as { auth?: string };
      return (payload.auth ?? '').split(' ').filter(Boolean);
    } catch {
      return [];
    }
  });

  hasRole(role: string): boolean {
    return this.roles().includes(`ROLE_${role}`);
  }

  async login(username: string, password: string): Promise<void> {
    const tokens = await firstValueFrom(this.api.login(username, password));
    this.tokenStore.store(tokens);
    await this.router.navigateByUrl(tokens.mustChangePassword ? '/admin/change-password' : '/admin');
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await firstValueFrom(this.api.changePassword(currentPassword, newPassword));
    // The gated token is now stale (its pwdChange claim persists) - require a fresh login.
    this.tokenStore.clear();
    await this.router.navigateByUrl('/admin/login');
  }

  async logout(): Promise<void> {
    const refreshToken = this.tokenStore.refreshToken();
    if (refreshToken) {
      try {
        await firstValueFrom(this.api.logout(refreshToken));
      } catch {
        /* revocation is best-effort; the local session clears regardless */
      }
    }
    this.tokenStore.clear();
    await this.router.navigateByUrl('/admin/login');
  }
}
