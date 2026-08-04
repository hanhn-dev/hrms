---
sources:
  - .git (Azure DevOps remote, branch names, commit messages)
confidence: high
last-analyzed: 2026-06-26
---

# Branching Strategy

Reconstructed from the git history and remote.

- **Host**: Azure DevOps Repos (`tdgteams-tdgproject.visualstudio.com/TDG HRMS`).
- **Default / integration branch**: `master`.
- **Model**: feature-branch + Pull Request into `master`. Releases come from
  `master` (no separate release/develop branch observed).
- **Branch naming**: by work item — `#<PBI number>` (e.g. `#111201`, `#112611`,
  `#117557`). One branch per Azure DevOps PBI.
- **Merge style**: PRs are merged with a generated subject:
  `Merged PR <n>: <Type>: <description>` where `<Type>` ∈ {`Feat`, `Fix`, ...}
  (e.g. "Merged PR 21787: Feat: New module added for Mobile Management";
  "Merged PR 16723: Fix: added audit table for invalid login attempts").
- **Traceability**: PBI numbers also appear inside SP change-log comment blocks,
  tying a code change to its work item across both the branch and the file.

## Implications for an agent

- Create a branch named for the PBI you're addressing (`#<n>`), not `feature/...`.
- Mirror the commit/PR subject format `<Type>: <description>`.
- When editing a procedure, append a change-log line (`Modified by | Date |
  Reason PBI#<n>`) rather than rewriting the header.

> CI gating on PRs, required reviewers, and protected-branch policy are
> configured in Azure DevOps, not in the repo — see
> `../assumptions/open-questions.md`.
