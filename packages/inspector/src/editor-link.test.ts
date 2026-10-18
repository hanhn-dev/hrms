// @vitest-environment jsdom
import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { cursorFileUrl, followEditor } from "./editor-link.ts";

describe("cursorFileUrl", () => {
  it("builds a cursor file link that includes the line", () => {
    assert.equal(
      cursorFileUrl("D:\\hrms\\apps\\backstage\\app\\layout.tsx", 25, 5),
      "cursor://file/D:/hrms/apps/backstage/app/layout.tsx:25:5",
    );
  });
});

describe("followEditor", () => {
  it("sends the browser to the cursor link", () => {
    let assigned = "";
    const location = {
      assign(url: string) {
        assigned = url;
      },
    };
    const original = window.location;
    Object.defineProperty(window, "location", { configurable: true, value: location });
    followEditor("D:/hrms/apps/backstage/app/layout.tsx", 25, 5);
    Object.defineProperty(window, "location", { configurable: true, value: original });
    assert.equal(assigned, "cursor://file/D:/hrms/apps/backstage/app/layout.tsx:25:5");
  });
});
