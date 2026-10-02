// @vitest-environment jsdom
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it } from "vitest";
import { SectionFallback } from "./section-fallback.tsx";

describe("SectionFallback", () => {
  it("renders the section title while the slot is loading", () => {
    const html = renderToStaticMarkup(
      createElement(SectionFallback, { title: "Classified row errors" }),
    );
    assert.match(html, /Classified row errors/);
  });
});
