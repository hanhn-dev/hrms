import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, it } from "vitest";
import { currentFlowDocs, flowHref, flowVersions, loadFlowDocs } from "./flow-docs.ts";

const roots: string[] = [];

function makeRoot(): string {
  const root = mkdtempSync(path.join(tmpdir(), "flow-docs-"));
  roots.push(root);
  return root;
}

afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe("loadFlowDocs", () => {
  it("returns nothing when the tree is missing or empty", () => {
    assert.deepEqual(loadFlowDocs(path.join(makeRoot(), "missing")), []);
    assert.deepEqual(loadFlowDocs(makeRoot()), []);
  });

  it("loads one page and strips frontmatter", () => {
    const root = makeRoot();
    writeFileSync(
      path.join(root, "bank-details.md"),
      [
        "---",
        "feature: Bank Details",
        "last-analyzed: 2026-10-09",
        "---",
        "",
        "# Bank Details",
        "",
        "Traces the Bank Details request.",
        "",
      ].join("\r\n"),
      "utf8",
    );

    const docs = loadFlowDocs(root);
    assert.equal(docs.length, 1);
    assert.deepEqual(docs[0]?.slug, ["bank-details"]);
    assert.deepEqual(docs[0]?.currentSlug, ["bank-details"]);
    assert.equal(docs[0]?.title, "Bank Details");
    assert.equal(docs[0]?.feature, "Bank Details");
    assert.equal(docs[0]?.content.startsWith("# Bank Details"), true);
    assert.equal(docs[0]?.content.includes("feature:"), false);
    assert.equal(docs[0]?.isArchive, false);
    assert.equal(docs[0]?.lastAnalyzed, "2026-10-09");
  });

  it("ignores non-markdown files such as flow-graph.json", () => {
    const root = makeRoot();
    writeFileSync(path.join(root, "flow-graph.json"), "{}", "utf8");
    assert.deepEqual(loadFlowDocs(root), []);
  });

  it("keeps dated snapshots out of the latest list and offers them as versions", () => {
    const root = makeRoot();
    mkdirSync(path.join(root, "bank-details"), { recursive: true });
    writeFileSync(
      path.join(root, "bank-details.md"),
      "---\nlast-analyzed: 2026-10-09\n---\n# Bank Details\n\nLatest.\n",
      "utf8",
    );
    writeFileSync(
      path.join(root, "bank-details", "2026-10-01.md"),
      "---\nlast-analyzed: 2026-10-01\n---\n# Bank Details\n\nOlder.\n",
      "utf8",
    );

    const docs = loadFlowDocs(root);
    const latest = currentFlowDocs(docs);
    assert.deepEqual(
      latest.map((doc) => doc.objectName),
      ["bank-details"],
    );
    assert.equal(latest[0]?.lastAnalyzed, "2026-10-09");
    assert.equal(docs.some((doc) => doc.isArchive && doc.content.includes("Older.")), true);

    const versions = flowVersions(docs, ["bank-details"]);
    assert.deepEqual(
      versions.map((version) => version.date),
      ["2026-10-09", "2026-10-01"],
    );
    assert.equal(versions[0]?.current, true);
    assert.equal(versions[0]?.href, "/docs/flows/bank-details");
    assert.equal(versions[1]?.href, "/docs/flows/bank-details/2026-10-01");
  });
});

describe("flowHref", () => {
  it("joins and encodes slug segments", () => {
    assert.equal(flowHref(["bank-details"]), "/docs/flows/bank-details");
    assert.equal(flowHref(["bank-details", "2026-10-01"]), "/docs/flows/bank-details/2026-10-01");
  });
});
