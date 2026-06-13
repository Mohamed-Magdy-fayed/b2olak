import { config } from "dotenv";

config({ path: "../../apps/web/.env" });

async function main() {
  const { seedAdmin } = await import("./admin");
  const { seedCatalog, seedSettings } = await import("./catalog");
  const { seedGeo } = await import("./geo");
  await seedAdmin();
  await seedCatalog();
  await seedSettings();
  await seedGeo();
  console.log("✅ Seed complete.");
  process.exit(0);
}

main().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
