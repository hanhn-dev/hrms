import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  VALIDATION_RULE_MAX_LENGTH,
  parseValidationRuleJson,
  validateValidationRuleValue,
} from "./validation-rule.ts";

describe("parseValidationRuleJson", () => {
  it("clears empty or whitespace input to null (positive)", () => {
    assert.deepEqual(parseValidationRuleJson(""), {
      ok: true,
      compact: null,
      parsed: null,
    });
    assert.deepEqual(parseValidationRuleJson("   \n"), {
      ok: true,
      compact: null,
      parsed: null,
    });
    assert.deepEqual(parseValidationRuleJson(null), {
      ok: true,
      compact: null,
      parsed: null,
    });
  });

  it("rejects malformed JSON (negative)", () => {
    const result = parseValidationRuleJson('[{"rule":');
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.error, "ValidationRule JSON is malformed.");
    }
  });

  it("rejects a non-array payload (negative)", () => {
    const result = parseValidationRuleJson('{"rule":"required"}');
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.error, "ValidationRule JSON must be an array.");
    }
  });

  it("rejects array items that are not objects (negative)", () => {
    const primitives = parseValidationRuleJson("[1,2]");
    assert.equal(primitives.ok, false);
    if (!primitives.ok) {
      assert.equal(primitives.error, "Each ValidationRule item must be an object.");
    }
    const nested = parseValidationRuleJson("[[]]");
    assert.equal(nested.ok, false);
  });

  it("rejects compact JSON longer than 1000 characters (edge)", () => {
    const item = { rule: "pattern", params: { pattern: "x".repeat(980) } };
    const compact = JSON.stringify([item]);
    assert.ok(compact.length > VALIDATION_RULE_MAX_LENGTH);
    const result = parseValidationRuleJson(compact);
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(
        result.error,
        `ValidationRule must be at most ${VALIDATION_RULE_MAX_LENGTH} characters.`,
      );
    }
  });

  it("pretty-prints then compacts back to the stored form (positive)", () => {
    const stored = '[{"rule":"required","params":{"allowedNull":true}}]';
    const pretty = JSON.stringify(JSON.parse(stored), null, 2);
    const result = parseValidationRuleJson(pretty);
    assert.deepEqual(result, {
      ok: true,
      compact: stored,
      parsed: [{ rule: "required", params: { allowedNull: true } }],
    });
  });
});

describe("validateValidationRuleValue", () => {
  it("accepts null as a clear (edge)", () => {
    assert.deepEqual(validateValidationRuleValue(null), {
      ok: true,
      compact: null,
      parsed: null,
    });
  });

  it("accepts an empty rule array (edge)", () => {
    assert.deepEqual(validateValidationRuleValue([]), {
      ok: true,
      compact: "[]",
      parsed: [],
    });
  });
});
