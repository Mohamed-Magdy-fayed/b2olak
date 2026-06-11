import { describe, expect, it } from "vitest";

import { canTransition, isTerminal } from "./order-status";

describe("order status machine", () => {
  it("allows the driver happy path", () => {
    expect(canTransition("assigned", "shopping", "driver")).toBe(true);
    expect(canTransition("shopping", "purchased", "driver")).toBe(true);
    expect(canTransition("purchased", "delivering", "driver")).toBe(true);
    expect(canTransition("delivering", "delivered", "driver")).toBe(true);
  });

  it("only admins assign and reassign", () => {
    expect(canTransition("placed", "assigned", "admin")).toBe(true);
    expect(canTransition("assigned", "assigned", "admin")).toBe(true);
    expect(canTransition("placed", "assigned", "driver")).toBe(false);
    expect(canTransition("placed", "assigned", "customer")).toBe(false);
  });

  it("customers cancel only before shopping starts", () => {
    expect(canTransition("placed", "cancelled", "customer")).toBe(true);
    expect(canTransition("assigned", "cancelled", "customer")).toBe(true);
    expect(canTransition("shopping", "cancelled", "customer")).toBe(false);
    expect(canTransition("delivering", "cancelled", "customer")).toBe(false);
  });

  it("admins cancel any pre-delivered state", () => {
    expect(canTransition("shopping", "cancelled", "admin")).toBe(true);
    expect(canTransition("delivering", "cancelled", "admin")).toBe(true);
    expect(canTransition("delivered", "cancelled", "admin")).toBe(false);
  });

  it("drivers cannot skip states", () => {
    expect(canTransition("assigned", "purchased", "driver")).toBe(false);
    expect(canTransition("shopping", "delivered", "driver")).toBe(false);
  });

  it("terminal states are delivered and cancelled", () => {
    expect(isTerminal("delivered")).toBe(true);
    expect(isTerminal("cancelled")).toBe(true);
    expect(isTerminal("shopping")).toBe(false);
  });
});
