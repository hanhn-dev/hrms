import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildValidationRule, validateRow } from "./runner.ts";
import {
  isInStringLength,
  isNumeric,
  isRequired,
  isValidEmail,
} from "./rules.ts";
import { classifyRule } from "./types.ts";

describe("pure validators", () => {
  it("required rejects empty", () => {
    assert.equal(isRequired("")[0], false);
    assert.equal(isRequired("x")[0], true);
  });

  it("stringLength honors min/max", () => {
    assert.equal(isInStringLength("ab", { minLength: 3 })[0], false);
    assert.equal(
      isInStringLength("abcd", { minLength: 2, maxLength: 4 })[0],
      true,
    );
  });

  it("numeric allows digits only", () => {
    assert.equal(isNumeric("12a")[0], false);
    assert.equal(isNumeric("12")[0], true);
  });

  it("email validates shape", () => {
    assert.equal(isValidEmail("a@b.com")[0], true);
    assert.equal(isValidEmail("nope")[0], false);
  });
});

describe("buildValidationRule", () => {
  it("injects required when mandatory", () => {
    const built = buildValidationRule({
      displayText: "Name",
      isMandatory: true,
      validationRule: "[]",
    });
    assert.ok(built.rules.some((r) => r.rule === "required"));
  });

  it("strips required when not mandatory", () => {
    const built = buildValidationRule({
      displayText: "Name",
      isMandatory: false,
      validationRule: JSON.stringify([
        { rule: "required", errorMessage: "need" },
      ]),
    });
    assert.equal(
      built.rules.some((r) => r.rule === "required"),
      false,
    );
  });
});

describe("validateRow", () => {
  it("surfaces field errors inline", () => {
    const result = validateRow(
      { Name: "" },
      [
        {
          displayText: "Name",
          isMandatory: true,
          validationRule: null,
        },
      ],
    );
    assert.equal(result.isValid, false);
    assert.equal(result.errorFields[0]?.fieldName, "Name");
  });

  it("skips contextual rules without failing", () => {
    const result = validateRow(
      { Account: "1" },
      [
        {
          displayText: "Account",
          isMandatory: false,
          validationRule: JSON.stringify([
            { rule: "uniqueDefaultBankAccount", errorMessage: "dup" },
          ]),
        },
      ],
    );
    assert.equal(result.isValid, true);
    assert.ok(result.skippedRules.includes("uniqueDefaultBankAccount"));
  });

  it("fails closed on unknown rules", () => {
    const result = validateRow(
      { X: "1" },
      [
        {
          displayText: "X",
          validationRule: JSON.stringify([
            { rule: "totallyUnknownRule", errorMessage: "bad" },
          ]),
        },
      ],
    );
    assert.equal(result.isValid, false);
  });

  it("runs compareTo across fields", () => {
    const result = validateRow(
      { Start: "01-Jan-2020", End: "01-Jan-2019" },
      [
        {
          displayText: "End",
          validationRule: JSON.stringify([
            {
              rule: "compareTo",
              errorMessage: "End must be after Start",
              params: {
                property: "Start",
                operator: ">=",
                dataType: "date",
              },
            },
          ]),
        },
      ],
    );
    assert.equal(result.isValid, false);
  });
});

describe("classifyRule", () => {
  it("classifies local vs contextual", () => {
    assert.equal(classifyRule("required").capability, "local");
    assert.equal(classifyRule("compareTo").capability, "localCrossField");
    assert.equal(classifyRule("existInDatabase").capability, "serverDb");
    assert.equal(
      classifyRule("employmentType").capability,
      "skippedContextual",
    );
  });
});
