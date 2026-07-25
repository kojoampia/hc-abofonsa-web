import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { TokenStore } from './token-store';

/** Attaches the admin bearer token to admin API calls only — public requests carry nothing. */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(TokenStore).accessToken();
  if (token && req.url.includes('/api/v1/admin/')) {
    return next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
  }
  return next(req);
};
