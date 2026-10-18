// @vitest-environment jsdom
import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { locateSource } from "./locate.ts";

describe("locateSource", () => {
  it("reads the nearest tagged ancestor", () => {
    document.body.innerHTML = `
      <main data-insp-path="apps/backstage/app/page.tsx" data-insp-line="4" data-insp-column="3">
        <button data-insp-path="apps/backstage/app/page.tsx" data-insp-line="8" data-insp-column="5">
          <span id="label">Save</span>
        </button>
      </main>
    `;
    const label = document.getElementById("label");
    assert.ok(label);
    assert.deepEqual(locateSource(label), {
      file: "apps/backstage/app/page.tsx",
      line: 8,
      column: 5,
    });
  });

  it("returns nothing when the node has no source tag", () => {
    document.body.innerHTML = `<div id="plain">Hi</div>`;
    const plain = document.getElementById("plain");
    assert.ok(plain);
    assert.equal(locateSource(plain), null);
  });

  it("returns nothing when the line is not a positive integer", () => {
    document.body.innerHTML = `<div id="bad" data-insp-path="app/page.tsx" data-insp-line="0" data-insp-column="1"></div>`;
    const bad = document.getElementById("bad");
    assert.ok(bad);
    assert.equal(locateSource(bad), null);
  });
});
