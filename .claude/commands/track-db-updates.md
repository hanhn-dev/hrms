---
description: Diff TDG HRMS DB since the last run, write a Backstage changelog of what changed, and patch knowledge pages so the wiki stays usable for a knowledge refresh.
argument-hint: "[source-repo-path] [--pull] [--full]"
---

# Command: track-db-updates

## Context

Backstage knowledge about the database lives in two trees:

- **`apps/backstage/content/wiki/database-changelog.md`** — living ledger of
  SQL deltas. This command owns it. Served at `/docs/database-changelog`.
- **`apps/backstage/content/llm-wiki/`** — schema/domain wiki. Canonical
  *source* is `d:\TDG HRMS DB\llm-wiki\` when that folder exists; otherwise
  the Backstage copy is the working tree (this checkout currently has no
  `llm-wiki/` in the DB repo). `/sync-llm-wiki` is copy-only and must not
  be used to invent wiki prose. This command *does* patch wiki pages when
  a SQL change contradicts a documented claim.

SQL source of truth: `d:\TDG HRMS DB\HRMS-DATABASE\<Module>\{TABLES,
STOREPROCEDURE,Stored Procedures,FUNCTIONS,VIEWS,Triggers,SYNONYMS,UDT,
DDL,DML,INDEX,SQL_JOB}/`.

Run cursor: `apps/backstage/.db-updates-state.json` (committed, same idea as
`.llm-wiki-sync-state.json`). Do not confuse the two files.

Do **not** regenerate feature guides here — list the slugs and tell the user
to run `/document-feature <name>` when a call chain actually moved. Do **not**
commit or push.

## Task

1. Fetch (and optionally pull) the latest TDG HRMS DB git state.
2. Diff SQL since the last successful run (plus uncommitted work).
3. Prepend this run to `content/wiki/database-changelog.md`.
4. Patch knowledge pages whose claims this delta contradicts.
5. Report what changed, what was patched, and what still needs a human
   knowledge pass.

## Arguments

Parse `$ARGUMENTS`:

| Token | Meaning |
|---|---|
| a filesystem path | Override the DB repo root (default `d:\TDG HRMS DB`) |
| `--pull` | After `git fetch`, `git pull --ff-only` on the current branch |
| `--full` | Also walk every `TABLES/` folder against `reference/tables/<module>.md` and report missing/extra catalog rows (still incremental for the changelog) |

Unknown flags: stop and report. Empty args are fine.

## Steps

1. **Resolve the DB repo.** Default `d:\TDG HRMS DB`, or the path token.
   Require `.git` and `HRMS-DATABASE`. Stop if missing.

2. **Fetch latest.** From the DB repo:
   - `git fetch --prune`
   - `git rev-parse --abbrev-ref HEAD`, `git rev-parse HEAD`,
     `git status --porcelain`
   - After fetch, resolve `origin/<branch>` when it exists; that is the
     **tip** for "latest". If local HEAD is behind, say so.
   - With `--pull`: `git pull --ff-only`. On non-fast-forward, stop — do
     not rebase or merge.
   - Without `--pull`: analyze the working tree + local HEAD as they
     stand, and still *name* any unfetched-vs-fetched gap in the report
     (`N commits on origin/<branch> not in HEAD`).

3. **Read state.** `apps/backstage/.db-updates-state.json` (hrms repo root).
   If missing, this is the first run (`lastTrackedCommit: null`).

4. **Choose the diff baseline.**
   - Incremental: `lastTrackedCommit` when `git cat-file -e <sha>^{commit}`
     succeeds in the DB repo.
   - First run, or stored SHA missing from history: do **not** invent a
     baseline. Prefer, in order: `apps/backstage/.llm-wiki-sync-state.json`
     `lastSyncedCommit` if that SHA exists in the DB repo; otherwise treat
     as baseline-only (changelog says "initial baseline — no prior delta",
     still run `--full` catalog walk if that flag was passed).
   - Diff **baseline → working tree**, not `..HEAD`, so uncommitted SQL
     counts. Rename-aware: `git -C "<source>" diff --name-status -M <baseline>`.
     Add untracked SQL under `HRMS-DATABASE/` from `git status --porcelain`.

5. **Filter the change set.** Keep paths under `HRMS-DATABASE/<Module>/` in
   `TABLES`, `STOREPROCEDURE`, `Stored Procedures`, `FUNCTIONS`, `VIEWS`,
   `Triggers`, `SYNONYMS`, `UDT`, `DDL`, `DML`, `INDEX`, `SQL_JOB`. Count
   other paths (changelog XML, pipelines) as out-of-scope — report the
   count, do not chase them. Derive `{module, objectType, objectName}` from
   each remaining path (`objectName` = filename minus `.sql`).

6. **Summarize the delta** (do not read every SP body).
   - Always itemize: `TABLES`, `DDL`, `UDT`, new/deleted `VIEWS` /
     `FUNCTIONS` / `STOREPROCEDURE`.
   - `STOREPROCEDURE` / `FUNCTIONS` **modifications**: group by module;
     use `git log --oneline <baseline>..HEAD -- <path>` (or "uncommitted
     edit") as the one-line nature. Open the diff only when the object is
     named in `llm-wiki/domain/*.md`, `llm-wiki/reference/data-schema.md`,
     `llm-wiki/reference/service-apis.md`, or a Backstage feature guide.
   - `DML`: itemize when it seeds/renames documented lookup values;
     otherwise count-only.
   - If the in-scope set is >80 files, keep the itemize rules above —
     never dump 300 SP names into the changelog. Collapse modified SPs
     to `N procedures touched` plus the ones that mapped to a wiki/feature
     page.

7. **Map to knowledge pages.** For each itemized object, find pages in
   this order (search both `d:\TDG HRMS DB\llm-wiki\` if present **and**
   `apps/backstage/content/llm-wiki/`):
   1. Row in `reference/tables/<module-lowercased>.md` (HRMS → `hrms.md`,
      `HRMS_TRAVELNEXPENSE` → `travelnexpense.md`, `HRM-TIMEPORT` →
      `timeport.md`, `HRMS-TRAINING` → `training.md`,
      `HRMS-RESOURCEALLOCATION` → `resourceallocation.md`,
      `HRMS-CRBBOOKING` → `crbbooking.md`, `HRMS-SURVEY` → `survey.md`).
   2. `architecture/module-catalog.md` subsystem lists.
   3. Grep `domain/*.md`, `reference/data-schema.md`,
      `reference/service-apis.md`.
   4. Grep `apps/backstage/content/features/**/*.md` for the object name
      (skip `_proposals/` and dated archive files under
      `<slug>/YYYY-MM-DD.md`).
   Unmapped objects go in an explicit bucket — never drop them.

8. **Patch knowledge (surgical, SQL wins).**
   - **Table catalog:** add a row for a new `TABLES/` file (one-line
     description from the CREATE TABLE columns, same inferred-description
     honesty as existing rows); remove or strike a dropped table; update
     `Depends on` when FKs in the diff changed. Bump `last-analyzed` to
     today only on files you actually edit. Adjust the "N tables" count
     in the catalog intro if you add/remove rows.
   - **`data-schema.md` / `service-apis.md` / `domain/*.md`:** edit only
     sentences/rows the diff contradicts (column added/removed, renamed
     status, documented proc behavior that the new body no longer does).
     Leave the page untouched when the SQL change is a bugfix that does
     not change a documented claim — say so in the changelog.
   - **Where to write wiki patches:** if `d:\TDG HRMS DB\llm-wiki\`
     exists, edit it there, then mirror with
     `robocopy "<source>\llm-wiki" "apps\backstage\content\llm-wiki" /MIR /FFT`
     (robocopy exit **< 8** = success). If that folder is absent, edit
     `apps/backstage/content/llm-wiki/` directly and note in the report
     that the DB repo has no source wiki.
   - **Never** rewrite a domain page from scratch. **Never** edit
     `content/wiki/baseline-*.md`, `content/features/_proposals/`, or
     feature archive snapshots. **Never** invent relationships or
     business meaning the SQL does not establish.
   - **`--full` extra:** list catalog tables missing a `TABLES/` file and
     `TABLES/` files missing a catalog row. Add missing rows; do not
     delete extra catalog rows without a matching `D` in the git diff
     (they may be live tables whose script was never exported).

9. **Write the changelog** to
   `apps/backstage/content/wiki/database-changelog.md`. Create the file
   if missing. Prepend this run under `## Latest run — YYYY-MM-DD`; move
   the previous "Latest run" block under `## Previous runs` (keep at most
   15 previous runs; collapse anything older to a one-line
   `YYYY-MM-DD — <n> SQL files — <short sha>`). Template:

   ````markdown
   # Database updates

   Living ledger of `HRMS-DATABASE` changes captured by `/track-db-updates`.
   SQL in **TDG HRMS DB** is source of truth; this page is the delta since
   each run so a knowledge refresh has a bounded input.

   > Last run: <YYYY-MM-DD HH:MM UTC> (`<short-sha>` on `<branch>`)

   ## Latest run — <YYYY-MM-DD>

   **Range:** `<baseline-short>` → `<tip-short>` (`<branch>`)
   **SQL files:** <added> added, <removed> removed, <modified> modified
   **Out of scope:** <n> non-object paths

   ### <Module>
   | Object | Type | Change | Knowledge |
   |---|---|---|---|
   | `TExample` | TABLE | column `Foo` added | patched `reference/tables/hrms.md`; domain leave-lifecycle unchanged |

   ### Knowledge pages patched
   - `content/llm-wiki/reference/tables/hrms.md` — added `TExample`

   ### Needs a knowledge pass
   - Unmapped: `SP_NewThing` (HRMS / STOREPROCEDURE)
   - Feature regen: `/document-feature Leave Management` — `SP_X` still cited
     as writing `TOld` but the proc now writes `TNew`
   ````

   `Knowledge` column values: `patched <path>`, `reviewed — no claim
   change`, `unmapped`, `feature regen — /document-feature <name>`.

10. **Update state** `apps/backstage/.db-updates-state.json`:

    ```json
    {
      "sourceRepo": "<resolved path>",
      "lastTrackedCommit": "<full 40-char SHA of DB HEAD>",
      "lastTrackedAt": "<ISO-8601 real UTC, not local time labeled Z>",
      "lastTrackedBranch": "<branch name>"
    }
    ```

    Write this **last**, after the changelog and patches succeed. An
    interrupted run must leave the previous SHA so the next run re-covers
    the same diff. `lastTrackedCommit` is always `git rev-parse HEAD` of
    the DB repo (uncommitted work analyzed now will reappear until it is
    committed).

11. **Do not commit.** Leave hrms (and DB-repo wiki, if patched) as
    working-tree changes.

## Output

Report in this order:

1. Tip vs baseline (SHAs, branch, pulled or not, uncommitted SQL, commits
   on origin not in HEAD).
2. Module changelog (the tables from step 9) — lead with this.
3. Knowledge pages patched, with a one-line each.
4. Needs a knowledge pass (unmapped + `/document-feature` suggestions).
5. Confirmation that `database-changelog.md` and `.db-updates-state.json`
   were written.
6. Reminder: nothing was committed; review `git status` in `hrms` (and
   TDG HRMS DB if the source wiki was patched).

## Hard rules

- Read-only against SQL Server. Git fetch/pull of the DB *repo* is allowed;
  never run DDL/DML against a database.
- Do not call `/document-feature` from this command.
- Do not edit `content/wiki/baseline-*.md`.
- Do not rewrite `llm-wiki` pages that this delta does not touch.
- If fetch fails (offline), continue with local HEAD and say so.
