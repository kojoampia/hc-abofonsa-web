import { Pipe, PipeTransform, inject } from '@angular/core';
import { LocaleService } from '../../core/i18n/locale.service';
import { Plan } from '../../core/api/site-content.model';

/**
 * Renders a plan price per spec §10.5: the amount arrives pre-formatted for the locale from the
 * API; this pipe only places the GH₵ symbol — leading for English, trailing for es/fr/de. The
 * currency never changes with the language: a German-speaking visitor still pays cedis.
 */
@Pipe({ name: 'planPrice', pure: false })
export class PlanPricePipe implements PipeTransform {
  private readonly locale = inject(LocaleService);

  transform(plan: Pick<Plan, 'priceAmount' | 'priceCurrency'>): string {
    const symbol = plan.priceCurrency === 'GHS' ? 'GH₵' : plan.priceCurrency;
    return this.locale.current() === 'en'
      ? `${symbol}${plan.priceAmount}`
      : `${plan.priceAmount} ${symbol}`;
  }
}
