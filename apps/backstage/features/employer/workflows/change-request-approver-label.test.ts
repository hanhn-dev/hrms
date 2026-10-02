import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
  changeRequestApproverSearchValues,
  changeRequestApproverText,
} from "./change-request-approver-label.ts";

describe("changeRequestApproverText", () => {
  it("shows the employment number", () => {
    assert.equal(
      changeRequestApproverText({ name: "Ada", employmentNumber: "00010" }),
      "00010",
    );
  });

  it("returns the name when there is no employment number", () => {
    assert.equal(
      changeRequestApproverText({ name: "Ada", employmentNumber: null }),
      "Ada",
    );
    assert.equal(
      changeRequestApproverText({ name: "Ada", employmentNumber: "  " }),
      "Ada",
    );
  });
});

describe("changeRequestApproverSearchValues", () => {
  it("returns nothing for an empty list", () => {
    assert.deepEqual(changeRequestApproverSearchValues([]), []);
  });

  it("includes each name and employment number", () => {
    assert.deepEqual(
      changeRequestApproverSearchValues([
        { name: "Ada", employmentNumber: "00010" },
        { name: "Grace", employmentNumber: null },
      ]),
      ["Ada", "00010", "Grace"],
    );
  });
});
