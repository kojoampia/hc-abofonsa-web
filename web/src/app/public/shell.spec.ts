import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { TranslocoService } from '@jsverse/transloco';
import { contentApiStub, translocoTesting } from '../testing/site-content.fixture';
import { PublicShell } from './public-shell';
import { SiteHeader } from './sections/site-header';
import { LanguageSwitcher } from './sections/language-switcher';
import { DemoNoticeBar } from './sections/demo-notice-bar';
import { NotFoundPage } from './not-found.page';
import { LocaleService } from '../core/i18n/locale.service';

function routeWithLocale(locale: string | null) {
  return { snapshot: { paramMap: new Map(locale ? [['locale', locale]] : []) as never } };
}

describe('public shell and navigation chrome', () => {
  async function render<T>(component: new () => T, routeLocale: string | null = null) {
    await TestBed.configureTestingModule({
      imports: [component as never, translocoTesting()],
      providers: [
        provideZonelessChangeDetection(),
        provideNoopAnimations(),
        provideRouter([]),
        contentApiStub(),
        { provide: ActivatedRoute, useValue: routeWithLocale(routeLocale) },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(component);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture;
  }

  describe('PublicShell locale resolution (spec §10.4)', () => {
    beforeEach(() => {
      document.cookie = 'abofonsa_locale=;path=/;max-age=0';
    });

    it('an explicit path prefix wins and drives <html lang> and Transloco', async () => {
      await render(PublicShell, 'de');
      expect(TestBed.inject(LocaleService).current()).toBe('de');
      expect(document.documentElement.lang).toBe('de');
      expect(TestBed.inject(TranslocoService).getActiveLang()).toBe('de');
    });

    it('falls back to English at / when nothing is remembered', async () => {
      await render(PublicShell, null);
      expect(TestBed.inject(LocaleService).current()).toBe('en');
    });

    it('renders the skip link as the first focusable element (spec §6.2)', async () => {
      const fixture = await render(PublicShell, null);
      const firstLink = fixture.nativeElement.querySelector('a') as HTMLAnchorElement;
      expect(firstLink.getAttribute('href')).toBe('#main');
      expect(firstLink.className).toContain('sr-only');
    });
  });

  describe('SiteHeader', () => {
    it('renders the anchor navigation and the consultation CTA', async () => {
      const fixture = await render(SiteHeader);
      const hrefs = Array.from(fixture.nativeElement.querySelectorAll('nav a')).map((a) =>
        (a as HTMLAnchorElement).getAttribute('href'),
      );
      expect(hrefs).toContain('#services');
      expect(hrefs).toContain('#pricing');
      expect(hrefs).toContain('#contact');
    });

    it('scroll-spy marks the active section with aria-current', async () => {
      const fixture = await render(SiteHeader);
      (fixture.componentInstance as unknown as { active: { set: (id: string) => void } }).active.set('pricing');
      fixture.detectChanges();
      const current = fixture.nativeElement.querySelector('nav a[aria-current="true"]') as HTMLAnchorElement;
      expect(current.getAttribute('href')).toBe('#pricing');
    });

    /**
     * The defect this covers: `active` used to be written only by the scroll-spy observer, so
     * clicking a nav item marked nothing. The highlight arrived when the section drifted into the
     * observer's band — and with `rootMargin: -40% 0px -55%` a short section, or the last one on the
     * page, never gets there. Some items highlighted, some never did.
     */
    it('a clicked nav item marks itself active, without waiting for a scroll that may never come', async () => {
      const fixture = await render(SiteHeader);
      const link = fixture.nativeElement.querySelector('nav a[href="#faq"]') as HTMLAnchorElement;

      link.click();
      fixture.detectChanges();

      expect(link.getAttribute('aria-current')).toBe('true');
    });

    it('marking one item active marks the previous one inactive — exactly one is current', async () => {
      const fixture = await render(SiteHeader);
      const services = fixture.nativeElement.querySelector('nav a[href="#services"]') as HTMLAnchorElement;
      const pricing = fixture.nativeElement.querySelector('nav a[href="#pricing"]') as HTMLAnchorElement;

      services.click();
      fixture.detectChanges();
      expect(services.getAttribute('aria-current')).toBe('true');

      pricing.click();
      fixture.detectChanges();
      expect(services.getAttribute('aria-current')).toBeNull();
      // Anchors inside the bar only: the language switcher marks the current locale with the same
      // attribute on a <button>, and the drawer renders its own copy of every item.
      expect(fixture.nativeElement.querySelectorAll('nav a[aria-current="true"]').length).toBe(1);
    });

    it('the sign-up button is a nav item too, and marks itself like one', async () => {
      const fixture = await render(SiteHeader);
      const signup = fixture.nativeElement.querySelector('[data-testid="nav-signup"]') as HTMLAnchorElement;

      signup.click();
      fixture.detectChanges();

      expect(signup.getAttribute('aria-current')).toBe('true');
    });

    it('exposes a mobile menu trigger for small viewports', async () => {
      const fixture = await render(SiteHeader);
      expect(fixture.nativeElement.querySelector('[data-testid="mobile-menu-button"]')).toBeTruthy();
    });
  });

  describe('LanguageSwitcher', () => {
    it('switching navigates to the locale-prefixed path so the URL reflects the language', async () => {
      const fixture = await render(LanguageSwitcher);
      const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);

      (fixture.componentInstance as unknown as { switchTo: (l: string) => void }).switchTo('fr');
      expect(navigate).toHaveBeenCalledWith('/fr');

      (fixture.componentInstance as unknown as { switchTo: (l: string) => void }).switchTo('en');
      expect(navigate).toHaveBeenLastCalledWith('/'); // English has no prefix
    });

    /**
     * The regression that made English unselectable. `/` carries no locale prefix, so the shell
     * resolves it from the cookie — which still named the language being switched away from. The
     * choice has to be recorded before navigating, or English can never be chosen at all.
     */
    it('records the chosen locale before navigating, so choosing English is not undone by the cookie', async () => {
      const fixture = await render(LanguageSwitcher);
      const localeService = TestBed.inject(LocaleService);
      vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
      const component = fixture.componentInstance as unknown as { switchTo: (l: string) => void };

      component.switchTo('es');
      expect(localeService.current()).toBe('es');
      expect(document.cookie).toContain('abofonsa_locale=es');

      component.switchTo('en');
      expect(localeService.current()).toBe('en');
      expect(document.cookie).toContain('abofonsa_locale=en');
    });

    it('renders one button per locale, labelled by its endonym, marking the active one', async () => {
      const fixture = await render(LanguageSwitcher);
      const buttons = Array.from(fixture.nativeElement.querySelectorAll('button.lang-button')) as HTMLElement[];

      expect(buttons.map((b) => b.textContent?.trim())).toEqual(['en', 'es', 'fr', 'de']);
      // The visible text is a code; the accessible name is the language's own name.
      expect(buttons.map((b) => b.getAttribute('aria-label'))).toEqual([
        'English',
        'Español',
        'Français',
        'Deutsch',
      ]);
      expect(buttons.filter((b) => b.getAttribute('aria-current') === 'true')).toHaveLength(1);
    });
  });

  describe('DemoNoticeBar (spec §6 #1)', () => {
    // Tests build with the development environment, where isDemo is true; the production
    // fileReplacement flips it to false so the banner compiles out (spec §14.2 decision #2).
    it('renders the demo notice while environment.isDemo is set', async () => {
      const fixture = await render(DemoNoticeBar);
      const note = fixture.nativeElement.querySelector('[role="note"]') as HTMLElement;
      expect(fixture.componentInstance.isDemo()).toBe(true);
      expect(note.textContent).toContain('Demonstration website');
    });

    it('renders nothing at all when the flag is off, so production ships no banner markup', async () => {
      const fixture = await render(DemoNoticeBar);
      fixture.componentInstance.isDemo.set(false);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('[role="note"]')).toBeNull();
    });
  });

  describe('NotFoundPage', () => {
    it('renders the translated not-found copy and a route home', async () => {
      const fixture = await render(NotFoundPage);
      expect(fixture.nativeElement.textContent).toContain('Page not found');
      expect(fixture.nativeElement.querySelector('a')).toBeTruthy();
    });
  });
});
