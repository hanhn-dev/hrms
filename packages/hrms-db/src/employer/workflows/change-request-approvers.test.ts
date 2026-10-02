import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  pickChangeRequestApprovers,
  type ChangeRequestQueueActor,
} from "./change-request-approvers.ts";

function actor(patch: Partial<ChangeRequestQueueActor> = {}): ChangeRequestQueueActor {
  return {
    approveStatus: "P",
    approvalLevel: 1,
    managerId: 10,
    managerName: "Ada Lovelace",
    managerEmploymentNumber: "E010",
    updatedBy: null,
    updatedByName: null,
    updatedByEmploymentNumber: null,
    ...patch,
  };
}

describe("pickChangeRequestApprovers", () => {
  it("returns nothing when the queue is empty", () => {
    assert.deepEqual(pickChangeRequestApprovers([]), []);
  });

  it("uses every pending manager and ignores earlier completed steps", () => {
    assert.deepEqual(
      pickChangeRequestApprovers([
        actor({
          approveStatus: "C",
          approvalLevel: 1,
          managerId: 1,
          managerName: "Earlier",
          updatedBy: 9,
          updatedByName: "Closer",
        }),
        actor({
          approveStatus: " P ",
          approvalLevel: 2,
          managerId: 20,
          managerName: "Grace",
          managerEmploymentNumber: "E020",
        }),
        actor({
          approveStatus: "P",
          approvalLevel: 2,
          managerId: 21,
          managerName: "  ",
          managerEmploymentNumber: "  ",
        }),
        actor({
          approveStatus: "P",
          approvalLevel: 2,
          managerId: 20,
          managerName: "Grace again",
        }),
        actor({ approveStatus: "P", managerId: 0, managerName: "Nobody" }),
        actor({ approveStatus: "P", managerId: null }),
      ]),
      [
        { employeeId: 20, name: "Grace", employmentNumber: "E020" },
        { employeeId: 21, name: "Employee 21", employmentNumber: null },
      ],
    );
  });

  it("uses who closed the highest level, falling back to the assigned manager", () => {
    assert.deepEqual(
      pickChangeRequestApprovers([
        actor({
          approveStatus: "C",
          approvalLevel: 1,
          managerId: 1,
          managerName: "Level one",
          updatedBy: 8,
          updatedByName: "First closer",
          updatedByEmploymentNumber: "E008",
        }),
        actor({
          approveStatus: "C",
          approvalLevel: 2,
          managerId: 2,
          managerName: "Assigned",
          managerEmploymentNumber: "E002",
          updatedBy: 30,
          updatedByName: "Final",
          updatedByEmploymentNumber: "E030",
        }),
        actor({
          approveStatus: "R",
          approvalLevel: 2,
          managerId: 4,
          managerName: "Rejected by role",
          managerEmploymentNumber: "E004",
          updatedBy: null,
        }),
        actor({
          approveStatus: "B",
          approvalLevel: 3,
          managerId: 99,
          managerName: "Pullback",
          updatedBy: 99,
          updatedByName: "Pullback",
        }),
        actor({
          approveStatus: "C",
          approvalLevel: null,
          managerId: 5,
          managerName: "Unleveled",
        }),
      ]),
      [
        { employeeId: 30, name: "Final", employmentNumber: "E030" },
        { employeeId: 4, name: "Rejected by role", employmentNumber: "E004" },
      ],
    );
  });

  it("returns nothing when a pending row has no assignee", () => {
    assert.deepEqual(
      pickChangeRequestApprovers([
        actor({ approveStatus: "P", managerId: 0 }),
        actor({
          approveStatus: "C",
          managerId: 7,
          managerName: "Should not show",
          updatedBy: 7,
          updatedByName: "Should not show",
        }),
      ]),
      [],
    );
  });
});
