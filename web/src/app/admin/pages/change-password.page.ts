import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { AdminAuthService } from '../core/admin-auth.service';

/** The forced password-change screen (task 83): a gated bootstrap login lands here and cannot
 * reach any other admin screen until this succeeds — the backend enforces it with 403s too. */
@Component({
  selector: 'abc-admin-change-password',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  template: `
    <main class="min-h-screen flex items-center justify-center bg-brand-cream/40 p-6">
      <form [formGroup]="form" (ngSubmit)="submit()" class="bg-brand-surface rounded-card shadow-card p-8 w-full max-w-sm grid gap-4">
        <h1 class="text-xl font-semibold text-brand-navy">Change your password</h1>
        <p class="text-sm text-brand-muted">
          The bootstrap password must be changed before anything else. You will sign in again with
          the new one.
        </p>
        <mat-form-field appearance="outline">
          <mat-label>Current password</mat-label>
          <input matInput type="password" formControlName="currentPassword" required autocomplete="current-password" data-testid="current-password" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>New password (min 12 characters)</mat-label>
          <input matInput type="password" formControlName="newPassword" required autocomplete="new-password" data-testid="new-password" />
          @if (form.controls.newPassword.hasError('minlength')) {
            <mat-error role="alert">At least 12 characters.</mat-error>
          }
        </mat-form-field>
        @if (error()) {
          <p class="text-sm text-red-700" role="alert">Password change failed — check the current password.</p>
        }
        <button mat-flat-button color="primary" type="submit" [disabled]="busy()" data-testid="change-password-submit">
          Change password
        </button>
      </form>
    </main>
  `,
})
export class ChangePasswordPage {
  private readonly auth = inject(AdminAuthService);
  private readonly formBuilder = inject(NonNullableFormBuilder);

  protected readonly form = this.formBuilder.group({
    currentPassword: ['', Validators.required],
    newPassword: ['', [Validators.required, Validators.minLength(12)]],
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
      const { currentPassword, newPassword } = this.form.getRawValue();
      await this.auth.changePassword(currentPassword, newPassword);
    } catch {
      this.error.set(true);
    } finally {
      this.busy.set(false);
    }
  }
}
