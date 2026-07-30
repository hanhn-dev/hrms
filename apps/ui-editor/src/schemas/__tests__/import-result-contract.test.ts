import { ImportResultSchema } from "../prototype-bundle";

describe("ImportResultSchema", () => {
  it("accepts a successful draft-ready import result", () => {
    expect(() =>
      ImportResultSchema.parse({
        projectId: "proj_123",
        revisionId: "rev_123",
        screenId: "screen_123",
        status: "draft_ready",
        manualReviewCount: 0,
      }),
    ).not.toThrow();
  });

  it("rejects negative manual review counts", () => {
    expect(() =>
      ImportResultSchema.parse({
        projectId: "proj_123",
        revisionId: "rev_123",
        screenId: "screen_123",
        status: "needs_review",
        manualReviewCount: -1,
      }),
    ).toThrow();
  });
});