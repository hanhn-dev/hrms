import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { resolveUploadSelection } from "./job-selection.ts";

const sections = [
  { uploadSectionId: 1, sectionId: 10, invalid: 0, unprocessed: 0 },
  { uploadSectionId: 2, sectionId: 20, invalid: 3, unprocessed: 0 },
  { uploadSectionId: 3, sectionId: 30, invalid: 0, unprocessed: 4 },
];

describe("resolveUploadSelection", () => {
  it("uses the upload section id when it matches", () => {
    const resolved = resolveUploadSelection({
      sections,
      uploadSectionId: 3,
      sectionId: 10,
      errorClass: "validation",
      invalid: 3,
      unprocessed: 0,
    });
    assert.equal(resolved.section?.uploadSectionId, 3);
    assert.equal(resolved.errorClass, "validation");
  });

  it("falls back to the section id, then the first section with problems", () => {
    const bySectionId = resolveUploadSelection({
      sections,
      uploadSectionId: null,
      sectionId: 20,
      errorClass: "system",
      invalid: 0,
      unprocessed: 0,
    });
    assert.equal(bySectionId.section?.sectionId, 20);

    const firstProblem = resolveUploadSelection({
      sections,
      uploadSectionId: 99,
      sectionId: 99,
      errorClass: "validation",
      invalid: 1,
      unprocessed: 0,
    });
    assert.equal(firstProblem.section?.uploadSectionId, 2);
  });

  it("switches validation to processing when only unprocessed rows remain", () => {
    const resolved = resolveUploadSelection({
      sections,
      uploadSectionId: 1,
      sectionId: null,
      errorClass: "validation",
      invalid: 0,
      unprocessed: 4,
    });
    assert.equal(resolved.errorClass, "processing");
  });

  it("returns no section when the upload has none", () => {
    const resolved = resolveUploadSelection({
      sections: [],
      uploadSectionId: null,
      sectionId: null,
      errorClass: "validation",
      invalid: 0,
      unprocessed: 0,
    });
    assert.equal(resolved.section, null);
    assert.equal(resolved.errorClass, "validation");
  });

  it("resolves combined creation sections via source upload section ids", () => {
    const combined = [
      {
        uploadSectionId: 10,
        sectionId: -2,
        invalid: 0,
        unprocessed: 0,
        sourceUploadSectionIds: [10, 11],
        sourceSectionIds: [1, 14],
      },
    ];
    const bySourceUpload = resolveUploadSelection({
      sections: combined,
      uploadSectionId: 11,
      sectionId: null,
      errorClass: "validation",
      invalid: 0,
      unprocessed: 0,
    });
    assert.equal(bySourceUpload.section?.uploadSectionId, 10);

    const bySourceSection = resolveUploadSelection({
      sections: combined,
      uploadSectionId: null,
      sectionId: 14,
      errorClass: "validation",
      invalid: 0,
      unprocessed: 0,
    });
    assert.equal(bySourceSection.section?.sectionId, -2);
  });
});
