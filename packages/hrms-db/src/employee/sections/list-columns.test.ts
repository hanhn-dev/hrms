import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { unavailableSectionCounts } from "./list-columns.ts";

describe("unavailableSectionCounts", () => {
  it("marks only the column whose table is missing", () => {
    const present = new Set([
      "TEmployeeSkillDetails",
      "TEmployeeDomainDetails",
      "TEmployeePassportDetails",
      "TEmployeeVisaInfo",
      "TPastEmploymentDetails",
      "TEmployeeBankDetails",
      "TEmployeeNomination",
      "TEducationDetails",
      "TEmployeeFamilyDetails",
      "TEmployeeContactDetails",
      "TEmployeeEmergencyContactDetails",
      "TCertificationDetails",
    ]);
    assert.deepEqual(unavailableSectionCounts(present), [
      {
        feature: "Nominee",
        objectName: "dbo.TEmployeeNominee_Details",
        field: "nomineeCount",
      },
    ]);
  });

  it("returns nothing when every section table exists", () => {
    const present = new Set([
      "TEmployeeSkillDetails",
      "TEmployeeDomainDetails",
      "TEmployeePassportDetails",
      "TEmployeeVisaInfo",
      "TPastEmploymentDetails",
      "TEmployeeBankDetails",
      "TEmployeeNomination",
      "TEducationDetails",
      "TEmployeeFamilyDetails",
      "TEmployeeNominee_Details",
      "TEmployeeContactDetails",
      "TEmployeeEmergencyContactDetails",
      "TCertificationDetails",
    ]);
    assert.deepEqual(unavailableSectionCounts(present), []);
  });
});
