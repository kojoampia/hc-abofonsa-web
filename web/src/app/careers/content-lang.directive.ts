import { Directive, inject } from '@angular/core';
import { CareersContentStore } from './careers-content.store';

/**
 * Marks an element whose text comes from the careers CMS payload with the language that payload was
 * actually served in — and only when that differs from the page's own language.
 *
 * ## Why this exists
 *
 * Careers copy is seeded English-only on purpose (careers-plan.md D-5): the four locales exist
 * because *families* are in the diaspora, whereas applicants are in Ghana. So `/es/careers` renders
 * `<html lang="es">` around English prose. WCAG 2.2 AA 3.1.2 (Language of Parts) requires the
 * language of any such passage to be marked, and the reason is not pedantic — a screen reader
 * switches voice and pronunciation rules on `lang`, so unmarked English read as Spanish comes out
 * as noise. Nothing detects this automatically: axe-core checks that `lang` is *present and valid*,
 * never that it matches the words.
 *
 * ## Why per element rather than one wrapper
 *
 * The page interleaves the two at leaf level. In a track card the heading "What we look for" is
 * translated UI chrome while the requirements beneath it are English CMS text, inside the same
 * `<article>`. A `lang` on any convenient ancestor would fix the English and break the Spanish, so
 * it goes on the smallest element that holds only payload text.
 *
 * ## Why it is not simply `lang="en"`
 *
 * The store returns null once the served language matches the page, so translating the content in
 * the CMS removes these attributes by itself. Hardcoding `en` would leave Spanish copy labelled
 * English the day someone translates it — the same defect pointing the other way, and with nothing
 * left to prompt anyone to undo it.
 */
@Directive({
  selector: '[abcContentLang]',
  host: { '[attr.lang]': 'store.contentLang()' },
})
export class ContentLang {
  protected readonly store = inject(CareersContentStore);
}
