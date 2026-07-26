import { HttpErrorResponse } from '@angular/common/http';

export interface ProblemInfo {
  status: number;
  title: string;
  explanation: string;
  fields: string[];
  currentVersion: number | null;
  current: Record<string, unknown> | null;
  /** The whole problem body, for endpoint-specific extras (e.g. media's referencedBy). */
  raw: Record<string, unknown>;
}

/** Extracts the RFC 9457 problem body the API sends so screens can show the SPECIFIC explanation
 * (E-6/E-9/E-10 - "publishing is blocked, with a clear explanation", task 86). */
export function problemDetailOf(error: unknown): ProblemInfo {
  const fallback: ProblemInfo = {
    status: 0,
    title: 'Request failed',
    explanation: 'The request failed. Please try again.',
    fields: [],
    currentVersion: null,
    current: null,
    raw: {},
  };
  if (!(error instanceof HttpErrorResponse)) {
    return fallback;
  }
  const body = (error.error ?? {}) as Record<string, unknown>;
  const title = String(body['title'] ?? fallback.title);
  const detail = body['detail'] ? String(body['detail']) : '';
  const fields = Array.isArray(body['fields']) ? (body['fields'] as string[]) : [];
  let explanation = detail || title;
  if (fields.length > 0) {
    explanation = `${title}: ${fields.join(', ')}`;
  }
  return {
    status: error.status,
    title,
    explanation,
    fields,
    currentVersion: typeof body['currentVersion'] === 'number' ? (body['currentVersion'] as number) : null,
    current: (body['current'] as Record<string, unknown>) ?? null,
    raw: body,
  };
}
