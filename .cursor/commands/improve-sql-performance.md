---
name: improve-sql-performance
description: Investigate one HRMS SQL object for performance issues, propose a rewrite, compare current vs proposed, then write a Backstage draft Product Backlog Item for database developers to review before Azure DevOps publish.
argument-hint: "<object name> [database-slug]"
---

# Command: improve-sql-performance

## Context

Business logic lives in SQL under `d:\TDG HRMS DB\HRMS-DATABASE\<Database>\`.
Read those scripts. Do **not** modify SQL in the database repository.
Do **not** create an Azure DevOps work item from the agent.

Output home (pending draft only):

```
d:\hrms\apps\backstage\content\azure\_work-item-drafts\<uuid>.json
```

A root admin reviews drafts at `/azure/work-item-drafts` and publishes to Azure
DevOps from Backstage. The agent only writes the draft file.

## Task

Given an object name (`$ARGUMENTS`, or the text after `/improve-sql-performance`),
read its script, investigate performance, propose a rewrite, compare current vs
proposed, choose a concrete solution, and write one pending draft work item whose
description contains the full investigation for database developers.

If the name is empty, stop and ask for one. Do not execute the object.

## Database slugs

Map the `HRMS-DATABASE` folder to the slug used by `content/wiki/baseline-*.md`:

| Folder | Slug |
|---|---|
| `HRMS` | `hrms` |
| `HRMS-TRAINING` | `hrms-training` |
| `HRMS-SURVEY` | `hrms-survey` |
| `HRMS_TRAVELNEXPENSE` | `hrms-travelnexpense` |
| `HRMS-RESOURCEALLOCATION` | `hrms-resourceallocation` |
| `HRM-TIMEPORT` | `hrm-timeport` |
| `HRMS-CRBBOOKING` | `hrms-crbbooking` |
| `HRMS-TranslationService` | `hrms-translationservice` |
| `HRMS-RewardNRecognition` | `hrms-rewardnrecognition` |
| `HRM-VMS` | `hrm-vms` |

If the same object name exists in more than one database, stop and ask which one.
If `$ARGUMENTS` includes a second token that matches a slug, use that database.

## Steps

1. **Resolve the script.** Search that database for the object name:
   - Procedures: `STOREPROCEDURE/` and `Stored Procedures/`
   - Functions: `FUNCTIONS/`
   - Views: `VIEWS/` and `Views/`
   Prefer the `sqlFile` path on the newest matching changeSet in
   `changelog/baseline-inventory-storeprocedure.xml`,
   `changelog/baseline-inventory-stored-procedures.xml`,
   `changelog/baseline-inventory-functions.xml`, or
   `changelog/baseline-inventory-views.xml` when present.
   If it is not inventoried, use the copy whose parent folder is
   `STOREPROCEDURE`, `Stored Procedures`, `FUNCTIONS`, `VIEWS`, or `Views`.
   Skip a numeric work-item folder such as `172636_173535`.

2. **Pending-draft collision.** List
   `apps/backstage/content/azure/_work-item-drafts/*.json`. If any draft with
   `status: "pending"` already has the same `databaseSlug` + `objectName`, stop
   and ask whether to replace it. On replace, delete or mark that draft
   `rejected` with reason `superseded`, then continue. Do not write a second
   pending draft for the same object.

3. **Investigate (required order).** Work from the script only. Audience:
   database developers. Tie every claim to the script; call out assumptions.

   Analyze for: non-SARGable predicates, `SELECT *`, cursors, nested loops /
   RBAR, temp table vs table-variable misuse, implicit conversions, lock-hint
   abuse, unbounded result sets, redundant joins/subqueries, missing-index
   *suggestions only* (no live `SET STATISTICS` unless the user asks).

   Produce content in this order — all of it goes into the draft `description`:

   1. Findings / performance issues (severity + script evidence)
   2. Bad practices
   3. Proposed rewrite (SQL in fenced blocks — full object when practical,
      else each changed hot path). Preserve parameters and behavior unless an
      intentional contract change is called out.
   4. Comparison: current vs proposed — what differs, expected benefit, risks /
      trade-offs. Do this **before** locking one recommendation.
   5. Concrete solution — the chosen change set after comparison (not a vague
      “consider indexing”)
   6. Risks and behavior parity
   7. Reference (object, database slug, source path)

4. **Write the draft JSON.** Create a new UUID file under
   `apps/backstage/content/azure/_work-item-drafts/<uuid>.json` with:

   - `id`: the UUID
   - `status`: `"pending"`
   - `createdAt` / `updatedAt`: ISO-8601 with offset
   - `objectName`, `objectType` (`procedure` | `view` | `function`),
     `databaseSlug`, `sourcePath` (absolute or repo-relative path to the SQL)
   - `title`: `SQL performance: <ObjectName> (<database-slug>)`
   - `type`: `"Product Backlog Item"`
   - `description`: markdown using **exactly** these H2 headings, in order:

     ```markdown
     ## Summary
     ## Investigation — performance issues
     ## Investigation — bad practices
     ## Proposed rewrite
     ## Comparison (current vs proposed)
     ## Concrete solution
     ## Risks and behavior parity
     ## Reference
     ```

   - `acceptanceCriteria`: verification checklist for a DB developer (parity
     checks, expected plan shape notes, regression notes) — plain text or
     markdown list; maps to ADO Acceptance Criteria on publish
   - `tags`: include `sql-performance` and the object type (`procedure` /
     `view` / `function`)
   - Optional: `currentSqlExcerpt`, `proposedSqlExcerpt` (also present inside
     `description` so ADO has the full story)
   - Leave `assignedTo`, `areaPath`, `iterationPath` unset so Backstage publish
     uses `CREATE_WORK_ITEM_DEFAULTS`
   - Optional: `priority` (1–4), `parentId` only if the user asked

5. **Report back.** Tell the user the draft id, object, title, and that they
   review/publish at `/azure/work-item-drafts`. Do not call `az_create_work_item`
   or any other ADO create API.

## Hard rules

- Never create the Azure DevOps work item from this command.
- Never modify the SQL source files as part of this command.
- Never skip the propose → compare → concrete solution sequence.
- Never invent runtime metrics you did not measure; mark estimates as estimates.
