import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';

/**
 * How to have your BridgeCare record deleted, for somebody who is not holding the app.
 *
 * <h2>Why this page exists separately from the app's own screen</h2>
 *
 * <p>Google Play requires an app that lets people create accounts to offer deletion in two places:
 * inside the app, and at a <em>publicly reachable web URL that does not require the app</em>. The
 * second is the one that matters for a person who has uninstalled, lost the phone, or cannot get
 * past the sign-in screen — exactly the people least able to use the in-app path.</p>
 *
 * <p>So this page must work with no session, no JavaScript-dependent data fetch, and no dependency
 * on the content API. It is static for the same reason
 * {@link PrivacyPage} is: it has to render on the day something else is broken.</p>
 *
 * <h2>It does not delete anything itself</h2>
 *
 * <p>There is deliberately no form here that accepts an email address and starts an erasure. An
 * unauthenticated form that erases a health record on the strength of a typed address is a way to
 * delete somebody else's medical history, and no amount of confirmation email makes it a good
 * shape. The two routes offered are the authenticated in-app one and a written request that a
 * person handles.</p>
 */
@Component({
  selector: 'abc-delete-account-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TranslocoPipe],
  template: `
    <main id="main" class="max-w-3xl mx-auto px-4 py-12">
      <h1 class="font-serif text-3xl text-brand-navy">Delete your BridgeCare record</h1>
      <p class="mt-1 text-sm text-brand-muted">{{ 'privacy.englishOnly' | transloco }}</p>

      <div class="prose-reset mt-8 grid gap-6 leading-relaxed">
        <p>
          You can ask us to delete your health record and everything in it. <strong>We carry it out within 14 days</strong>, and you
          can withdraw the request at any time before then.
        </p>

        <section>
          <h2 class="font-semibold text-brand-navy text-xl">If you can sign in</h2>
          <p>This is the quickest route, and it shows you the exact date your record will be deleted.</p>
          <ul class="mt-2 grid gap-1">
            <li><strong>In the BridgeCare app</strong> — Profile → <em>Delete your record</em>.</li>
            <li>
              <strong>In the patient portal</strong> —
              <!--
                /delete-account, not /portal/delete-account. hc-patient mounts portal.routes.ts at
                path '' inside its signed-in shell, so the screens sit at the root even though
                the file is called portal.routes.ts. The wrong URL would not have announced itself:
                the portal is a single-page app and its fallback answers 200 for any path, so the
                link would have looked healthy and landed a person who has decided to leave on a
                page that is not the one they were promised — on the page Google Play follows.
              -->
              <a class="text-brand-gold-ink underline" href="https://patient.abofonsa.com/delete-account">
                patient.abofonsa.com/delete-account
              </a>
            </li>
          </ul>
        </section>

        <section>
          <h2 class="font-semibold text-brand-navy text-xl">If you cannot sign in</h2>
          <p>
            Write to
            <a class="text-brand-gold-ink underline" href="mailto:privacy&#64;abofonsa.com?subject=Delete%20my%20BridgeCare%20record">
              privacy&#64;abofonsa.com
            </a>
            from the email address on the account, asking for your record to be deleted.
          </p>
          <p class="mt-2">
            We will confirm it is you before we delete anything — a health record is not something to erase on the strength of an
            email address alone. Once confirmed, the same 14 days apply, counted from your original message.
          </p>
        </section>

        <section>
          <h2 class="font-semibold text-brand-navy text-xl">What gets deleted</h2>
          <ul class="mt-2 grid gap-1">
            <li>your profile and contact details;</li>
            <li>your conditions, medications, allergies and vital-sign readings;</li>
            <li>your clinical cases, reports and the files attached to them, care plans, appointments and visits;</li>
            <li>your activity history;</li>
            <li>any permission you had given someone to act for you, and any you held to act for someone else.</li>
          </ul>
          <p class="mt-2">
            We keep a record that the deletion was asked for and carried out — the date, who authorised it, and how many items were
            removed from each category. It holds no clinical information about you.
            <a class="text-brand-gold-ink underline" routerLink="/privacy" fragment="deletion">The privacy policy says more</a>.
          </p>
        </section>
      </div>
    </main>
  `,
})
export class DeleteAccountPage {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);

  constructor() {
    this.title.setTitle('Delete your record — Abofonsa BridgeCare');
    // Indexable, and for a sharper reason than the policy: this is the URL given to Google Play as
    // the account-deletion link, and a reviewer has to be able to reach it from a search as well as
    // from the listing.
    this.meta.updateTag({ name: 'robots', content: 'index,follow' });
    this.meta.updateTag({
      name: 'description',
      content: 'How to have your Abofonsa BridgeCare health record deleted, in the app or by writing to us. Carried out within 14 days.',
    });
  }
}
