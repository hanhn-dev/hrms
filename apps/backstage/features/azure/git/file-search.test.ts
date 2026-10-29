import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { prepareGitPaths, rankGitPathSuggestions, rankGitPaths } from "./file-search.ts";

describe("rankGitPaths", () => {
  it("returns nothing when the query is empty", () => {
    const ranked = rankGitPaths(prepareGitPaths(["/src/a.ts"]), "   ");
    assert.deepEqual(ranked, []);
  });

  it("ranks an exact file name above a directory hit", () => {
    const ranked = rankGitPaths(prepareGitPaths(["/src/panel/notes.ts", "/src/notes/panel.ts"]), "panel");
    assert.equal(ranked[0]?.path, "/src/notes/panel.ts");
    assert.equal(markedText(ranked[0]!), "panel");
  });

  it("matches a fuzzy subsequence", () => {
    const ranked = rankGitPaths(
      prepareGitPaths(["/docs/readme.md", "/apps/compare-file-panel.tsx"]),
      "cmpfile",
    );
    assert.deepEqual(
      ranked.map((item) => item.path),
      ["/apps/compare-file-panel.tsx"],
    );
    assert.equal(markedText(ranked[0]!), "cmpfile");
  });

  it("returns nothing when no path matches", () => {
    assert.deepEqual(rankGitPaths(prepareGitPaths(["/src/a.ts"]), "zzz"), []);
  });

  it("caps the result list", () => {
    const paths = Array.from({ length: 30 }, (_, index) => `/src/file-${index}.ts`);
    assert.equal(rankGitPaths(prepareGitPaths(paths), "file").length, 20);
  });
});

describe("rankGitPathSuggestions", () => {
  it("keeps matching recent paths ahead of the tree and does not repeat them", () => {
    const ranked = rankGitPathSuggestions({
      index: prepareGitPaths(["/src/zebra-panel.ts", "/src/panel.ts"]),
      recents: prepareGitPaths(["/src/old/panel-notes.ts", "/src/panel.ts"]),
      query: "panel",
    });
    assert.deepEqual(
      ranked.map((item) => item.path),
      ["/src/panel.ts", "/src/old/panel-notes.ts", "/src/zebra-panel.ts"],
    );
    assert.equal(ranked[0]?.recent, true);
    assert.equal(ranked[1]?.recent, true);
    assert.equal(ranked[2]?.recent, false);
    assert.equal(ranked.filter((item) => item.path === "/src/panel.ts").length, 1);
  });

  it("lists recent paths when the query is empty and ignores the tree", () => {
    const ranked = rankGitPathSuggestions({
      index: prepareGitPaths(["/src/a.ts"]),
      recents: prepareGitPaths(["/src/recent.ts"]),
      query: "",
    });
    assert.deepEqual(
      ranked.map((item) => item.path),
      ["/src/recent.ts"],
    );
    assert.equal(ranked[0]?.recent, true);
  });
});

function markedText(match: { path: string; ranges: ReadonlyArray<readonly [number, number]> }): string {
  return match.ranges.map(([start, end]) => match.path.slice(start, end)).join("");
}
