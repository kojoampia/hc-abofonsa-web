import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ContentApi } from './content.api';
import { AdminApi } from '../../admin/core/admin-api';
import { TokenStore } from '../auth/token-store';
import { authInterceptor } from '../auth/auth.interceptor';
import { withInterceptors } from '@angular/common/http';

describe('API clients hit the spec §7.4/§7.5 endpoints', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('ContentApi requests the aggregate site payload with the locale param', () => {
    TestBed.inject(ContentApi).siteContent('fr').subscribe();
    const request = http.expectOne((req) => req.url === '/api/v1/content/site');
    expect(request.request.params.get('locale')).toBe('fr');
    request.flush({});
  });

  it('ContentApi posts enquiries to the public endpoint', () => {
    TestBed.inject(ContentApi)
      .submitEnquiry({ name: 'A', phone: '+233 1', locale: 'en', sourcePage: '/', consent: true, dwellMs: 5000 })
      .subscribe();
    const request = http.expectOne('/api/v1/enquiries');
    expect(request.request.method).toBe('POST');
    expect(request.request.body.consent).toBe(true);
    request.flush({ reference: 'ENQ-2026-000001', receivedAt: '' });
  });

  describe('AdminApi', () => {
    let api: AdminApi;

    beforeEach(() => {
      api = TestBed.inject(AdminApi);
      TestBed.inject(TokenStore).store({ accessToken: 'tok', refreshToken: 'r', mustChangePassword: false });
    });

    const expectCall = (method: string, url: string) => {
      const request = http.expectOne(url);
      expect(request.request.method).toBe(method);
      return request;
    };

    it('auth endpoints', () => {
      api.login('admin', 'pw').subscribe();
      expectCall('POST', '/api/v1/admin/auth/login').flush({});
      api.logout('r').subscribe();
      expectCall('POST', '/api/v1/admin/auth/logout').flush(null);
      api.changePassword('a', 'b').subscribe();
      expectCall('POST', '/api/v1/admin/account/change-password').flush(null);
    });

    it('content lifecycle endpoints', () => {
      api.listContent('services').subscribe();
      expectCall('GET', '/api/v1/admin/content/services').flush([]);
      api.getContent('faqs', 'id1').subscribe();
      expectCall('GET', '/api/v1/admin/content/faqs/id1').flush({});
      api.createContent('faqs', { a: 1 }).subscribe();
      expectCall('POST', '/api/v1/admin/content/faqs').flush({});
      api.publish('faqs', 'id1').subscribe();
      expectCall('POST', '/api/v1/admin/content/faqs/id1/publish').flush(null);
      api.unpublish('faqs', 'id1').subscribe();
      expectCall('POST', '/api/v1/admin/content/faqs/id1/unpublish').flush(null);
      api.archive('faqs', 'id1').subscribe();
      expectCall('DELETE', '/api/v1/admin/content/faqs/id1').flush(null);
      api.reorder('faqs', ['b', 'a']).subscribe();
      expectCall('POST', '/api/v1/admin/content/faqs/reorder').flush(null);
      api.revisions('faqs', 'id1').subscribe();
      expectCall('GET', '/api/v1/admin/content/faqs/id1/revisions').flush([]);
      api.restore('faqs', 'id1', 3).subscribe();
      expectCall('POST', '/api/v1/admin/content/faqs/id1/revisions/3/restore').flush(null);
    });

    it('update merges the optimistic-lock version into the body', () => {
      api.updateContent('faqs', 'id1', { question: { en: 'Q' } }, 4).subscribe();
      const request = expectCall('PUT', '/api/v1/admin/content/faqs/id1');
      expect(request.request.body.version).toBe(4);
      request.flush({});
    });

    it('i18n, enquiry, media and audit endpoints', () => {
      api.i18nOverrides('es').subscribe();
      expectCall('GET', '/api/v1/admin/i18n/es').flush({});
      api.putI18nOverrides('es', { k: 'v' }).subscribe();
      expectCall('PUT', '/api/v1/admin/i18n/es').flush({});
      api.deleteI18nOverride('es', 'nav.faq').subscribe();
      expectCall('DELETE', '/api/v1/admin/i18n/es/nav.faq').flush({});
      api.i18nCoverage().subscribe();
      expectCall('GET', '/api/v1/admin/i18n/coverage').flush([]);
      api.updateEnquiry('e1', { status: 'CLOSED' }).subscribe();
      expectCall('PATCH', '/api/v1/admin/enquiries/e1').flush({});
      api.deleteEnquiry('e1').subscribe();
      expectCall('DELETE', '/api/v1/admin/enquiries/e1').flush(null);
      api.deleteMedia('m1').subscribe();
      expectCall('DELETE', '/api/v1/admin/media/m1').flush(null);
      api.audit().subscribe();
      expectCall('GET', '/api/v1/admin/audit').flush([]);
    });

    it('enquiries passes the status filter only when set', () => {
      api.enquiries('NEW').subscribe();
      expect(http.expectOne((r) => r.url.includes('/admin/enquiries')).request.params.get('status')).toBe('NEW');
      http.verify();
      api.enquiries().subscribe();
      expect(http.expectOne((r) => r.url.includes('/admin/enquiries')).request.params.has('status')).toBe(false);
    });

    it('media upload sends multipart form data', () => {
      api.uploadMedia(new File(['x'], 'hero.jpg', { type: 'image/jpeg' })).subscribe();
      const request = http.expectOne('/api/v1/admin/media');
      expect(request.request.body instanceof FormData).toBe(true);
      request.flush({});
    });

    it('the auth interceptor attaches the bearer token to admin calls but not public ones', () => {
      api.audit().subscribe();
      expect(http.expectOne('/api/v1/admin/audit').request.headers.get('Authorization')).toBe('Bearer tok');

      TestBed.inject(ContentApi).siteContent('en').subscribe();
      const publicRequest = http.expectOne((r) => r.url === '/api/v1/content/site');
      expect(publicRequest.request.headers.has('Authorization')).toBe(false);
      publicRequest.flush({});
    });
  });
});
