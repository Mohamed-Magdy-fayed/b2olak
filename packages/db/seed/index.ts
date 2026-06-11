import { config } from "dotenv";

config({ path: "../../apps/web/.env" });

async function main() {
  const { seedAdmin } = await import("./admin");
  await seedAdmin();
  console.log("✅ Seed complete.");
  process.exit(0);
}

main().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
