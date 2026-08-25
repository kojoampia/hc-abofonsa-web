import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';

/**
 * The privacy policy.
 *
 * <h2>Static, not CMS content, and that is the point</h2>
 *
 * <p>Every other public page draws its text from MongoDB through the content API. This one does
 * not. Two reasons, and both are about what happens on a bad day:</p>
 *
 * <ul>
 *   <li><strong>It has to render when the API does not.</strong> Google Play fetches this URL
 *   during app review, and a 500 here is a rejection of the app. A legal notice that is only
 *   available when a database is up is not published.</li>
 *   <li><strong>It states commitments the platform must keep.</strong> The fourteen-day deletion
 *   window below is enforced in code — `DeletionRequestService.WINDOW` in hc-patient-service — and
 *   shown to patients in three languages in both clients. Putting the text where an editor can
 *   change "14" without anyone touching the code is how the promise and the behaviour drift
 *   apart.</li>
 * </ul>
 *
 * <p><strong>Changing the window is a four-place change:</strong> this page, `WINDOW`, the mobile
 * app's `patientPortal.deleteAccount.*` bundles and the web portal's. Requests already raised keep
 * the `dueAt` they were given.</p>
 *
 * <h2>English only, deliberately</h2>
 *
 * <p>The site serves four locales; this document is published in English and says so. A legal
 * commitment translated without review by someone competent in both the language and the subject
 * is worse than one a reader has to read in a second language — the same reasoning that keeps
 * hc-patient's Spanish clinical bundles unpublished.</p>
 */
@Component({
  selector: 'abc-privacy-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TranslocoPipe],
  template: `
    <main id="main" class="max-w-3xl mx-auto px-4 py-12">
      <h1 class="font-serif text-3xl text-brand-navy">Privacy policy</h1>
      <p class="mt-2 text-sm text-brand-muted">Abofonsa BridgeCare, a service of Jojo Addison Consultancy. Last updated 25 August 2026.</p>
      <p class="mt-1 text-sm text-brand-muted">{{ 'privacy.englishOnly' | transloco }}</p>

      <div class="prose-reset mt-8 grid gap-6 leading-relaxed">
        <section>
          <h2 class="font-semibold text-brand-navy text-xl">Who we are</h2>
          <p>
            Abofonsa BridgeCare is a home-healthcare platform operated by Jojo Addison Consultancy in Accra, Ghana. This policy covers
            the BridgeCare patient app, the patient portal at patient.abofonsa.com, and this website.
          </p>
        </section>

        <section>
          <h2 class="font-semibold text-brand-navy text-xl">What we hold</h2>
          <ul class="mt-2 grid gap-1">
            <li><strong>Account details</strong> — your name, email address and the password you set, held so you can sign in.</li>
            <li>
              <strong>Health information</strong> — your profile, conditions, medications, allergies, clinical cases, care plans,
              reports and the files attached to them, appointments and visits, and vital-sign readings.
            </li>
            <li>
              <strong>Care relationships</strong> — the person you have nominated as your care angel, and any permission you have
              given for someone to act on your behalf.
            </li>
            <li><strong>Activity</strong> — a record of changes to your health record, so you and your clinicians can see what changed and when.</li>
          </ul>
          <p class="mt-2">
            We do not sell your information, we do not use it for advertising, and we do not share it with anyone outside your care
            other than where the law requires it.
          </p>
        </section>

        <section>
          <h2 class="font-semibold text-brand-navy text-xl">Who can see it</h2>
          <p>
            You, the clinicians involved in your care, anyone you have given an active care delegation to, and our administrators.
            A care delegation lets someone act for you when you cannot act for yourself; you can withdraw it at any time from the
            profile screen of either the app or the portal, and it stops working on the next request.
          </p>
        </section>

        <section id="deletion">
          <h2 class="font-semibold text-brand-navy text-xl">Deleting your record</h2>
          <p>
            You can ask us to delete your health record at any time, from the app (Profile → Delete your record), from the portal, or
            from
            <a class="text-brand-gold-ink underline" routerLink="/delete-account">this page</a>.
          </p>
          <p class="mt-2">
            <strong>We delete your record within 14 days of the request.</strong> The app and the portal both show you the exact date.
            The deletion is carried out by an administrator rather than automatically, so that nothing irreversible follows from a
            single tap — and for the same reason you can withdraw the request at any time before it is carried out.
          </p>
          <p class="mt-2">When the deletion is carried out, we erase:</p>
          <ul class="mt-2 grid gap-1">
            <li>your profile and contact details;</li>
            <li>your conditions, medications, allergies and vital-sign readings;</li>
            <li>your clinical cases, reports and the files attached to them, care plans, appointments and visits;</li>
            <li>your activity history;</li>
            <li>any permission you had given someone to act for you, and any you held to act for someone else.</li>
          </ul>
          <p class="mt-2">
            <strong>What we keep.</strong> A record that a deletion was requested and carried out — the date, who authorised it, and
            how many items were removed from each category. It holds no clinical information about you. We keep it because we have to
            be able to show that we did what we said we would.
          </p>
          <p class="mt-2">
            We may refuse a deletion request where the law requires us to keep the records — a legal hold or an open investigation.
            If we do, we tell you why.
          </p>
        </section>

        <section>
          <h2 class="font-semibold text-brand-navy text-xl">How it is protected</h2>
          <p>
            Everything travels over HTTPS. On your phone, your session is held in the Android Keystore or the iOS Keychain rather
            than in ordinary storage, and it is not included in device backups. Access to your record is checked on every request
            against who you are, rather than being decided once when you sign in.
          </p>
        </section>

        <section>
          <h2 class="font-semibold text-brand-navy text-xl">Your other rights</h2>
          <p>
            You can see everything we hold about you in the app or the portal. You can correct your own details there. To ask for a
            copy of your record in a portable form, or if you want to object to how we are using it, write to us at the address
            below.
          </p>
        </section>

        <section>
          <h2 class="font-semibold text-brand-navy text-xl">Contact</h2>
          <p>
            <a class="text-brand-gold-ink underline" href="mailto:privacy&#64;abofonsa.com">privacy&#64;abofonsa.com</a><br />
            Jojo Addison Consultancy, Accra, Ghana
          </p>
        </section>
      </div>
    </main>
  `,
})
export class PrivacyPage {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);

  constructor() {
    this.title.setTitle('Privacy policy — Abofonsa BridgeCare');
    // Indexable, unlike most of this site's non-content pages: Google Play's reviewer follows this
    // URL from the store listing, and a policy behind a noindex reads as one not meant to be found.
    this.meta.updateTag({ name: 'robots', content: 'index,follow' });
    this.meta.updateTag({
      name: 'description',
      content: 'How Abofonsa BridgeCare handles your health information, and how to have your record deleted within 14 days.',
    });
  }
}
