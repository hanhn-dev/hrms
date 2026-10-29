import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { azureLandingCards } from "./azure-landing-cards.tsx";

describe("azureLandingCards", () => {
  it("gives every card its own color", () => {
    const bars = azureLandingCards.map((card) => card.bar);
    assert.equal(new Set(bars).size, azureLandingCards.length);
    assert.equal(azureLandingCards.length, 6);
  });

  it("keeps a title, description, and destination on every card", () => {
    for (const card of azureLandingCards) {
      assert.ok(card.title.length > 0);
      assert.ok(card.description.length > 0);
      assert.match(card.href, /^\/azure\//);
      assert.match(card.bar, /^bg-/);
    }
  });
});
