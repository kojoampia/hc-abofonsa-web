/** Typed mirror of the flat, locale-resolved payloads the API serves (backend service/dto/*DTO).
 * No LocalizedText crosses this boundary — resolution happened server-side (spec §7.4). */

export interface MediaRef {
  id: string;
  url: string;
  alt: string;
  width: number;
  height: number;
  blurHash: string;
}

export interface SectionItem {
  key: string;
  icon: string;
  title: string;
  body: string;
}

export interface Section {
  eyebrow: string;
  heading: string;
  subheading: string;
  body: string;
  items: SectionItem[];
  image: MediaRef | null;
}

export interface CareService {
  id: string;
  slug: string;
  name: string;
  blurb: string;
  points: string[];
  availableOn: string;
  image: MediaRef | null;
  displayOrder: number;
}

export interface PlanFeature {
  label: string;
  included: boolean;
  emphasised: boolean;
}

export interface PlanComparison {
  visitsPerWeek: string;
  medicalSupport: string;
  auxiliary: string;
  telemetry: string;
  reporting: string;
  careManager: string;
}

export interface Plan {
  id: string;
  code: string;
  name: string;
  forWho: string;
  priceAmount: string;
  priceCurrency: string;
  priceNote: string;
  featured: boolean;
  features: PlanFeature[];
  comparison: PlanComparison;
  displayOrder: number;
}

export interface Testimonial {
  id: string;
  quote: string;
  personName: string;
  personRole: string;
  planLabel: string;
  rating: number;
  portrait: MediaRef | null;
  displayOrder: number;
}

export interface Faq {
  id: string;
  question: string;
  answer: string;
  displayOrder: number;
}

export interface Address {
  street: string;
  district: string;
  city: string;
  country: string;
}

export interface SiteSettings {
  organisationName: string;
  tagline: string;
  phones: string[];
  whatsapp: string;
  email: string;
  address: Address;
  coordinationHours: string;
  onCallHours: string;
}

export interface SiteContent {
  locale: string;
  generatedAt: string;
  siteSettings: SiteSettings;
  sections: Record<string, Section>;
  services: CareService[];
  plans: Plan[];
  testimonials: Testimonial[];
  faqs: Faq[];
}

export interface EnquiryRequest {
  name: string;
  phone: string;
  email?: string;
  planOfInterest?: string;
  relationship?: string;
  message?: string;
  locale: string;
  sourcePage: string;
  consent: boolean;
  /** Honeypot — must stay empty; the real form hides it (spec §7.7). */
  company?: string;
  /** Time the form was on screen before submit; the API rejects bot-fast submissions. */
  dwellMs: number;
}

export interface EnquiryReceipt {
  reference: string;
  receivedAt: string;
}
