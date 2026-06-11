/**
 * Barrel export of all Drizzle schemas.
 * Domains land with their phases (docs/08-file-structure.md):
 * - catalog/, system/ → Phase 4
 * - orders/          → Phase 6
 */

export * from "./schemas/auth/users";
export * from "./schemas/auth/user-credentials";
export * from "./schemas/auth/user-tokens";
export * from "./schemas/drivers/driver-profiles";
export * from "./schemas/catalog/categories";
export * from "./schemas/catalog/items";
export * from "./schemas/catalog/item-aliases";
export * from "./schemas/system/system-settings";
