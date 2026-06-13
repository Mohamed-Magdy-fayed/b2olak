import { db } from "../src/client";
import { AreasTable } from "../src/schemas/geo/areas";
import { CitiesTable } from "../src/schemas/geo/cities";
import { DistrictsTable } from "../src/schemas/geo/districts";

/**
 * Sample delivery coverage — placeholder names meant to be edited/extended by
 * the team in Admin → Coverage areas before launch.
 */
const coverage = [
  {
    en: "Obour City",
    ar: "مدينة العبور",
    districts: [
      {
        en: "District 14",
        ar: "الحي الرابع عشر",
        areas: [
          { en: "El Fayrouz", ar: "الفيروز" },
          { en: "El Masra", ar: "الماسة" }, 
          { en: "El Lulua", ar: "اللؤلؤة" }, 
        ],
      },
      {
        en: "District 13",
        ar: "الحي الثالث عشر",
        areas: [
          { en: "ُEl Yakout", ar: "الياقوت" },
          { en: "El Wahaa", ar: "الواحة" }, 
        ],
      },
    ],
  },
] as const;

export async function seedGeo() {
  const existing = await db.query.CitiesTable.findFirst();
  if (existing) {
    console.log(existing);
    
    console.log("Geo coverage already seeded — skipping.");
    return;
  }

  for (const [cityIndex, city] of coverage.entries()) {
    const [cityRow] = await db
      .insert(CitiesTable)
      .values({
        nameEn: city.en,
        nameAr: city.ar,
        sortOrder: cityIndex,
        createdBy: "seed",
      })
      .returning();
    if (!cityRow) continue;

    for (const [districtIndex, district] of city.districts.entries()) {
      const [districtRow] = await db
        .insert(DistrictsTable)
        .values({
          cityId: cityRow.id,
          nameEn: district.en,
          nameAr: district.ar,
          sortOrder: districtIndex,
          createdBy: "seed",
        })
        .returning();
      if (!districtRow) continue;

      for (const [areaIndex, area] of district.areas.entries()) {
        await db.insert(AreasTable).values({
          districtId: districtRow.id,
          nameEn: area.en,
          nameAr: area.ar,
          sortOrder: areaIndex,
          createdBy: "seed",
        });
      }
    }
  }

  console.log("Geo coverage seeded (sample — edit in Admin → Coverage areas).");
}
