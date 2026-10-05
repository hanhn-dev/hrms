import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  activityLabel,
  activityTypeIdsForText,
  humanizeActivityName,
} from "./activity-label.ts";

describe("activityLabel", () => {
  it("prefers the catalog description", () => {
    assert.equal(
      activityLabel({ activityTypeId: 1, description: "Login-Web" }),
      "Login-Web",
    );
  });

  it("names catalog gaps from the web enum", () => {
    assert.equal(
      activityLabel({ activityTypeId: 299, description: null }),
      "Attendance Leave Notifications",
    );
    assert.equal(
      activityLabel({ activityTypeId: 310, description: "  " }),
      "Home Page",
    );
  });

  it("keeps an unknown id visible", () => {
    assert.equal(
      activityLabel({ activityTypeId: 9000, description: null }),
      "Activity 9000",
    );
  });
});

describe("humanizeActivityName", () => {
  it("splits initials from the following word", () => {
    assert.equal(humanizeActivityName("PreApprovalOTReport"), "Pre Approval OT Report");
  });
});

describe("activityTypeIdsForText", () => {
  it("finds home page and ignores a single character", () => {
    assert.ok(activityTypeIdsForText("home page").includes(310));
    assert.deepEqual(activityTypeIdsForText("a"), []);
  });
});
