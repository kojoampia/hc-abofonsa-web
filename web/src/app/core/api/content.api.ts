import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from './api-base-url';
import { CareersContent, EnquiryReceipt, EnquiryRequest, SiteContent } from './site-content.model';
import { Locale } from '../i18n/locales';

/** Typed HTTP client for the public content API (spec §5.5). */
@Injectable({ providedIn: 'root' })
export class ContentApi {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL);

  siteContent(locale: Locale): Observable<SiteContent> {
    return this.http.get<SiteContent>(`${this.base}/content/site`, { params: { locale } });
  }

  careersContent(locale: Locale): Observable<CareersContent> {
    return this.http.get<CareersContent>(`${this.base}/content/careers`, { params: { locale } });
  }

  submitEnquiry(body: EnquiryRequest): Observable<EnquiryReceipt> {
    return this.http.post<EnquiryReceipt>(`${this.base}/enquiries`, body);
  }
}
