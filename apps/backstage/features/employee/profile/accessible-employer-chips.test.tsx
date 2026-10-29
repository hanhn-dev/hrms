// @vitest-environment jsdom
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it } from "vitest";
import { AccessibleEmployerChips } from "./accessible-employer-chips.tsx";

describe("AccessibleEmployerChips", () => {
  it("renders each employer as a chip and links the ones that are not applied", () => {
    const html = renderToStaticMarkup(
      createElement(AccessibleEmployerChips, {
        employers: [
          { employerId: 20, label: "Birch", applied: true },
          { employerId: 10, label: "Alder", applied: false },
        ],
      }),
    );

    assert.match(html, /Birch · Applied/);
    assert.match(html, /href="\/employers\/10"/);
    assert.match(html, />Alder</);
    assert.doesNotMatch(html, /href="\/employers\/20"/);
  });

  it("renders a dash when the employee can access no employers", () => {
    const html = renderToStaticMarkup(
      createElement(AccessibleEmployerChips, { employers: [] }),
    );
    assert.equal(html, "—");
  });
});
