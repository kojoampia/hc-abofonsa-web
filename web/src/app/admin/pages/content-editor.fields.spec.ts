import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { AdminApi } from '../core/admin-api';
import { AdminApiStub, contentEntry } from '../testing/admin-api.stub';
import { translocoTesting } from '../../testing/site-content.fixture';
import { ContentEditorPage } from './content-editor.page';
import { deepGet, deepSet } from '../core/editor-config';

/**
 * Exercises every field kind the editor supports (spec §9.3's one-pattern-fits-six-types claim),
 * including the nested dot paths (price.amount, consent.obtained, address.street) and the
 * drag-reorder path for each list kind (E-7).
 */
describe('ContentEditorPage field kinds', () => {
  let stub: AdminApiStub;

  async function render(type: string, document: Record<string, unknown>) {
    stub = new AdminApiStub({ entry: contentEntry({ document: { _id: 'entry-1', ...document } }) });
    await TestBed.configureTestingModule({
      imports: [ContentEditorPage, translocoTesting()],
      providers: [
        provideZonelessChangeDetection(),
        provideNoopAnimations(),
        provideRouter([]),
        { provide: AdminApi, useValue: stub },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: new Map([['type', type], ['id', 'entry-1']]) as never } },
        },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(ContentEditorPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture;
  }

  // The editor's field API is protected; tests reach it the same way the template does.
  type EditorApi = {
    activeLocale: { set: (l: string) => void };
    textValue: (f: { key: string }) => string;
    numberValue: (f: { key: string }) => number | null;
    boolValue: (f: { key: string }) => boolean;
    localizedValue: (f: { key: string }) => string;
    stringList: (f: { key: string }) => string[];
    localizedList: (f: { key: string }) => Array<Record<string, string>>;
    itemList: (f: { key: string }) => Array<Record<string, unknown>>;
    setText: (f: { key: string; readonly?: boolean }, v: string) => void;
    setNumber: (f: { key: string }, v: number) => void;
    setBool: (f: { key: string }, v: boolean) => void;
    setLocalized: (f: { key: string }, v: string) => void;
    setStringListEntry: (f: { key: string }, i: number, v: string) => void;
    setLocalizedListEntry: (f: { key: string }, i: number, v: string) => void;
    setItemField: (f: { key: string }, i: number, k: string, v: string) => void;
    setItemFlag: (f: { key: string }, i: number, k: string, v: boolean) => void;
    addStringListEntry: (f: { key: string }) => void;
    addLocalizedListEntry: (f: { key: string }) => void;
    removeListEntry: (f: { key: string }, i: number) => void;
    reorderList: (f: { key: string }, e: { previousIndex: number; currentIndex: number }) => void;
    documentSnapshot: () => Record<string, unknown>;
    englishOf: (f: { key: string }) => string;
    save: () => Promise<boolean>;
  };
  const api = (fixture: ComponentFixture<ContentEditorPage>) => fixture.componentInstance as unknown as EditorApi;

  it('plain text, number and boolean fields round-trip, including nested dot paths', async () => {
    const fixture = await render('plans', {
      code: 'PEAR',
      name: { en: 'PEAR Plan' },
      price: { amount: 3000, currency: 'GHS' },
      featured: false,
    });
    const editor = api(fixture);

    expect(editor.textValue({ key: 'code' })).toBe('PEAR');
    expect(editor.numberValue({ key: 'price.amount' })).toBe(3000);
    expect(editor.boolValue({ key: 'featured' })).toBe(false);

    editor.setNumber({ key: 'price.amount' }, 3500);
    editor.setBool({ key: 'featured' }, true);
    expect(editor.numberValue({ key: 'price.amount' })).toBe(3500);
    expect(editor.boolValue({ key: 'featured' })).toBe(true);
    // The nested path was written in place, not flattened.
    expect((editor.documentSnapshot()['price'] as Record<string, unknown>)['currency']).toBe('GHS');
  });

  it('a readonly field ignores edits', async () => {
    const fixture = await render('plans', { code: 'PEAR', name: { en: 'PEAR Plan' } });
    api(fixture).setText({ key: 'code', readonly: true }, 'MELON');
    expect(api(fixture).textValue({ key: 'code' })).toBe('PEAR');
  });

  it('localized fields write per-locale without disturbing the other locales', async () => {
    const fixture = await render('faqs', { question: { en: 'Q?', es: '¿Q?' }, answer: { en: 'A.' } });
    const editor = api(fixture);

    editor.activeLocale.set('fr');
    editor.setLocalized({ key: 'question' }, 'Q en français ?');

    const question = editor.documentSnapshot()['question'] as Record<string, string>;
    expect(question).toEqual({ en: 'Q?', es: '¿Q?', fr: 'Q en français ?' });
    expect(editor.englishOf({ key: 'question' })).toBe('Q?');
    expect(editor.localizedValue({ key: 'question' })).toBe('Q en français ?');
  });

  it('string lists add, edit, reorder and remove (settings.phones)', async () => {
    const fixture = await render('settings', {
      organisationName: 'Abofonsa BridgeCare',
      phones: ['+233 302 717 577', '+233 502 588 736'],
    });
    const editor = api(fixture);
    const phones = () => editor.stringList({ key: 'phones' });

    expect(phones()).toHaveLength(2);
    editor.addStringListEntry({ key: 'phones' });
    editor.setStringListEntry({ key: 'phones' }, 2, '+233 242 286 304');
    expect(phones()[2]).toBe('+233 242 286 304');

    editor.reorderList({ key: 'phones' }, { previousIndex: 2, currentIndex: 0 });
    expect(phones()[0]).toBe('+233 242 286 304');

    editor.removeListEntry({ key: 'phones' }, 0);
    expect(phones()).toHaveLength(2);
  });

  it('localized lists (service bullet points) add, edit per locale, reorder and remove', async () => {
    const fixture = await render('services', {
      name: { en: 'Elderly care' },
      points: [{ en: 'Washing' }, { en: 'Medication' }],
    });
    const editor = api(fixture);
    const points = () => editor.localizedList({ key: 'points' });

    editor.activeLocale.set('es');
    editor.setLocalizedListEntry({ key: 'points' }, 0, 'Aseo');
    expect(points()[0]).toEqual({ en: 'Washing', es: 'Aseo' });

    editor.addLocalizedListEntry({ key: 'points' });
    expect(points()).toHaveLength(3);

    // E-7: drag reorder moves the whole localized entry, not just the active locale's text.
    editor.reorderList({ key: 'points' }, { previousIndex: 0, currentIndex: 1 });
    expect(points()[1]).toEqual({ en: 'Washing', es: 'Aseo' });

    editor.removeListEntry({ key: 'points' }, 2);
    expect(points()).toHaveLength(2);
  });

  it('section items edit their localized title/body and reorder', async () => {
    const fixture = await render('sections', {
      key: 'PROCESS',
      heading: { en: 'Getting started' },
      items: [
        { key: 'p1', icon: 'phone', title: { en: 'Consultation' }, body: { en: 'We talk.' } },
        { key: 'p2', icon: 'clipboard', title: { en: 'Assessment' }, body: { en: 'A nurse visits.' } },
      ],
    });
    const editor = api(fixture);
    const items = () => editor.itemList({ key: 'items' });

    editor.activeLocale.set('de');
    editor.setItemField({ key: 'items' }, 0, 'title', 'Beratung');
    expect(items()[0]['title']).toEqual({ en: 'Consultation', de: 'Beratung' });

    editor.reorderList({ key: 'items' }, { previousIndex: 1, currentIndex: 0 });
    expect(items()[0]['key']).toBe('p2');
  });

  it('plan features edit their label and toggle the included/emphasised flags', async () => {
    const fixture = await render('plans', {
      code: 'PEAR',
      name: { en: 'PEAR Plan' },
      features: [{ label: { en: '5 weekly visits' }, included: true, emphasised: false }],
    });
    const editor = api(fixture);

    editor.setItemField({ key: 'features' }, 0, 'label', '6 weekly visits');
    editor.setItemFlag({ key: 'features' }, 0, 'emphasised', true);

    const features = editor.itemList({ key: 'features' });
    expect(features[0]['label']).toEqual({ en: '6 weekly visits' });
    expect(features[0]['emphasised']).toBe(true);
    expect(features[0]['included']).toBe(true);
  });

  it('a missing list renders as empty rather than throwing', async () => {
    const fixture = await render('services', { name: { en: 'No points here' } });
    expect(api(fixture).localizedList({ key: 'points' })).toEqual([]);
    expect(api(fixture).itemList({ key: 'nope' })).toEqual([]);
  });

  it('testimonial consent is a nested boolean the editor can set', async () => {
    const fixture = await render('testimonials', {
      personName: 'Adwoa Boateng',
      quote: { en: 'A quote' },
      consent: { obtained: false },
    });
    const editor = api(fixture);
    expect(editor.boolValue({ key: 'consent.obtained' })).toBe(false);

    editor.setBool({ key: 'consent.obtained' }, true);
    editor.setText({ key: 'consent.evidenceRef' }, 'consent/2026/adwoa.pdf');
    await editor.save();

    const sent = stub.callsTo('updateContent')[0].args[2] as Record<string, Record<string, unknown>>;
    expect(sent['consent']).toEqual({ obtained: true, evidenceRef: 'consent/2026/adwoa.pdf' });
  });
});

describe('editor-config path helpers', () => {
  it('deepGet walks nested paths and tolerates gaps', () => {
    const document = { price: { amount: 3000 }, name: { en: 'X' } };
    expect(deepGet(document, 'price.amount')).toBe(3000);
    expect(deepGet(document, 'name.en')).toBe('X');
    expect(deepGet(document, 'missing.deeply.nested')).toBeUndefined();
  });

  it('deepSet creates intermediate objects as needed', () => {
    const document: Record<string, unknown> = {};
    deepSet(document, 'address.street', 'Ankobra River Street #5');
    expect(document).toEqual({ address: { street: 'Ankobra River Street #5' } });

    deepSet(document, 'address.city', 'Accra');
    expect(document['address']).toEqual({ street: 'Ankobra River Street #5', city: 'Accra' });
  });
});
