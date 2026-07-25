import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { contentApiStub, makeSiteContent, translocoTesting } from '../../testing/site-content.fixture';
import { PricingSection } from './pricing-section';
import { PricingTable } from './pricing-table';

describe('PricingSection + PricingTable (spec §6 #12-13)', () => {
  async function renderBoth(content = makeSiteContent()) {
    await TestBed.configureTestingModule({
      imports: [PricingSection, PricingTable, translocoTesting()],
      providers: [provideZonelessChangeDetection(), contentApiStub(content)],
    }).compileComponents();
    const cards = TestBed.createComponent(PricingSection);
    const table = TestBed.createComponent(PricingTable);
    cards.detectChanges();
    table.detectChanges();
    await cards.whenStable();
    await table.whenStable();
    cards.detectChanges();
    table.detectChanges();
    return { cards, table };
  }

  it('renders three plan cards with the featured badge on exactly one', async () => {
    const { cards } = await renderBoth();
    const articles = cards.nativeElement.querySelectorAll('article[data-plan]');
    expect(articles.length).toBe(3);
    const badges = cards.nativeElement.querySelectorAll('article .bg-brand-gold');
    expect(badges.length).toBe(1);
    expect(cards.nativeElement.querySelector('article[data-plan="PAWPAW"]')?.textContent).toContain('Most chosen');
  });

  it('cards and table derive from the same plans array - a fixture change updates both identically', async () => {
    const content = makeSiteContent();
    content.plans[0].name = 'RENAMED Plan';
    content.plans[0].priceAmount = '9,999';
    const { cards, table } = await renderBoth(content);

    expect(cards.nativeElement.textContent).toContain('RENAMED Plan');
    expect(cards.nativeElement.textContent).toContain('GH₵9,999');
    expect(table.nativeElement.textContent).toContain('RENAMED Plan');
    expect(table.nativeElement.textContent).toContain('GH₵9,999');
  });

  it('excluded features are announced, not just greyed out', async () => {
    const { cards } = await renderBoth();
    expect(cards.nativeElement.textContent).toContain('Not included');
  });

  it('the comparison table renders one column per plan and the six comparison rows', async () => {
    const { table } = await renderBoth();
    const headers = table.nativeElement.querySelectorAll('thead th');
    expect(headers.length).toBe(4); // feature column + 3 plans
    const rows = table.nativeElement.querySelectorAll('tbody tr');
    expect(rows.length).toBe(7); // 6 comparison rows + base price
  });
});
