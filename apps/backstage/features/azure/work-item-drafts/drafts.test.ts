import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, it } from "vitest";
import {
  findPendingDraftForObject,
  getDraft,
  listDrafts,
  markDraftPublished,
  markDraftRejected,
  writeDraft,
  type WorkItemDraft,
} from "./drafts.ts";

const roots: string[] = [];

function makeDraftsDir(): string {
  const root = mkdtempSync(path.join(tmpdir(), "work-item-drafts-"));
  roots.push(root);
  return root;
}

function baseDraft(overrides: Partial<WorkItemDraft> = {}): WorkItemDraft {
  const createdAt = "2026-10-22T10:00:00.000Z";
  return {
    id: "11111111-1111-4111-8111-111111111111",
    status: "pending",
    createdAt,
    updatedAt: createdAt,
    objectName: "SP_Example",
    objectType: "procedure",
    databaseSlug: "hrms",
    sourcePath: "D:/TDG HRMS DB/HRMS-DATABASE/HRMS/STOREPROCEDURE/SP_Example.sql",
    title: "SQL performance: SP_Example (hrms)",
    type: "Product Backlog Item",
    description:
      "## Summary\nSlow scan.\n## Investigation — performance issues\n...\n## Investigation — bad practices\n...\n## Proposed rewrite\n...\n## Comparison (current vs proposed)\n...\n## Concrete solution\n...\n## Risks and behavior parity\n...\n## Reference\n...",
    acceptanceCriteria: "- Parity with current result set\n- No SELECT *",
    tags: ["sql-performance", "procedure"],
    ...overrides,
  };
}

afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe("work-item-drafts store", () => {
  it("returns nothing for an empty directory", () => {
    const dir = makeDraftsDir();
    assert.deepEqual(listDrafts(dir), []);
    assert.equal(getDraft("11111111-1111-4111-8111-111111111111", dir), undefined);
  });

  it("writes and reads a draft", () => {
    const dir = makeDraftsDir();
    const draft = baseDraft();
    writeDraft(draft, dir);
    assert.deepEqual(getDraft(draft.id, dir), draft);
  });

  it("lists pending drafts before others and newest first", () => {
    const dir = makeDraftsDir();
    writeDraft(
      baseDraft({
        id: "22222222-2222-4222-8222-222222222222",
        status: "published",
        createdAt: "2026-10-22T12:00:00.000Z",
        updatedAt: "2026-10-22T12:00:00.000Z",
        adoWorkItemId: 99,
        publishedAt: "2026-10-22T12:00:00.000Z",
      }),
      dir,
    );
    writeDraft(
      baseDraft({
        id: "33333333-3333-4333-8333-333333333333",
        createdAt: "2026-10-22T11:00:00.000Z",
        updatedAt: "2026-10-22T11:00:00.000Z",
        objectName: "SP_Older",
        title: "SQL performance: SP_Older (hrms)",
      }),
      dir,
    );
    writeDraft(
      baseDraft({
        id: "44444444-4444-4444-8444-444444444444",
        createdAt: "2026-10-22T13:00:00.000Z",
        updatedAt: "2026-10-22T13:00:00.000Z",
        objectName: "SP_Newer",
        title: "SQL performance: SP_Newer (hrms)",
      }),
      dir,
    );

    const listed = listDrafts(dir);
    assert.equal(listed[0]?.id, "44444444-4444-4444-8444-444444444444");
    assert.equal(listed[1]?.id, "33333333-3333-4333-8333-333333333333");
    assert.equal(listed[2]?.status, "published");
  });

  it("finds a pending draft for the same object", () => {
    const dir = makeDraftsDir();
    writeDraft(baseDraft(), dir);
    writeDraft(
      baseDraft({
        id: "55555555-5555-4555-8555-555555555555",
        status: "rejected",
        objectName: "SP_Example",
      }),
      dir,
    );
    const found = findPendingDraftForObject("hrms", "SP_Example", dir);
    assert.equal(found?.id, "11111111-1111-4111-8111-111111111111");
    assert.equal(findPendingDraftForObject("hrms", "SP_Other", dir), undefined);
  });

  it("marks a pending draft published", () => {
    const dir = makeDraftsDir();
    writeDraft(baseDraft(), dir);
    const next = markDraftPublished("11111111-1111-4111-8111-111111111111", 12345, dir);
    assert.equal(next.status, "published");
    assert.equal(next.adoWorkItemId, 12345);
    assert.ok(next.publishedAt);
  });

  it("marks a pending draft rejected", () => {
    const dir = makeDraftsDir();
    writeDraft(baseDraft(), dir);
    const next = markDraftRejected(
      "11111111-1111-4111-8111-111111111111",
      "Not needed",
      dir,
    );
    assert.equal(next.status, "rejected");
    assert.equal(next.rejectReason, "Not needed");
  });

  it("refuses to publish a non-pending draft", () => {
    const dir = makeDraftsDir();
    writeDraft(baseDraft({ status: "rejected" }), dir);
    assert.throws(
      () => markDraftPublished("11111111-1111-4111-8111-111111111111", 1, dir),
      /Only pending drafts can be published/,
    );
  });

  it("returns undefined for a corrupt draft file instead of throwing from getDraft", () => {
    const dir = makeDraftsDir();
    const id = "66666666-6666-4666-8666-666666666666";
    writeFileSync(path.join(dir, `${id}.json`), '{"id":"not-a-uuid"}\n', "utf8");
    assert.equal(getDraft(id, dir), undefined);
    assert.deepEqual(listDrafts(dir), []);
  });
});
