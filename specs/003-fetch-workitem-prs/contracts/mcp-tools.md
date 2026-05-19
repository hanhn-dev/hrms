# MCP Tool Contract: Work Item Pull Request Hash Collection

**Phase**: 1 - Design  
**Feature**: [spec.md](../spec.md)  
**Date**: 2026-05-18

This document defines the MCP contract for the new pull-request lookup flow. The contract is intentionally staged so the first response can ask for user choices before the final PR hash list is produced.

## Tools

### `az_get_work_item_pull_requests`

Retrieves pull requests linked to one or more Azure DevOps work items and their descendants, then either asks for refinement inputs or returns the final PR hash summary plus a ready-to-run cherry-pick command for merge commits.

**Input schema**

| Parameter | Type | Required | Validation | Description |
|-----------|------|----------|------------|-------------|
| `ids` | string | Yes | non-empty string | Comma-separated top-level work item IDs, for example `"123, 456,789"` |
| `authors` | string[] | No | distinct non-empty strings | Optional author filters selected after the candidate set is discovered |
| `targetBranches` | string[] | No | distinct non-empty strings | Optional target branch filters |
| `statuses` | string[] | No | distinct non-empty strings | Optional PR status filters using values surfaced in the staged response |
| `sortBy` | string | No | `mergedDate` or `pullRequestId` | Sort field for the final response |
| `sortDirection` | string | No | `asc` or `desc` | Sort direction for the final response |
| `confirmUnfiltered` | boolean | No | boolean | Explicit confirmation that the caller wants the final unfiltered result instead of another staged response |

**Behavior rules**

- The tool supports up to 25 top-level work item IDs per call.
- The tool inspects direct PR links on requested work items and on descendant work items reachable through the child hierarchy, including Tasks and Issues.
- PRs linked through multiple requested or child work items are deduplicated before the final result is built.
- If `authors`, `targetBranches`, `statuses`, and `confirmUnfiltered` are all absent, the tool returns a staged response with totals and follow-up questions instead of the final hash list.
- If any refinement inputs are supplied, or `confirmUnfiltered` is `true`, the tool returns the final filtered or unfiltered PR list.
- The tool always reports work-item-specific issues without discarding results from valid work items.

## Output contract

### Stage 1: refinement required

When no refinement inputs are provided, `content[0].text` contains a JSON-serialized response shaped like:

```json
{
  "stage": "needs_refinement",
  "requestedCount": 3,
  "candidateTotal": 7,
  "matchingTotal": 7,
  "issues": [
    {
      "workItemId": 9999,
      "input": "9999",
      "status": "not_found",
      "message": "Work item 9999 not found"
    }
  ],
  "cherryPick": null,
  "facets": {
    "authors": ["Alice", "Bob"],
    "targetBranches": ["main", "release/2026.05"],
    "statuses": ["active", "completed"],
    "sortFields": ["mergedDate", "pullRequestId"],
    "totalPullRequests": 7
  },
  "questions": [
    {
      "key": "authors",
      "prompt": "Filter by which authors?",
      "options": ["Alice", "Bob"],
      "allowSkip": true,
      "multiSelect": true
    },
    {
      "key": "targetBranches",
      "prompt": "Filter by which target branches?",
      "options": ["main", "release/2026.05"],
      "allowSkip": true,
      "multiSelect": true
    },
    {
      "key": "statuses",
      "prompt": "Filter by which pull request statuses?",
      "options": ["active", "completed"],
      "allowSkip": true,
      "multiSelect": true
    },
    {
      "key": "sortBy",
      "prompt": "Sort the final result by which field?",
      "options": ["mergedDate", "pullRequestId"],
      "allowSkip": true,
      "multiSelect": false
    }
  ],
  "results": null
}
```

This stage is what the agent uses to ask the user:
- which authors to keep
- which target branch or branches to keep
- which statuses to keep
- how to sort before finalizing
- whether to skip filtering and return the whole list

### Stage 2: final result

When refinement inputs are provided or the caller confirms unfiltered finalization, `content[0].text` contains a JSON-serialized response shaped like:

```json
{
  "stage": "complete",
  "requestedCount": 3,
  "candidateTotal": 7,
  "matchingTotal": 2,
  "issues": [],
  "cherryPick": {
    "commitHashes": ["3f1b8e4"],
    "command": "git cherry-pick -m 1 3f1b8e4",
    "skippedPullRequestIds": []
  },
  "facets": null,
  "questions": null,
  "results": [
    {
      "repositoryId": "repo-1",
      "pullRequestId": 42,
      "title": "Complete payroll export fixes",
      "author": "Alice",
      "status": "completed",
      "targetBranch": "main",
      "mergedDate": "2026-05-16T11:20:00Z",
      "url": "https://dev.azure.com/example/project/_git/repo/pullrequest/42",
      "hashes": {
        "mergeCommit": "3f1b8e4",
        "sourceCommit": "bb47ef1",
        "targetCommit": "1d21caa"
      },
      "relatedWorkItemIds": [123, 456],
      "requestedWorkItemIds": [123],
      "childWorkItemIds": [456]
    }
  ]
}
```

If filters remove every candidate pull request, the tool still returns `stage = "complete"` with `candidateTotal` preserved, `matchingTotal = 0`, and `results = []`.

The final response includes a `cherryPick` object built from merge commit hashes only:
- `commitHashes` preserves the final result order for merge commits that can be cherry-picked as merge commits.
- `command` is a ready-to-run `git cherry-pick -m 1 ...` command when at least one merge commit hash is available.
- `skippedPullRequestIds` lists matching PRs that had no merge commit hash, so they were not included in the generated command.

## Error responses

| Scenario | Error message pattern |
|----------|------------------------|
| Empty `ids` input | `"Provide at least one work item ID"` |
| More than 25 top-level IDs | `"A maximum of 25 work item IDs is supported per request"` |
| Azure DevOps work item fetch failure | `"Azure DevOps API error: {message}"` |
| PR hydration failure for the whole request | `"Azure DevOps pull request API error: {message}"` |

## Performance contract

- Requested work items and eligible child work items are fetched in bulk where possible.
- Unique PR references are deduplicated before Git API hydration.
- Filtering and sorting after hydration are performed in memory.
- The staged response always includes the total discovered PR count before filtering, and the final response always includes the total matching PR count after filtering.