import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
  mergeRelatedTabs,
  scriptTabKey,
  type OpenScriptTab,
  type RelatedScriptRef,
} from "./script-relations.ts";

function createTab(item: RelatedScriptRef, relation: OpenScriptTab["relation"]): OpenScriptTab {
  return {
    key: scriptTabKey(item.kind, item.schema, item.name),
    schema: item.schema,
    name: item.name,
    relation,
  };
}

describe("mergeRelatedTabs", () => {
  const source = { role: "caller" as const, schema: "dbo", name: "SP_Root" };

  it("leaves the tabs unchanged when nothing calls the script", () => {
    const tabs = [{ key: "storedprocedure:dbo.sp_root", schema: "dbo", name: "SP_Root" }];
    const merged = mergeRelatedTabs(tabs, { items: [], total: 0, truncated: false }, source, createTab);
    assert.equal(merged.opened, 0);
    assert.equal(merged.recolored, 0);
    assert.equal(merged.tabs.length, 1);
    assert.equal(merged.tabs[0]?.relation, undefined);
    assert.equal(merged.message.tone, "info");
    assert.match(merged.message.text, /No procedures, functions, or views call dbo.SP_Root/);
  });

  it("appends a new caller and leaves the source tab uncolored", () => {
    const tabs = [{ key: "storedprocedure:dbo.sp_root", schema: "dbo", name: "SP_Root" }];
    const merged = mergeRelatedTabs(
      tabs,
      {
        items: [
          { schema: "dbo", name: "SP_Root", kind: "storedProcedure", depth: 1 },
          { schema: "dbo", name: "SP_Caller", kind: "storedProcedure", depth: 1 },
        ],
        total: 2,
        truncated: false,
      },
      source,
      createTab,
    );
    assert.equal(merged.opened, 1);
    assert.equal(merged.tabs.length, 2);
    assert.equal(merged.tabs[0]?.relation, undefined);
    assert.equal(merged.tabs[1]?.key, "storedprocedure:dbo.sp_caller");
    assert.deepEqual(merged.tabs[1]?.relation, {
      role: "caller",
      viaSchema: "dbo",
      viaName: "SP_Root",
      depth: 1,
    });
    assert.equal(merged.message.tone, "success");
    assert.match(merged.message.text, /Opened 1 caller of dbo.SP_Root/);
  });

  it("recolors a tab that is already open", () => {
    const tabs = [
      { key: "storedprocedure:dbo.sp_root", schema: "dbo", name: "SP_Root" },
      { key: "storedprocedure:dbo.sp_child", schema: "dbo", name: "SP_Child" },
    ];
    const merged = mergeRelatedTabs(
      tabs,
      {
        items: [{ schema: "dbo", name: "SP_Child", kind: "function", depth: 2 }],
        total: 1,
        truncated: false,
      },
      { role: "nested", schema: "dbo", name: "SP_Root" },
      createTab,
    );
    assert.equal(merged.opened, 0);
    assert.equal(merged.recolored, 1);
    assert.equal(merged.tabs.length, 2);
    assert.equal(merged.tabs[1]?.key, "storedprocedure:dbo.sp_child");
    assert.deepEqual(merged.tabs[1]?.relation, {
      role: "nested",
      viaSchema: "dbo",
      viaName: "SP_Root",
      depth: 2,
    });
    assert.match(merged.message.text, /already open/);
  });

  it("names how many objects were left out when the list is capped", () => {
    const items = Array.from({ length: 40 }, (_, index) => ({
      schema: "dbo",
      name: `SP_${index}`,
      kind: "storedProcedure" as const,
      depth: 1,
    }));
    const merged = mergeRelatedTabs(
      [],
      { items, total: 140, truncated: true },
      { role: "nested", schema: "dbo", name: "SP_Root" },
      createTab,
    );
    assert.equal(merged.opened, 40);
    assert.equal(merged.tabs.length, 40);
    assert.equal(merged.message.tone, "warning");
    assert.match(merged.message.text, /nearest 40 of 140 nested calls from dbo.SP_Root/);
    assert.match(merged.message.text, /100 were left out/);
  });
});
