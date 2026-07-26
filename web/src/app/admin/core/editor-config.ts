import { AdminContentType } from './admin-api';

export type FieldKind =
  | 'text'
  | 'number'
  | 'boolean'
  | 'select'
  | 'localized'
  | 'localized-area'
  | 'string-list'
  | 'localized-list'
  | 'section-items'
  | 'plan-features';

export interface FieldDef {
  /** Document key, or a dot path for nested values (price.amount, consent.obtained). */
  key: string;
  label: string;
  kind: FieldKind;
  /** E-3: English mandatory before saving; other locales may stay incomplete. */
  requiredEn?: boolean;
  options?: string[];
  readonly?: boolean;
}

/** One editor pattern, six content types (spec §9.3): the fields each type exposes. */
export const EDITOR_CONFIG: Record<AdminContentType, FieldDef[]> = {
  services: [
    { key: 'slug', label: 'Slug', kind: 'text' },
    { key: 'name', label: 'Name', kind: 'localized', requiredEn: true },
    { key: 'blurb', label: 'Blurb', kind: 'localized-area' },
    { key: 'points', label: 'Bullet points', kind: 'localized-list' },
    { key: 'availableOn', label: 'Available on', kind: 'localized' },
    { key: 'displayOrder', label: 'Display order', kind: 'number' },
  ],
  plans: [
    { key: 'code', label: 'Plan code', kind: 'text', readonly: true },
    { key: 'name', label: 'Name', kind: 'localized', requiredEn: true },
    { key: 'forWho', label: 'Who it is for', kind: 'localized-area' },
    { key: 'price.amount', label: 'Monthly price (GHS)', kind: 'number' },
    { key: 'priceNote', label: 'Price note', kind: 'localized' },
    { key: 'featured', label: 'Featured (exactly one plan)', kind: 'boolean' },
    { key: 'features', label: 'Features', kind: 'plan-features' },
  ],
  testimonials: [
    { key: 'personName', label: 'Person (not translated)', kind: 'text' },
    { key: 'quote', label: 'Quote', kind: 'localized-area', requiredEn: true },
    { key: 'personRole', label: 'Role line', kind: 'localized' },
    { key: 'planLabel', label: 'Plan badge', kind: 'localized' },
    { key: 'rating', label: 'Rating (1-5)', kind: 'number' },
    { key: 'consent.obtained', label: 'Consent recorded (required to publish)', kind: 'boolean' },
    { key: 'consent.evidenceRef', label: 'Consent evidence reference', kind: 'text' },
  ],
  faqs: [
    { key: 'question', label: 'Question', kind: 'localized', requiredEn: true },
    { key: 'answer', label: 'Answer', kind: 'localized-area', requiredEn: true },
    { key: 'category', label: 'Category', kind: 'select', options: ['COVERAGE', 'STAFF', 'PLANS', 'CLINICAL', 'BILLING'] },
    { key: 'displayOrder', label: 'Display order', kind: 'number' },
  ],
  sections: [
    { key: 'key', label: 'Section', kind: 'text', readonly: true },
    { key: 'eyebrow', label: 'Eyebrow', kind: 'localized' },
    { key: 'heading', label: 'Heading', kind: 'localized' },
    { key: 'subheading', label: 'Subheading', kind: 'localized' },
    { key: 'body', label: 'Body', kind: 'localized-area' },
    { key: 'items', label: 'Items', kind: 'section-items' },
  ],
  settings: [
    { key: 'organisationName', label: 'Organisation name', kind: 'text' },
    { key: 'tagline', label: 'Tagline', kind: 'localized' },
    { key: 'phones', label: 'Phone numbers', kind: 'string-list' },
    { key: 'whatsapp', label: 'WhatsApp', kind: 'text' },
    { key: 'email', label: 'Email', kind: 'text' },
    { key: 'website', label: 'Website', kind: 'text' },
    { key: 'address.street', label: 'Street', kind: 'text' },
    { key: 'address.district', label: 'District', kind: 'text' },
    { key: 'address.city', label: 'City', kind: 'text' },
    { key: 'address.country', label: 'Country', kind: 'text' },
    { key: 'coordinationHours', label: 'Coordination hours', kind: 'localized' },
    { key: 'onCallHours', label: 'On-call hours', kind: 'localized' },
  ],
};

export function deepGet(document: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], document);
}

export function deepSet(document: Record<string, unknown>, path: string, value: unknown): void {
  const parts = path.split('.');
  let node = document;
  for (const part of parts.slice(0, -1)) {
    node[part] = (node[part] as Record<string, unknown>) ?? {};
    node = node[part] as Record<string, unknown>;
  }
  node[parts[parts.length - 1]] = value;
}
