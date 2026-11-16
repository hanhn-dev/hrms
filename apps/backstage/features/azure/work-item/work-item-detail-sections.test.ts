import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { workItemDetailSections } from "./work-item-detail-sections.ts";

describe("workItemDetailSections", () => {
  it("returns nothing when every field is empty", () => {
    assert.deepEqual(
      workItemDetailSections({
        description: "",
        reproSteps: "",
        acceptanceCriteria: "",
      }),
      [],
    );
  });

  it("omits whitespace-only content", () => {
    assert.deepEqual(
      workItemDetailSections({
        description: "   \n\t  ",
        reproSteps: " ",
        acceptanceCriteria: "\n",
      }),
      [],
    );
  });

  it("returns only Description when that field has content", () => {
    assert.deepEqual(
      workItemDetailSections({
        description: "A short summary.",
        reproSteps: "",
        acceptanceCriteria: "  ",
      }),
      [
        {
          key: "description",
          title: "Description",
          content: "A short summary.",
        },
      ],
    );
  });

  it("returns Description, Repro steps, then Acceptance criteria in order", () => {
    assert.deepEqual(
      workItemDetailSections({
        description: "What to build",
        reproSteps: "1. Open the page",
        acceptanceCriteria: "AC-01: It works",
      }),
      [
        {
          key: "description",
          title: "Description",
          content: "What to build",
        },
        {
          key: "repro-steps",
          title: "Repro steps",
          content: "1. Open the page",
        },
        {
          key: "acceptance-criteria",
          title: "Acceptance criteria",
          content: "AC-01: It works",
        },
      ],
    );
  });
});
