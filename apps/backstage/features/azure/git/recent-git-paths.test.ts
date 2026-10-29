import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { rememberRecentGitPath, readRecentGitPaths, type RecentPathStorage } from "./recent-git-paths.ts";

describe("recent git paths", () => {
  it("keeps the newest path first, caps the list, and updates one path in place", () => {
    const storage = memoryStorage();
    for (let index = 0; index < 16; index += 1) {
      rememberRecentGitPath("repo-a", { path: `/src/file-${index}.ts`, historyBranch: "Dev" }, storage);
    }

    rememberRecentGitPath("repo-a", { path: "src/file-15.ts", leftBranch: "Dev", rightBranch: "QA" }, storage);

    const paths = readRecentGitPaths("repo-a", storage);
    assert.equal(paths.length, 15);
    assert.equal(paths[0]?.path, "/src/file-15.ts");
    assert.equal(paths[0]?.historyBranch, "Dev");
    assert.equal(paths[0]?.leftBranch, "Dev");
    assert.equal(paths[0]?.rightBranch, "QA");
    assert.equal(
      paths.some((item) => item.path === "/src/file-0.ts"),
      false,
    );
    assert.deepEqual(readRecentGitPaths("repo-b", storage), []);
  });

  it("ignores bad stored JSON", () => {
    const storage = memoryStorage();
    storage.setItem("backstage.git.recentPaths", "{");
    assert.deepEqual(readRecentGitPaths("repo-a", storage), []);
  });

  it("returns the previous list when storage cannot be written", () => {
    const storage = memoryStorage();
    rememberRecentGitPath("repo-a", { path: "/src/a.ts", historyBranch: "Dev" }, storage);
    const blocked: RecentPathStorage = {
      getItem: (key) => storage.getItem(key),
      setItem: () => {
        throw new Error("full");
      },
    };
    const result = rememberRecentGitPath("repo-a", { path: "/src/b.ts" }, blocked);
    assert.deepEqual(
      result.map((item) => item.path),
      ["/src/a.ts"],
    );
  });
});

function memoryStorage(): RecentPathStorage & { setItem: (key: string, value: string) => void } {
  const data = new Map<string, string>();
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
  };
}
