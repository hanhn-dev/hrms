import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
  buildGitBlameUrl,
  buildGitCommitUrl,
  buildGitPullRequestUrl,
  buildGitWorkItemUrl,
} from "./git-links.ts";

describe("git links", () => {
  it("builds an Azure DevOps annotate link for a file on a branch", () => {
    const url = buildGitBlameUrl({
      organizationUrl: "https://dev.azure.com/example/",
      project: "Sample Project",
      repositoryName: "HRMS",
      path: "/src/a b.ts",
      branch: "release/2026.05",
    });
    assert.equal(
      url,
      "https://dev.azure.com/example/Sample%20Project/_git/HRMS#path=%2Fsrc%2Fa%20b.ts&version=GBrelease%2F2026.05&annotate=true",
    );
  });

  it("builds commit and work item links", () => {
    assert.equal(
      buildGitCommitUrl({
        organizationUrl: "https://dev.azure.com/example",
        project: "Sample Project",
        repositoryName: "HRMS",
        commitId: "abc1234",
      }),
      "https://dev.azure.com/example/Sample%20Project/_git/HRMS/commit/abc1234",
    );
    assert.equal(
      buildGitWorkItemUrl("https://dev.azure.com/example/", "Sample Project", 162833),
      "https://dev.azure.com/example/Sample%20Project/_workitems/edit/162833",
    );
    assert.equal(
      buildGitPullRequestUrl({
        organizationUrl: "https://dev.azure.com/example",
        project: "Sample Project",
        repositoryName: "TDG HRMS",
        pullRequestId: 33699,
      }),
      "https://dev.azure.com/example/Sample%20Project/_git/TDG%20HRMS/pullrequest/33699",
    );
  });
});
