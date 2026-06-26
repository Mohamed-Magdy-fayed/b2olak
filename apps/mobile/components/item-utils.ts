export function itemDisplayName(
  item: { nameEn: string | null; nameAr: string | null },
  locale: string,
): string {
  return (locale === "ar" ? item.nameAr : item.nameEn) ?? item.nameAr ?? item.nameEn ?? "—";
}
