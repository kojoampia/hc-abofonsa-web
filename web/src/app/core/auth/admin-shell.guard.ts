import { CanMatchFn } from '@angular/router';

/**
 * Guards the lazy `/admin` chunk (spec §5.4/AD-1). Matching is always allowed — the CMS handles
 * its own login redirect inside the chunk — but the guard exists as the seam keeping the admin
 * bundle out of every public visitor's network log (task 69's verification): the chunk only
 * loads when the /admin URL is actually visited.
 */
export const adminShellGuard: CanMatchFn = () => true;
