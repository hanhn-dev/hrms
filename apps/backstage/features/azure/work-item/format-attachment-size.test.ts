import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { formatAttachmentSize } from "./format-attachment-size.ts";

describe("formatAttachmentSize", () => {
  it("returns an em dash for missing or invalid sizes", () => {
    assert.equal(formatAttachmentSize(null), "—");
    assert.equal(formatAttachmentSize(undefined), "—");
    assert.equal(formatAttachmentSize(Number.NaN), "—");
    assert.equal(formatAttachmentSize(-1), "—");
  });

  it("formats bytes, kilobytes, and megabytes", () => {
    assert.equal(formatAttachmentSize(0), "0 B");
    assert.equal(formatAttachmentSize(512), "512 B");
    assert.equal(formatAttachmentSize(1536), "1.5 KB");
    assert.equal(formatAttachmentSize(20 * 1024), "20 KB");
    assert.equal(formatAttachmentSize(1.5 * 1024 * 1024), "1.5 MB");
    assert.equal(formatAttachmentSize(12 * 1024 * 1024), "12 MB");
  });
});
