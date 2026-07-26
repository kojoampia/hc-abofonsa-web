import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { AdminAuthService } from '../core/admin-auth.service';

/** Spec §9.2 /admin/login — credentials for a JWT; noindex, and the only login on the system
 * (R8: the public site has none). */
@Component({
  selector: 'abc-admin-login',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  template: `
    <main class="min-h-screen flex items-center justify-center bg-brand-cream/40 p-6">
      <form [formGroup]="form" (ngSubmit)="submit()" class="bg-brand-surface rounded-card shadow-card p-8 w-full max-w-sm grid gap-4">
        <h1 class="text-xl font-semibold text-brand-navy">Abofonsa CMS</h1>
        <mat-form-field appearance="outline">
          <mat-label>Username</mat-label>
          <input matInput formControlName="username" required autocomplete="username" data-testid="login-username" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Password</mat-label>
          <input matInput type="password" formControlName="password" required autocomplete="current-password" data-testid="login-password" />
        </mat-form-field>
        @if (error()) {
          <p class="text-sm text-red-700" role="alert" data-testid="login-error">Invalid credentials.</p>
        }
        <button mat-flat-button color="primary" type="submit" [disabled]="busy()" data-testid="login-submit">
          Sign in
        </button>
      </form>
    </main>
  `,
})
export class LoginPage {
  private readonly auth = inject(AdminAuthService);
  private readonly formBuilder = inject(NonNullableFormBuilder);

  protected readonly form = this.formBuilder.group({
    username: ['', Validators.required],
    password: ['', Validators.required],
  });
  protected readonly busy = signal(false);
  protected readonly error = signal(false);

  async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.busy.set(true);
    this.error.set(false);
    try {
      const { username, password } = this.form.getRawValue();
      await this.auth.login(username, password);
    } catch {
      this.error.set(true);
    } finally {
      this.busy.set(false);
    }
  }
}
