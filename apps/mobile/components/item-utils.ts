export function itemDisplayName(
  item: { nameEn: string | null; nameAr: string | null },
  locale: string,
): string {
  return (locale === "ar" ? item.nameAr : item.nameEn) ?? item.nameAr ?? item.nameEn ?? "—";
}

/**
 * Minimum priced samples before we surface a market-average hint — one lone
 * entry (possibly a typo) shouldn't masquerade as a reliable market price.
 */
export const MIN_PRICE_SAMPLES = 2;

/** The market-average hint string for a unit, or null when not shown. */
export function unitAvgPriceHint(
  unit: { avgPrice?: number | null; sampleCount?: number } | undefined,
): string | null {
  if (!unit || unit.avgPrice == null) return null;
  if ((unit.sampleCount ?? 0) < MIN_PRICE_SAMPLES) return null;
  return Math.round(unit.avgPrice).toString();
}
