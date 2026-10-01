import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
  missingColumnHeading,
  missingColumnLines,
} from "./missing-columns.ts";

const travelDeskEmail = {
  key: "travelDeskEmail",
  label: "Travel Desk Email",
  table: "TTNEEmployerConfiguration",
  column: "TravelDeskEmail",
};

const multipleWorkflow = {
  key: "isMultipleWorkflow",
  label: "Multiple Workflow",
  table: "TTNEEmployerConfiguration",
  column: "IsMultipleWorkflow",
};

describe("missingColumnLines", () => {
  it("returns nothing when no columns are missing", () => {
    assert.deepEqual(missingColumnLines([]), []);
  });

  it("describes one missing column", () => {
    assert.deepEqual(missingColumnLines([travelDeskEmail]), [
      "Travel Desk Email needs dbo.TTNEEmployerConfiguration.TravelDeskEmail, which is not in this database yet.",
    ]);
  });

  it("describes every missing column", () => {
    assert.deepEqual(missingColumnLines([travelDeskEmail, multipleWorkflow]), [
      "Travel Desk Email needs dbo.TTNEEmployerConfiguration.TravelDeskEmail, which is not in this database yet.",
      "Multiple Workflow needs dbo.TTNEEmployerConfiguration.IsMultipleWorkflow, which is not in this database yet.",
    ]);
  });
});

describe("missingColumnHeading", () => {
  it("returns nothing when no columns are missing", () => {
    assert.equal(missingColumnHeading([]), null);
  });

  it("names the single unavailable setting", () => {
    assert.equal(
      missingColumnHeading([travelDeskEmail]),
      "Travel Desk Email is unavailable",
    );
  });

  it("uses a shared heading when several settings are missing", () => {
    assert.equal(
      missingColumnHeading([travelDeskEmail, multipleWorkflow]),
      "Some settings are unavailable",
    );
  });
});
