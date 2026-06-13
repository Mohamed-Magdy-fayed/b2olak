/** Locale-aware display name for a catalog item or cart line. */
export function itemDisplayName(
  item: { nameEn: string | null; nameAr: string | null },
  locale: string,
): string {
  return (
    (locale === "ar" ? item.nameAr : item.nameEn) ??
    item.nameAr ??
    item.nameEn ??
    "—"
  );
}

type GeoRef = { nameEn: string | null; nameAr: string | null } | null;

/** Pick localised geo name, falling back to snapshot string. */
export function geoName(ref: GeoRef, fallback: string, locale: string): string {
  if (!ref) return fallback;
  return (
    (locale === "ar" ? ref.nameAr : ref.nameEn) ??
    ref.nameAr ??
    ref.nameEn ??
    fallback
  );
}

/** One-line address summary: city › district › area + building. */
export function addressSummary(
  address: {
    city: string;
    area: string;
    street: string;
    building: string | null;
    cityRef: GeoRef;
    districtRef: GeoRef;
    areaRef: GeoRef;
  },
  locale: string,
): string {
  const city = geoName(address.cityRef, address.city, locale);
  const district = geoName(address.districtRef, address.area, locale);
  const area = geoName(address.areaRef, address.street, locale);
  const sep = locale === "ar" ? "، " : ", ";
  const parts = [city, district, area].filter(Boolean).join(sep);
  return address.building ? `${parts}${sep}${address.building}` : parts;
}

/** Short label for an address: custom label → area ref → area snapshot. */
export function addressLabel(
  address: {
    label: string | null;
    area: string;
    areaRef: GeoRef;
  },
  locale: string,
): string {
  if (address.label) return address.label;
  return geoName(address.areaRef, address.area, locale);
}
