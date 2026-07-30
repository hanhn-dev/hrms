# MCP Tool Contract: Get Pull Request for Review

**Phase**: 1 - Design  
**Feature**: [spec.md](../spec.md)  
**Date**: 2026-07-30

## Tools

### `az_get_pull_request`

Retrieves a single Azure DevOps pull request by numeric ID or HTTPS URL and returns review-ready metadata plus a paginated changed-file payload.

**Input schema**

| Parameter | Type | Required | Validation | Description |
|-----------|------|----------|------------|-------------|
| `pullRequest` | string \| number | Yes | Positive integer, digit-only string, or Azure DevOps PR HTTPS URL | Pull request ID or full PR link |
| `top` | number | No | Integer 1–100; default 50 | Max changed files to return in this page |
| `skip` | number | No | Integer ≥ 0; default 0 | Number of changed files to skip before this page |

**Behavior rules**

- Numeric ID (or digit-only string) lookups use the configured default project (`AZURE_DEVOPS_PROJECT`).
- HTTPS URL lookups must match the configured organization (`AZURE_DEVOPS_ORG_URL`); otherwise the tool returns an error.
- Supported URL shapes include:
  - `https://dev.azure.com/{org}/{project}/_git/{repo}/pullrequest/{id}`
  - `https://{org}.visualstudio.com/{project}/_git/{repo}/pullrequest/{id}`
- Changed files are the cumulative latest-iteration changes against the original baseline (`compareTo = 0`).
- Binary files and text content above 100 KB per side are listed with omission/truncation metadata instead of full unusable payloads.
- Failures for missing or inaccessible PRs return `isError: true` with a human-readable message.

## Output contract

Success: `content[0].text` is JSON shaped like:

```json
{
  "pullRequestId": 501,
  "title": "Fix login validation",
  "description": "Adds null checks.",
  "status": "active",
  "author": "Alice",
  "createdDate": "2026-07-29T10:00:00.000Z",
  "closedDate": null,
  "sourceBranch": "refs/heads/feature/login",
  "targetBranch": "refs/heads/main",
  "url": "https://dev.azure.com/example/Sample%20Project/_git/app/pullrequest/501",
  "projectId": "Sample Project",
  "repositoryId": "repo-guid",
  "repositoryName": "app",
  "hashes": {
    "mergeCommit": null,
    "sourceCommit": "abc123",
    "targetCommit": "def456"
  },
  "reviewers": [
    { "displayName": "Bob", "vote": "approved", "isRequired": true }
  ],
  "commits": [
    { "commitId": "abc123", "comment": "Fix validation", "author": "Alice" }
  ],
  "workItemIds": [135898],
  "iterationId": 2,
  "changes": {
    "totalCount": 12,
    "returnedCount": 2,
    "skip": 0,
    "top": 50,
    "hasMore": true,
    "files": [
      {
        "path": "/src/login.ts",
        "originalPath": null,
        "changeType": "edit",
        "isBinary": false,
        "omission": null,
        "truncation": null,
        "baseContent": "export function login() {}",
        "currentContent": "export function login(user: string) {}",
        "lineDiffBlocks": [
          {
            "changeType": "edit",
            "originalLineNumberStart": 1,
            "originalLinesCount": 1,
            "modifiedLineNumberStart": 1,
            "modifiedLinesCount": 1
          }
        ]
      }
    ]
  }
}
```

Error: `isError: true` and `content[0].text` contains a message such as:

- `Pull request 9999 not found`
- `Pull request URL is outside the configured Azure DevOps organization`
- `Invalid pull request identifier: ...`
