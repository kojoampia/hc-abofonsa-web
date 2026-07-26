import { HttpErrorResponse } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import {
  AdminApi,
  AdminContentType,
  AuthTokens,
  ContentAdminEntry,
  ContentRevisionEntry,
  EnquiryEntry,
  I18nCoverageEntry,
  I18nOverridesView,
  MediaEntry,
} from '../core/admin-api';

export function problem(status: number, body: Record<string, unknown>): Observable<never> {
  return throwError(() => new HttpErrorResponse({ status, error: body }));
}

export function contentEntry(partial: Partial<ContentAdminEntry> = {}): ContentAdminEntry {
  return {
    id: 'entry-1',
    type: 'SERVICE',
    status: 'DRAFT',
    version: 0,
    completeness: { en: 1, es: 1, fr: 0.5, de: 0 },
    document: {
      _id: 'entry-1',
      slug: 'elderly-companion-care',
      name: { en: 'Elderly & companion care', es: 'Atención a mayores' },
      blurb: { en: 'Day-to-day support.', es: 'Apoyo diario.' },
      points: [{ en: 'Washing and dressing', es: 'Aseo y vestimenta' }],
      availableOn: { en: 'All plans' },
      displayOrder: 1,
      updatedAt: new Date().toISOString(),
    },
    ...partial,
  };
}

export interface AdminApiStubOptions {
  entry?: ContentAdminEntry;
  onUpdate?: () => Observable<ContentAdminEntry>;
  onPublish?: () => Observable<void>;
  onDeleteMedia?: () => Observable<void>;
  overrides?: Partial<Record<string, I18nOverridesView>>;
  enquiries?: EnquiryEntry[];
  media?: MediaEntry[];
  revisions?: ContentRevisionEntry[];
  tokens?: AuthTokens;
}

/** A hand-rolled AdminApi double — records calls so tests can assert what the CMS actually
 * sent, not just what it rendered. */
export class AdminApiStub implements Partial<AdminApi> {
  readonly calls: { method: string; args: unknown[] }[] = [];

  constructor(private readonly options: AdminApiStubOptions = {}) {}

  private record(method: string, ...args: unknown[]): void {
    this.calls.push({ method, args });
  }

  callsTo(method: string) {
    return this.calls.filter((call) => call.method === method);
  }

  login = (username: string, password: string): Observable<AuthTokens> => {
    this.record('login', username, password);
    return of(
      this.options.tokens ?? { accessToken: 'header.e30.sig', refreshToken: 'refresh', mustChangePassword: false },
    );
  };

  logout = (refreshToken: string): Observable<void> => {
    this.record('logout', refreshToken);
    return of(undefined);
  };

  changePassword = (currentPassword: string, newPassword: string): Observable<void> => {
    this.record('changePassword', currentPassword, newPassword);
    return of(undefined);
  };

  listContent = (type: AdminContentType): Observable<ContentAdminEntry[]> => {
    this.record('listContent', type);
    return of([this.options.entry ?? contentEntry()]);
  };

  getContent = (type: AdminContentType, id: string): Observable<ContentAdminEntry> => {
    this.record('getContent', type, id);
    return of(this.options.entry ?? contentEntry());
  };

  createContent = (type: AdminContentType, document: Record<string, unknown>): Observable<ContentAdminEntry> => {
    this.record('createContent', type, document);
    return of(contentEntry({ id: 'created-1', document }));
  };

  updateContent = (
    type: AdminContentType,
    id: string,
    document: Record<string, unknown>,
    version: number,
  ): Observable<ContentAdminEntry> => {
    this.record('updateContent', type, id, document, version);
    return this.options.onUpdate?.() ?? of(contentEntry({ id, document, version: version + 1 }));
  };

  publish = (type: AdminContentType, id: string): Observable<void> => {
    this.record('publish', type, id);
    return this.options.onPublish?.() ?? of(undefined);
  };

  unpublish = (type: AdminContentType, id: string): Observable<void> => {
    this.record('unpublish', type, id);
    return of(undefined);
  };

  archive = (type: AdminContentType, id: string): Observable<void> => {
    this.record('archive', type, id);
    return of(undefined);
  };

  reorder = (type: AdminContentType, orderedIds: string[]): Observable<void> => {
    this.record('reorder', type, orderedIds);
    return of(undefined);
  };

  revisions = (type: AdminContentType, id: string): Observable<ContentRevisionEntry[]> => {
    this.record('revisions', type, id);
    return of(this.options.revisions ?? []);
  };

  restore = (type: AdminContentType, id: string, revisionNumber: number): Observable<void> => {
    this.record('restore', type, id, revisionNumber);
    return of(undefined);
  };

  i18nOverrides = (locale: string): Observable<I18nOverridesView> => {
    this.record('i18nOverrides', locale);
    return of(
      this.options.overrides?.[locale] ?? {
        locale,
        defaults: { 'nav.pricing': 'Plans and pricing', 'nav.faq': 'FAQ' },
        overrides: {},
      },
    );
  };

  putI18nOverrides = (locale: string, entries: Record<string, string>): Observable<I18nOverridesView> => {
    this.record('putI18nOverrides', locale, entries);
    return of({ locale, defaults: {}, overrides: entries });
  };

  deleteI18nOverride = (locale: string, key: string): Observable<I18nOverridesView> => {
    this.record('deleteI18nOverride', locale, key);
    return of({ locale, defaults: {}, overrides: {} });
  };

  i18nCoverage = (): Observable<I18nCoverageEntry[]> => {
    this.record('i18nCoverage');
    return of([
      { locale: 'en', totalUiKeys: 2, missingUiKeys: [], overriddenUiKeys: 0, contentCompleteness: 1 },
      { locale: 'fr', totalUiKeys: 2, missingUiKeys: ['nav.faq'], overriddenUiKeys: 0, contentCompleteness: 0.5 },
    ]);
  };

  enquiries = (status?: string): Observable<EnquiryEntry[]> => {
    this.record('enquiries', status);
    const all = this.options.enquiries ?? [];
    return of(status ? all.filter((enquiry) => enquiry.status === status) : all);
  };

  updateEnquiry = (id: string, patch: Record<string, unknown>): Observable<EnquiryEntry> => {
    this.record('updateEnquiry', id, patch);
    return of((this.options.enquiries ?? [])[0]);
  };

  deleteEnquiry = (id: string): Observable<void> => {
    this.record('deleteEnquiry', id);
    return of(undefined);
  };

  media = (orphans = false): Observable<MediaEntry[]> => {
    this.record('media', orphans);
    const all = this.options.media ?? [];
    return of(orphans ? all.filter((asset) => asset.referencedBy.length === 0) : all);
  };

  uploadMedia = (file: File): Observable<MediaEntry> => {
    this.record('uploadMedia', file.name);
    return of(mediaEntry());
  };

  deleteMedia = (id: string): Observable<void> => {
    this.record('deleteMedia', id);
    return this.options.onDeleteMedia?.() ?? of(undefined);
  };

  audit = () => {
    this.record('audit');
    return of([]);
  };
}

export function mediaEntry(partial: Partial<MediaEntry> = {}): MediaEntry {
  return {
    id: 'media-1',
    filename: 'hero.jpg',
    contentType: 'image/jpeg',
    bytes: 148221,
    width: 1180,
    height: 760,
    blurHash: 'LEHV6nWB2yk8pyo0adR*.7kCMdnj',
    url: '/media/2026/07/hero.jpg',
    variants: [],
    alt: { en: 'A nurse reviewing a care plan' },
    referencedBy: [],
    createdAt: new Date().toISOString(),
    ...partial,
  };
}

export function enquiryEntry(partial: Partial<EnquiryEntry> = {}): EnquiryEntry {
  return {
    id: 'enq-1',
    reference: 'ENQ-2026-000042',
    name: 'Kwame Asare',
    phone: '+233 24 000 0000',
    email: 'kwame@example.com',
    planOfInterest: 'PAWPAW',
    relationship: 'parent',
    message: 'My mother needs daily support',
    locale: 'en',
    sourcePage: '/#pricing',
    status: 'NEW',
    assignedTo: null,
    notes: [],
    createdAt: new Date().toISOString(),
    ...partial,
  };
}
