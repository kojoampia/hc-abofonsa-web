import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../core/api/api-base-url';

/** Content types as the API paths them (spec §7.5 {type}). */
export type AdminContentType = 'services' | 'plans' | 'testimonials' | 'faqs' | 'sections' | 'settings';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  mustChangePassword: boolean;
}

export interface ContentAdminEntry {
  id: string;
  type: string;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  version: number;
  completeness: Record<string, number>;
  document: Record<string, unknown>;
}

export interface ContentRevisionEntry {
  revisionNumber: number;
  status: string;
  changeSummary: string;
  createdAt: string;
  createdBy: string;
  snapshot: Record<string, unknown>;
}

export interface I18nOverridesView {
  locale: string;
  defaults: Record<string, string>;
  overrides: Record<string, string>;
}

export interface I18nCoverageEntry {
  locale: string;
  totalUiKeys: number;
  missingUiKeys: string[];
  overriddenUiKeys: number;
  contentCompleteness: number;
}

export interface EnquiryEntry {
  id: string;
  reference: string;
  name: string;
  phone: string;
  email: string | null;
  planOfInterest: string | null;
  relationship: string | null;
  message: string | null;
  locale: string | null;
  sourcePage: string | null;
  status: 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'CLOSED';
  assignedTo: string | null;
  notes: { at: string; by: string; text: string }[];
  createdAt: string;
}

export interface MediaEntry {
  id: string;
  filename: string;
  contentType: string;
  bytes: number;
  width: number;
  height: number;
  blurHash: string;
  url: string;
  variants: { label: string; width: number; url: string; bytes: number }[];
  alt: Record<string, string>;
  referencedBy: { entityType: string; entityId: string }[];
  createdAt: string;
}

export interface AuditEntry {
  id: string;
  at: string;
  actorId: string;
  actorName: string;
  action: string;
  entityType: string | null;
  entityId: string | null;
  detail: Record<string, unknown> | null;
}

/** Typed client for the whole admin API surface (spec §7.5). */
@Injectable({ providedIn: 'root' })
export class AdminApi {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL);

  login(username: string, password: string): Observable<AuthTokens> {
    return this.http.post<AuthTokens>(`${this.base}/admin/auth/login`, { username, password });
  }

  logout(refreshToken: string): Observable<void> {
    return this.http.post<void>(`${this.base}/admin/auth/logout`, { refreshToken });
  }

  changePassword(currentPassword: string, newPassword: string): Observable<void> {
    return this.http.post<void>(`${this.base}/admin/account/change-password`, { currentPassword, newPassword });
  }

  listContent(type: AdminContentType): Observable<ContentAdminEntry[]> {
    return this.http.get<ContentAdminEntry[]>(`${this.base}/admin/content/${type}`);
  }

  getContent(type: AdminContentType, id: string): Observable<ContentAdminEntry> {
    return this.http.get<ContentAdminEntry>(`${this.base}/admin/content/${type}/${id}`);
  }

  createContent(type: AdminContentType, document: Record<string, unknown>): Observable<ContentAdminEntry> {
    return this.http.post<ContentAdminEntry>(`${this.base}/admin/content/${type}`, document);
  }

  updateContent(
    type: AdminContentType,
    id: string,
    document: Record<string, unknown>,
    version: number,
  ): Observable<ContentAdminEntry> {
    return this.http.put<ContentAdminEntry>(`${this.base}/admin/content/${type}/${id}`, { ...document, version });
  }

  publish(type: AdminContentType, id: string): Observable<void> {
    return this.http.post<void>(`${this.base}/admin/content/${type}/${id}/publish`, {});
  }

  unpublish(type: AdminContentType, id: string): Observable<void> {
    return this.http.post<void>(`${this.base}/admin/content/${type}/${id}/unpublish`, {});
  }

  archive(type: AdminContentType, id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/admin/content/${type}/${id}`);
  }

  reorder(type: AdminContentType, orderedIds: string[]): Observable<void> {
    return this.http.post<void>(`${this.base}/admin/content/${type}/reorder`, orderedIds);
  }

  revisions(type: AdminContentType, id: string): Observable<ContentRevisionEntry[]> {
    return this.http.get<ContentRevisionEntry[]>(`${this.base}/admin/content/${type}/${id}/revisions`);
  }

  restore(type: AdminContentType, id: string, revisionNumber: number): Observable<void> {
    return this.http.post<void>(`${this.base}/admin/content/${type}/${id}/revisions/${revisionNumber}/restore`, {});
  }

  i18nOverrides(locale: string): Observable<I18nOverridesView> {
    return this.http.get<I18nOverridesView>(`${this.base}/admin/i18n/${locale}`);
  }

  putI18nOverrides(locale: string, entries: Record<string, string>): Observable<I18nOverridesView> {
    return this.http.put<I18nOverridesView>(`${this.base}/admin/i18n/${locale}`, entries);
  }

  deleteI18nOverride(locale: string, key: string): Observable<I18nOverridesView> {
    return this.http.delete<I18nOverridesView>(`${this.base}/admin/i18n/${locale}/${key}`);
  }

  i18nCoverage(): Observable<I18nCoverageEntry[]> {
    return this.http.get<I18nCoverageEntry[]>(`${this.base}/admin/i18n/coverage`);
  }

  enquiries(status?: string): Observable<EnquiryEntry[]> {
    return this.http.get<EnquiryEntry[]>(`${this.base}/admin/enquiries`, {
      params: status ? { status } : {},
    });
  }

  updateEnquiry(id: string, patch: { status?: string; note?: string; assignedTo?: string }): Observable<EnquiryEntry> {
    return this.http.patch<EnquiryEntry>(`${this.base}/admin/enquiries/${id}`, patch);
  }

  deleteEnquiry(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/admin/enquiries/${id}`);
  }

  media(orphans = false): Observable<MediaEntry[]> {
    return this.http.get<MediaEntry[]>(`${this.base}/admin/media`, { params: { orphans } });
  }

  uploadMedia(file: File): Observable<MediaEntry> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<MediaEntry>(`${this.base}/admin/media`, form);
  }

  deleteMedia(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/admin/media/${id}`);
  }

  audit(): Observable<AuditEntry[]> {
    return this.http.get<AuditEntry[]>(`${this.base}/admin/audit`);
  }
}
