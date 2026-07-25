package net.jojoaddison.abofonsa.service;

import java.math.BigDecimal;
import java.text.NumberFormat;
import net.jojoaddison.abofonsa.domain.enumeration.Locale;
import org.springframework.stereotype.Component;

/**
 * Formats a plan price's numeric amount for a locale's grouping/decimal conventions (spec §10.5)
 * — currency is always GHS and is never part of this string; the frontend renders the symbol
 * separately via {@code priceCurrency}. Delegates to the JDK's own CLDR data
 * ({@link NumberFormat}) rather than hand-rolling grouping separators per locale.
 */
@Component
public class PriceFormatter {

    public String format(BigDecimal amount, Locale locale) {
        var javaLocale = java.util.Locale.forLanguageTag(locale.code());
        var format = NumberFormat.getIntegerInstance(javaLocale);
        return format.format(amount);
    }
}
