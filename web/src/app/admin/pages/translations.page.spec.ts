import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { AdminApi } from '../core/admin-api';
import { AdminApiStub } from '../testing/admin-api.stub';
import { TranslationsPage } from './translations.page';

/** Spec §9.4 T-1..T-7 (plan task 87). */
describe('TranslationsPage', () => {
  let stub: AdminApiStub;

  async function render(): Promise<ComponentFixture<TranslationsPage>> {
    stub = new AdminApiStub({
      overrides: {
        en: {
          locale: 'en',
          defaults: { 'nav.pricing': 'Plans and pricing', 'nav.faq': 'FAQ', 'form.submit': 'Submit request' },
          overrides: {},
        },
        es: {
          locale: 'es',
          // 'nav.faq' has no Spanish value at all -> missing; 'form.submit' is an override.
          defaults: { 'nav.pricing': 'Planes y precios', 'nav.faq': '', 'form.submit': 'Enviar' },
          overrides: { 'form.submit': 'Enviar solicitud' },
        },
      },
    });
    await TestBed.configureTestingModule({
      imports: [TranslationsPage],
      providers: [provideZonelessChangeDetection(), provideNoopAnimations(), { provide: AdminApi, useValue: stub }],
    }).compileComponents();
    const fixture = TestBed.createComponent(TranslationsPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture;
  }

  const component = (fixture: ComponentFixture<TranslationsPage>) =>
    fixture.componentInstance as unknown as {
      missingOnly: { set: (value: boolean) => void };
      stage: (key: string, value: string) => void;
      saveStaged: () => Promise<void>;
      revert: (key: string) => Promise<void>;
      coverage: () => number;
      diffAgainstCurrent: (imported: Record<string, string>) => Array<{ key: string; from: string; to: string }>;
      importDiff: { set: (value: unknown) => void; (): unknown };
      applyImport: () => Promise<void>;
    };

  it('T-1: one row per UI string key with the English source beside the locale value', async () => {
    const fixture = await render();
    const rows = fixture.nativeElement.querySelectorAll('tbody tr');
    expect(rows.length).toBe(3);
    const pricingRow = fixture.nativeElement.querySelector('tr[data-key="nav.pricing"]') as HTMLElement;
    expect(pricingRow.textContent).toContain('Plans and pricing'); // English source column
    expect((pricingRow.querySelector('input') as HTMLInputElement).value).toBe('Planes y precios');
  });

  it('T-2: the missing-only filter narrows the rows and the coverage bar reflects the whole set', async () => {
    const fixture = await render();
    expect(component(fixture).coverage()).toBeCloseTo(2 / 3, 5); // one of three is untranslated

    component(fixture).missingOnly.set(true);
    fixture.detectChanges();

    const rows = fixture.nativeElement.querySelectorAll('tbody tr');
    expect(rows.length).toBe(1);
    expect(rows[0].getAttribute('data-key')).toBe('nav.faq');
  });

  it('T-3: saving writes to the overrides endpoint, never to the shipped JSON files', async () => {
    const fixture = await render();
    component(fixture).stage('nav.pricing', 'Planes y tarifas');
    await component(fixture).saveStaged();

    const [call] = stub.callsTo('putI18nOverrides');
    expect(call.args[0]).toBe('es');
    expect(call.args[1]).toEqual({ 'nav.pricing': 'Planes y tarifas' });
  });

  it('T-4: [DEF] marks shipped defaults, overrides get a one-click revert', async () => {
    const fixture = await render();
    const defaultRow = fixture.nativeElement.querySelector('tr[data-key="nav.pricing"]') as HTMLElement;
    const overriddenRow = fixture.nativeElement.querySelector('tr[data-key="form.submit"]') as HTMLElement;

    expect(defaultRow.querySelector('[data-testid="def-marker"]')).toBeTruthy();
    expect(defaultRow.querySelector('[data-testid="revert"]')).toBeNull();
    expect(overriddenRow.querySelector('[data-testid="def-marker"]')).toBeNull();

    await component(fixture).revert('form.submit');
    expect(stub.callsTo('deleteI18nOverride')[0].args).toEqual(['es', 'form.submit']);
  });

  it('T-6: importing an unchanged file previews an empty diff; changed values preview exactly', async () => {
    const fixture = await render();
    const current = {
      'nav.pricing': 'Planes y precios',
      'nav.faq': '',
      'form.submit': 'Enviar solicitud',
    };
    expect(component(fixture).diffAgainstCurrent(current)).toEqual([]);

    const changed = { ...current, 'nav.pricing': 'Planes y tarifas', 'nav.faq': 'Preguntas' };
    const diff = component(fixture).diffAgainstCurrent(changed);
    expect(diff).toHaveLength(2);
    expect(diff.map((change) => change.key).sort()).toEqual(['nav.faq', 'nav.pricing']);
    expect(diff.find((change) => change.key === 'nav.pricing')).toMatchObject({
      from: 'Planes y precios',
      to: 'Planes y tarifas',
    });
  });

  it('T-6: nothing is applied until the diff is confirmed', async () => {
    const fixture = await render();
    const diff = component(fixture).diffAgainstCurrent({ 'nav.pricing': 'Planes y tarifas' });
    component(fixture).importDiff.set(diff);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid="import-diff"]')).toBeTruthy();
    expect(stub.callsTo('putI18nOverrides')).toHaveLength(0); // still nothing sent

    await component(fixture).applyImport();
    expect(stub.callsTo('putI18nOverrides')[0].args[1]).toEqual({ 'nav.pricing': 'Planes y tarifas' });
  });

  it('an unknown key in an imported file is ignored rather than creating a bogus override', async () => {
    const fixture = await render();
    const diff = component(fixture).diffAgainstCurrent({ 'no.such.key': 'value' });
    expect(diff).toEqual([]);
  });
});
