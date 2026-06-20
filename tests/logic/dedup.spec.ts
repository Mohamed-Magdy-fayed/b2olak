import { expect, test } from "@playwright/test";

import {
  AUTO_MERGE_MIN_SIMILARITY,
  decideItemMerge,
} from "@workspace/validators/dedup";

test.describe("decideItemMerge — reconcile AI verdict + trigram similarity", () => {
  test("auto-merges a confident match at or above the threshold", () => {
    expect(
      decideItemMerge({
        verdict: "match",
        matchedItemId: "a",
        similarity: AUTO_MERGE_MIN_SIMILARITY,
      }),
    ).toBe("merge");
    expect(
      decideItemMerge({ verdict: "match", matchedItemId: "a", similarity: 0.95 }),
    ).toBe("merge");
  });

  test("routes a low-similarity match to the admin queue", () => {
    expect(
      decideItemMerge({ verdict: "match", matchedItemId: "a", similarity: 0.69 }),
    ).toBe("pending");
  });

  test("never auto-merges a match with no candidate id", () => {
    expect(
      decideItemMerge({ verdict: "match", matchedItemId: null, similarity: 0.99 }),
    ).toBe("pending");
  });

  test("approves a no_match as its own catalog item", () => {
    expect(
      decideItemMerge({ verdict: "no_match", matchedItemId: null, similarity: 0 }),
    ).toBe("approve");
  });

  test("routes unsure to the admin queue regardless of similarity", () => {
    expect(
      decideItemMerge({ verdict: "unsure", matchedItemId: "a", similarity: 1 }),
    ).toBe("pending");
  });
});
