import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CUSTOMER_SETTING_CATEGORIES,
  CUSTOMER_SETTING_FIELDS,
  compactJsonSetting,
  decodeSettingValue,
  diffCustomerSettingPatch,
  encodeSettingValue,
  parseCategoryPatch,
  requireSettingField,
} from "./catalog.ts";

describe("customer settings catalog", () => {
  it("has unique keys and valid SQL column identifiers", () => {
    const keys = new Set<string>();
    for (const field of CUSTOMER_SETTING_FIELDS) {
      assert.equal(keys.has(field.key), false, `duplicate key ${field.key}`);
      keys.add(field.key);
      assert.match(field.column, /^[A-Za-z_][A-Za-z0-9_]*$/);
    }
  });

  it("maps every category key to a field", () => {
    for (const category of CUSTOMER_SETTING_CATEGORIES) {
      for (const key of category.keys) {
        assert.equal(requireSettingField(key).key, key);
      }
      for (const group of category.groups ?? []) {
        for (const key of group.keys) {
          assert.equal(category.keys.includes(key), true, `${key} missing from ${category.id}`);
        }
      }
    }
  });

  it("encodes Y/N and JSON compactly", () => {
    const cloud = requireSettingField("IsCloudOrOnPremises");
    assert.equal(encodeSettingValue(cloud, true), "Y");
    assert.equal(encodeSettingValue(cloud, false), "N");
    assert.equal(decodeSettingValue(cloud, "Y"), true);
    assert.equal(decodeSettingValue(cloud, "N"), false);
    assert.equal(compactJsonSetting('{"a":1}'), '{"a":1}');
    assert.equal(compactJsonSetting({ a: 1 }), '{"a":1}');
    assert.throws(() => compactJsonSetting("{"), /JSON is invalid/);
  });

  it("diffs only changed keys in a category patch", () => {
    const parsed = parseCategoryPatch("feature", {
      ShowChatModule: true,
      AllowPartialWorkflow: false,
    });
    const preview = diffCustomerSettingPatch(
      { ShowChatModule: true, AllowPartialWorkflow: true },
      parsed,
    );
    assert.equal(preview.length, 1);
    assert.equal(preview[0]?.Key, "AllowPartialWorkflow");
    assert.throws(
      () => parseCategoryPatch("auth", { ShowChatModule: true }),
      /not part of auth/,
    );
  });
});
