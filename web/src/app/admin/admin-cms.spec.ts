import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { AdminApi } from './core/admin-api';
import { AdminAuthService } from './core/admin-auth.service';
import { adminRoleGuard, unsavedChangesGuard } from './core/admin-guards';
import { TokenStore } from '../core/auth/token-store';
import { AdminApiStub, enquiryEntry, mediaEntry, problem } from './testing/admin-api.stub';
import { MediaPage } from './pages/media.page';
import { EnquiriesPage } from './pages/enquiries.page';

/** Builds a JWT-shaped token whose `auth` claim carries the given roles. */
function tokenWithRoles(...roles: string[]): string {
  const payload = btoa(JSON.stringify({ auth: roles.map((role) => `ROLE_${role}`).join(' ') }));
  return `header.${payload}.signature`;
}

describe('Admin CMS — media, enquiries and role guards (plan tasks 88-90)', () => {
  describe('MediaPage', () => {
    let stub: AdminApiStub;

    async function render(options: ConstructorParameters<typeof AdminApiStub>[0] = {}) {
      stub = new AdminApiStub({ media: [mediaEntry()], ...options });
      await TestBed.configureTestingModule({
        imports: [MediaPage],
        providers: [provideZonelessChangeDetection(), provideNoopAnimations(), { provide: AdminApi, useValue: stub }],
      }).compileComponents();
      const fixture = TestBed.createComponent(MediaPage);
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
      return fixture;
    }

    it('lists assets with their usage state', async () => {
      const fixture = await render({
        media: [mediaEntry({ id: 'used', referencedBy: [{ entityType: 'SERVICE', entityId: 'svc-1' }] })],
      });
      expect(fixture.nativeElement.textContent).toContain('used ×1');
    });

    it('task 88: refusing to delete a referenced asset lists the referencing entities, not a generic failure', async () => {
      const fixture = await render({
        onDeleteMedia: () =>
          problem(409, {
            title: 'Conflict',
            detail: 'Media is referenced by content and cannot be deleted',
            referencedBy: [
              { entityType: 'SERVICE', entityId: 'svc-1' },
              { entityType: 'SECTION', entityId: 'sec-hero' },
            ],
          }),
      });

      await (fixture.componentInstance as unknown as { remove: (id: string) => Promise<void> }).remove('media-1');
      fixture.detectChanges();

      const panel = fixture.nativeElement.querySelector('[data-testid="delete-problem"]') as HTMLElement;
      expect(panel.textContent).toContain('referenced by content');
      const references = fixture.nativeElement.querySelector('[data-testid="referencing-entities"]') as HTMLElement;
      expect(references.textContent).toContain('SERVICE');
      expect(references.textContent).toContain('svc-1');
      expect(references.textContent).toContain('sec-hero');
    });

    it('the orphans filter asks the API for orphans only', async () => {
      const fixture = await render();
      (fixture.componentInstance as unknown as { orphansOnly: { set: (v: boolean) => void } }).orphansOnly.set(true);
      fixture.detectChanges();
      await fixture.whenStable();
      expect(stub.callsTo('media').some((call) => call.args[0] === true)).toBe(true);
    });
  });

  describe('EnquiriesPage', () => {
    let stub: AdminApiStub;

    async function render() {
      stub = new AdminApiStub({
        enquiries: [enquiryEntry(), enquiryEntry({ id: 'enq-2', reference: 'ENQ-2026-000043', status: 'CLOSED' })],
      });
      await TestBed.configureTestingModule({
        imports: [EnquiriesPage],
        providers: [provideZonelessChangeDetection(), provideNoopAnimations(), { provide: AdminApi, useValue: stub }],
      }).compileComponents();
      const fixture = TestBed.createComponent(EnquiriesPage);
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
      return fixture;
    }

    it('renders the inbox with the sensitive message visible to staff', async () => {
      const fixture = await render();
      expect(fixture.nativeElement.textContent).toContain('ENQ-2026-000042');
      expect(fixture.nativeElement.textContent).toContain('My mother needs daily support');
    });

    it('a status change persists through the API', async () => {
      const fixture = await render();
      await (
        fixture.componentInstance as unknown as {
          setStatus: (enquiry: { id: string }, status: string) => Promise<void>;
        }
      ).setStatus({ id: 'enq-1' }, 'CONTACTED');
      expect(stub.callsTo('updateEnquiry')[0].args).toEqual(['enq-1', { status: 'CONTACTED' }]);
    });

    it('an empty note is not sent', async () => {
      const fixture = await render();
      const input = { value: '   ' } as HTMLInputElement;
      await (
        fixture.componentInstance as unknown as {
          addNote: (enquiry: { id: string }, input: HTMLInputElement) => Promise<void>;
        }
      ).addNote({ id: 'enq-1' }, input);
      expect(stub.callsTo('updateEnquiry')).toHaveLength(0);
    });

    it('the status filter reaches the API', async () => {
      const fixture = await render();
      (fixture.componentInstance as unknown as { statusFilter: { set: (v: string) => void } }).statusFilter.set('NEW');
      fixture.detectChanges();
      await fixture.whenStable();
      expect(stub.callsTo('enquiries').some((call) => call.args[0] === 'NEW')).toBe(true);
    });
  });

  describe('route guards (task 90)', () => {
    function setup(roles: string[]) {
      TestBed.configureTestingModule({
        providers: [
          provideZonelessChangeDetection(),
          provideRouter([]),
          { provide: AdminApi, useValue: new AdminApiStub() },
        ],
      });
      const tokenStore = TestBed.inject(TokenStore);
      tokenStore.store({
        accessToken: tokenWithRoles(...roles),
        refreshToken: 'refresh',
        mustChangePassword: false,
      });
      return TestBed.inject(AdminAuthService);
    }

    it('decodes roles from the access token', () => {
      const auth = setup(['EDITOR']);
      expect(auth.roles()).toEqual(['ROLE_EDITOR']);
      expect(auth.hasRole('EDITOR')).toBe(true);
      expect(auth.hasRole('ADMIN')).toBe(false);
    });

    it('an ADMIN-only route is blocked by the guard for a non-ADMIN, not merely hidden from the nav', () => {
      setup(['PUBLISHER']);
      const guard = adminRoleGuard('ADMIN');
      const result = TestBed.runInInjectionContext(() => guard({} as never, {} as never));
      // Redirected away rather than allowed through.
      expect(result).not.toBe(true);
      expect(String(result)).toContain('/admin');
    });

    it('an ADMIN passes the same guard', () => {
      setup(['ADMIN']);
      const guard = adminRoleGuard('ADMIN');
      expect(TestBed.runInInjectionContext(() => guard({} as never, {} as never))).toBe(true);
    });

    it('E-4: the unsaved-changes guard blocks navigation only when the editor is dirty', () => {
      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
      const clean = { hasUnsavedChanges: () => false };
      expect(
        TestBed.runInInjectionContext(() =>
          unsavedChangesGuard(clean, {} as never, {} as never, {} as never),
        ),
      ).toBe(true);

      const dirty = { hasUnsavedChanges: () => true };
      vi.stubGlobal('confirm', vi.fn().mockReturnValue(false));
      expect(
        TestBed.runInInjectionContext(() =>
          unsavedChangesGuard(dirty, {} as never, {} as never, {} as never),
        ),
      ).toBe(false);
      expect(confirm).toHaveBeenCalled();
      vi.unstubAllGlobals();
    });
  });

  describe('AdminAuthService login routing', () => {
    function setupLogin(mustChangePassword: boolean) {
      const stub = new AdminApiStub({
        tokens: { accessToken: tokenWithRoles('ADMIN'), refreshToken: 'r', mustChangePassword },
      });
      TestBed.configureTestingModule({
        providers: [provideZonelessChangeDetection(), provideRouter([]), { provide: AdminApi, useValue: stub }],
      });
      const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
      return { auth: TestBed.inject(AdminAuthService), navigate };
    }

    it('a gated bootstrap login routes to the forced password-change screen', async () => {
      const { auth, navigate } = setupLogin(true);
      await auth.login('admin', 'bootstrap');
      expect(navigate).toHaveBeenCalledWith('/admin/change-password');
    });

    it('a normal login routes to the dashboard', async () => {
      const { auth, navigate } = setupLogin(false);
      await auth.login('editor', 'password');
      expect(navigate).toHaveBeenCalledWith('/admin');
      expect(auth.isAuthenticated()).toBe(true);
    });

    it('changing the password clears the session so the stale gated token cannot be reused', async () => {
      const { auth, navigate } = setupLogin(true);
      await auth.login('admin', 'bootstrap');
      await auth.changePassword('bootstrap', 'a-much-better-password');
      expect(auth.isAuthenticated()).toBe(false);
      expect(navigate).toHaveBeenLastCalledWith('/admin/login');
    });
  });
});
