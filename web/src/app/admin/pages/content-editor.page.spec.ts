import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { AdminApi } from '../core/admin-api';
import { AdminApiStub, contentEntry, problem } from '../testing/admin-api.stub';
import { translocoTesting } from '../../testing/site-content.fixture';
import { ContentEditorPage } from './content-editor.page';

/** Spec §9.3 acceptance criteria E-1..E-10 (plan tasks 85-86). */
describe('ContentEditorPage', () => {
  let stub: AdminApiStub;

  async function render(options: ConstructorParameters<typeof AdminApiStub>[0] = {}, type = 'services', id = 'entry-1') {
    stub = new AdminApiStub(options);
    await TestBed.configureTestingModule({
      imports: [ContentEditorPage, translocoTesting()],
      providers: [
        provideZonelessChangeDetection(),
        provideNoopAnimations(),
        provideRouter([]),
        { provide: AdminApi, useValue: stub },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: new Map([['type', type], ['id', id]]) as never } },
        },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(ContentEditorPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture;
  }

  const component = (fixture: ComponentFixture<ContentEditorPage>) =>
    fixture.componentInstance as unknown as {
      activeLocale: { set: (locale: string) => void };
      setLocalized: (field: { key: string }, value: string) => void;
      save: () => Promise<boolean>;
      saveAndPublish: () => Promise<void>;
      hasUnsavedChanges: () => boolean;
      takeTheirs: () => void;
      conflictFields: () => string[];
      restore: (revision: { revisionNumber: number }) => Promise<void>;
      dirty: () => boolean;
    };

  it('E-1: each locale tab shows a completeness glyph (complete / partial / untranslated)', async () => {
    const fixture = await render();
    const tabText = (locale: string) =>
      (fixture.nativeElement.querySelector(`[data-testid="tab-${locale}"]`) as HTMLElement).textContent!;
    // The fixture exercises all three states: English fills name/blurb/availableOn; Spanish has
    // name+blurb but no availableOn (partial); German has nothing.
    expect(tabText('en')).toContain('✓');
    expect(tabText('es')).toContain('⚠');
    expect(tabText('de')).toContain('○');
  });

  it('E-2: editing a non-English locale shows the English source beneath each field', async () => {
    const fixture = await render();
    expect(fixture.nativeElement.querySelectorAll('[data-testid="en-reference"]').length).toBe(0);

    component(fixture).activeLocale.set('fr');
    fixture.detectChanges();

    const references = Array.from(
      fixture.nativeElement.querySelectorAll('[data-testid="en-reference"]'),
    ) as HTMLElement[];
    expect(references.length).toBeGreaterThan(0);
    expect(references.map((el) => el.textContent).join(' ')).toContain('Elderly & companion care');
  });

  it('E-3: English is mandatory - saving without it never reaches the API', async () => {
    const entry = contentEntry();
    (entry.document['name'] as Record<string, string>) = { es: 'Solo español' };
    const fixture = await render({ entry });

    const saved = await component(fixture).save();

    expect(saved).toBe(false);
    expect(stub.callsTo('updateContent')).toHaveLength(0);
  });

  it('E-4: the unsaved-changes guard reports dirty state after an edit and clean after save', async () => {
    const fixture = await render();
    expect(component(fixture).hasUnsavedChanges()).toBe(false);

    component(fixture).setLocalized({ key: 'name' }, 'Edited name');
    expect(component(fixture).hasUnsavedChanges()).toBe(true);

    await component(fixture).save();
    expect(component(fixture).hasUnsavedChanges()).toBe(false);
  });

  it('E-5: saving sends the document with the loaded version so the server can write a revision', async () => {
    const fixture = await render();
    component(fixture).setLocalized({ key: 'blurb' }, 'Updated blurb');
    await component(fixture).save();

    const [call] = stub.callsTo('updateContent');
    expect(call).toBeDefined();
    expect(call.args[3]).toBe(0); // the version we loaded
    expect((call.args[2] as Record<string, Record<string, string>>)['blurb']['en']).toBe('Updated blurb');
  });

  it('E-6: publishing with incomplete English shows the specific field list, not a generic error', async () => {
    const fixture = await render({
      onPublish: () =>
        problem(422, {
          title: 'English content incomplete',
          detail: 'English content is incomplete',
          fields: ['blurb', 'availableOn'],
        }),
    });

    await component(fixture).saveAndPublish();
    fixture.detectChanges();

    const panel = fixture.nativeElement.querySelector('[data-testid="publish-problem"]') as HTMLElement;
    expect(panel).toBeTruthy();
    expect(panel.textContent).toContain('English content incomplete');
    expect(panel.textContent).toContain('blurb, availableOn');
  });

  it('E-8: the preview pane renders the real public component fed with the draft', async () => {
    const fixture = await render();
    const preview = fixture.nativeElement.querySelector('[data-testid="preview-pane"]') as HTMLElement;
    expect(preview).toBeTruthy();
    // The actual ServicesCarousel markup, driven by the edited document.
    expect(preview.querySelector('abc-services-carousel')).toBeTruthy();
    expect(preview.textContent).toContain('Elderly & companion care');

    component(fixture).setLocalized({ key: 'name' }, 'Live edited name');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(
      (fixture.nativeElement.querySelector('[data-testid="preview-pane"]') as HTMLElement).textContent,
    ).toContain('Live edited name');
  });

  it('E-9: a concurrent-edit 409 offers a diff of the conflicting fields', async () => {
    const theirs = {
      ...contentEntry().document,
      name: { en: 'Their name', es: 'Su nombre' },
      version: 1,
    };
    const fixture = await render({
      onUpdate: () =>
        problem(409, {
          title: 'Conflict',
          detail: 'The entity was modified by someone else',
          currentVersion: 1,
          current: theirs,
        }),
    });

    component(fixture).setLocalized({ key: 'name' }, 'My name');
    await component(fixture).save();
    fixture.detectChanges();

    const panel = fixture.nativeElement.querySelector('[data-testid="conflict-panel"]') as HTMLElement;
    expect(panel).toBeTruthy();
    expect(panel.textContent).toContain('version 1');
    expect(component(fixture).conflictFields()).toContain('name');

    // Taking their version replaces the draft and clears the conflict.
    component(fixture).takeTheirs();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-testid="conflict-panel"]')).toBeNull();
    expect(component(fixture).dirty()).toBe(false);
  });

  it('E-10: a testimonial without consent is refused with the consent explanation', async () => {
    const fixture = await render(
      {
        entry: contentEntry({
          type: 'TESTIMONIAL',
          document: {
            _id: 'entry-1',
            personName: 'Adwoa Boateng',
            quote: { en: 'A quote' },
            consent: { obtained: false },
          },
        }),
        onPublish: () =>
          problem(409, {
            title: 'Conflict',
            detail: 'Publishing requires recorded consent (consent.obtained must be true)',
          }),
      },
      'testimonials',
    );

    await component(fixture).saveAndPublish();
    fixture.detectChanges();

    const panel = fixture.nativeElement.querySelector('[data-testid="publish-problem"]') as HTMLElement;
    expect(panel.textContent).toContain('consent');
  });

  it('restoring a revision reloads the entity from the server', async () => {
    const fixture = await render({
      revisions: [
        {
          revisionNumber: 1,
          status: 'DRAFT',
          changeSummary: 'created',
          createdAt: new Date().toISOString(),
          createdBy: 'usr_admin',
          snapshot: {},
        },
      ],
    });
    await component(fixture).restore({ revisionNumber: 1 });
    expect(stub.callsTo('restore')[0].args).toEqual(['services', 'entry-1', 1]);
    expect(stub.callsTo('getContent').length).toBeGreaterThan(1); // reloaded
  });

  it('a new entity is created rather than updated', async () => {
    const fixture = await render({}, 'faqs', 'new');
    component(fixture).setLocalized({ key: 'question' }, 'A new question?');
    component(fixture).setLocalized({ key: 'answer' }, 'An answer.');
    await component(fixture).save();

    expect(stub.callsTo('createContent')).toHaveLength(1);
    expect(stub.callsTo('updateContent')).toHaveLength(0);
  });
});
