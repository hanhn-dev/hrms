import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { toDataTableSearchProps } from "./server-search.ts";

describe("toDataTableSearchProps", () => {
  it("forwards searchQuery and onSearch to DataTable", () => {
    function onSearch(_query: string): void {
      return;
    }
    assert.deepEqual(toDataTableSearchProps({ searchQuery: "Language", onSearch }), {
      searchQuery: "Language",
      onSearch,
    });
  });

  it("defaults a missing searchQuery to an empty string", () => {
    assert.deepEqual(toDataTableSearchProps({}), {
      searchQuery: "",
      onSearch: undefined,
    });
  });
});
