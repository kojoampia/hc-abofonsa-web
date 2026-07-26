import { InjectionToken, TransferState, inject, makeStateKey } from '@angular/core';

const INDEXABLE_KEY = makeStateKey<boolean>('siteIndexable');

/**
 * Whether search engines may index this deployment.
 *
 * **The default is `false`, deliberately.** Getting this wrong is asymmetric: a real launch that
 * forgets to opt in is simply not indexed yet, and is fixed by setting one variable and waiting a
 * few days. A review or staging deployment that forgets to opt *out* gets crawled and indexed on a
 * public domain, where it competes with the real site, splits its ranking signals, and can keep
 * serving stale content from search results long after the box is gone. Removing a URL from an
 * index is slow and only partly under your control.
 *
 * So the safe state is the default, and going live is an explicit act: set `SITE_INDEXABLE=true`
 * in the deployment's environment (see GO-LIVE-CHECKLIST.md).
 */
export const SITE_INDEXABLE = new InjectionToken<boolean>('SITE_INDEXABLE', {
  providedIn: 'root',
  // On the browser this reads the value the server transferred. Without the transfer, hydration
  // would evaluate the factory fresh, default to false, and strip a `noindex` off a page that
  // should have one — or, worse, add one to a page that should not.
  factory: () => inject(TransferState).get(INDEXABLE_KEY, false),
});

/**
 * Server-side provider: records the deployment's answer and hands it to the client via
 * TransferState, so hydration does not re-decide.
 *
 * The value is passed in rather than read here, because `process` does not exist in the browser
 * build's type environment — this file is compiled for both platforms, so the environment lookup
 * belongs in `app.config.server.ts`, which is server-only.
 */
export function provideSiteIndexable(indexable: boolean): {
  provide: InjectionToken<boolean>;
  useFactory: () => boolean;
} {
  return {
    provide: SITE_INDEXABLE,
    useFactory: () => {
      inject(TransferState).set(INDEXABLE_KEY, indexable);
      return indexable;
    },
  };
}
