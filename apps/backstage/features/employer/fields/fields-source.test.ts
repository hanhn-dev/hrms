import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { fieldsHref, parseFieldSource } from "./fields-source.ts";

describe("parseFieldSource", () => {
  it("accepts the public tab", () => {
    assert.equal(parseFieldSource("public"), "public");
  });

  it("falls back to employer fields for an unknown source", () => {
    assert.equal(parseFieldSource(undefined), "employer");
    assert.equal(parseFieldSource("nope"), "employer");
  });
});

describe("fieldsHref", () => {
  it("points the public tab at source=public", () => {
    assert.equal(fieldsHref(10, { source: "public" }), "/employers/10/fields?source=public");
  });

  it("keeps a section focus on the public tab", () => {
    assert.equal(
      fieldsHref(10, { source: "public", section: "Personal Details" }),
      "/employers/10/fields?source=public&section=Personal+Details",
    );
  });

  it("omits source for the employer tab", () => {
    assert.equal(fieldsHref(10), "/employers/10/fields");
  });
});
