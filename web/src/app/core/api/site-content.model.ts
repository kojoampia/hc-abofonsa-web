/** Typed mirror of the flat, locale-resolved payloads the API serves (backend service/dto/*DTO).
 * No LocalizedText crosses this boundary — resolution happened server-side (spec §7.4). */

export interface MediaVariantRef {
  label: string;
  width: number;
  url: string;
  contentType: string;
}

export interface MediaRef {
  id: string;
  url: string;
  alt: string;
  width: number;
  height: number;
  blurHash: string;
  variants: MediaVariantRef[];
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

export interface CareerTrack {
  id: string;
  slug: string;
  title: string;
  blurb: string;
  requirements: string[];
  documents: string[];
  /** One of the six ROLE_* values professional.abofonsa.com authorizes against; carried in the
   * handoff link so the candidate is not asked to choose their role twice. */
  authorityRole: string;
  /** False for a track being recruited ahead of its rota — the card says so rather than implying
   * a vacancy that cannot be filled. */
  openings: boolean;
  displayOrder: number;
}

/** The careers page's payload — its own endpoint, so the home page neither downloads it nor
 * renders its FAQs. See CareersContentDTO on the API for why. */
export interface CareersContent {
  locale: string;
  /**
   * The language the prose actually came back in, which is not always `locale`: careers copy is
   * seeded English-only (careers-plan.md D-5), so a Spanish request resolves to English text. The
   * page marks that region `lang="en"` — English inside `<html lang="es">` is a WCAG 2.2 AA failure
   * under 3.1.2, and a screen reader reads it with the wrong pronunciation rules.
   */
  contentLanguage: string;
  generatedAt: string;
  sections: Record<string, Section>;
  tracks: CareerTrack[];
  faqs: Faq[];
}

export interface SiteSettings {
  organisationName: string;
  tagline: string;
  phones: string[];
  whatsapp: string;
  email: string;
  address: Address;
  coordinationHours: string;
  /** Set to show "Request an invitation" on the careers page; absent hides it. Presence is the
   * switch, so it cannot be enabled without a destination (careers-plan.md D-1). */
  /**
   * Where the careers apply buttons point. Absent hides every one of them — the portal is not
   * deployed yet (careers-plan.md task 144), and availability is not a build-time fact.
   */
  professionalPortalUrl?: string | null;
  professionalInvitationUrl?: string | null;
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
