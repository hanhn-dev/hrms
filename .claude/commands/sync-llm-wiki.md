---
description: Mirror TDG HRMS DB's llm-wiki/ into apps/backstage/content/llm-wiki/, and report which DB modules changed and whether the wiki still reflects them.
argument-hint: [source-repo-path]
---

# Command: sync-llm-wiki

## Context

`apps/backstage/content/llm-wiki/` is a byte-for-byte mirror of `llm-wiki/` in
the **TDG HRMS DB** repo — [llm-wiki.ts](../../apps/backstage/lib/llm-wiki.ts)
reads those files verbatim (frontmatter stripped) and serves them at `/wiki/*`.
The mirror step is copy-only: no transformation, no regeneration.
`content/wiki/*.md` (no `llm-` prefix) is separate, hand-authored content —
never touch it from this command.

Beyond the mirror, this command also answers "did the database change under
the wiki's feet?" TDG HRMS DB (`HRMS-DATABASE/<Module>/{TABLES,STOREPROCEDURE,
Stored Procedures,FUNCTIONS,VIEWS,Triggers,SYNONYMS,UDT,DDL,DML}/`) is the
source of runtime truth; `llm-wiki/domain/*.md`, `llm-wiki/architecture/
module-catalog.md`, and `llm-wiki/reference/tables/<module>.md` are prose
*about* that source. Those two can drift independently. This command never
edits the wiki to fix drift — it only surfaces it, per the project's own
priority order (source code overrides docs) — so a human decides how to
update the prose.

State (last-synced commit) lives in `apps/backstage/.llm-wiki-sync-state.json`,
committed to this repo so the sync cursor persists across sessions/machines.

## Task

1. Sync `llm-wiki/` from the TDG HRMS DB repo into
   `apps/backstage/content/llm-wiki/`.
2. Report a **module changelog**: which DB modules/objects changed since the
   last sync, in plain terms, and which `llm-wiki` pages document that area —
   flagging any that look stale (object changed, page didn't).

## Steps

1. **Resolve the source repo path.** Use `$ARGUMENTS` if given, else default to
   `d:\TDG HRMS DB`. Verify it exists and has a `llm-wiki` folder, a
   `HRMS-DATABASE` folder, and a `.git` dir — stop and report if not.

2. **Read state.** Look for `apps/backstage/.llm-wiki-sync-state.json` (relative
   to this repo's root). If missing, treat this as the first run
   (`lastSyncedCommit: null`).

3. **Get current source HEAD:** `git -C "<source>" rev-parse HEAD`.
   Also check for uncommitted changes across the whole repo:
   `git -C "<source>" status --porcelain`.

4. **Build the wiki changelog** (content that will actually be mirrored):
   - If `lastSyncedCommit` is set and differs from current HEAD, run
     `git -C "<source>" log --oneline <lastSyncedCommit>..HEAD -- llm-wiki`.
   - If this is the first run, note "initial sync — full snapshot".
   - Separately note any `llm-wiki/` files listed as uncommitted/dirty from
     step 3.

5. **Build the module changelog** (analysis only — this never edits
   `llm-wiki/`, it only reports on it):
   - List changed paths *outside* `llm-wiki/` since `lastSyncedCommit`:
     `git -C "<source>" diff --name-only <lastSyncedCommit>..HEAD -- . ":(exclude)llm-wiki"`
     plus the non-`llm-wiki` entries from step 3's `status --porcelain`
     (uncommitted counts too — same rationale as the mirror step: report
     current on-disk reality, not just committed history). On first run,
     treat every existing SQL object as out of scope for drift-checking
     (there's no prior baseline) and skip straight to noting "initial sync —
     no module diff".
   - Keep only paths under a `HRMS-DATABASE/<Module>/...` object folder
     (`TABLES/`, `STOREPROCEDURE/`, `Stored Procedures/`, `FUNCTIONS/`,
     `VIEWS/`, `Triggers/`, `SYNONYMS/`, `UDT/`, `DDL/`, `DML/`). Other
     changed paths (app code, pipelines, etc.) are out of scope — note the
     count but don't chase them.
   - For each remaining path, derive `{module, objectType, objectName}` from
     the path (module = the folder under `HRMS-DATABASE/`; objectName =
     filename minus `.sql`). Get its one-line nature of change via
     `git -C "<source>" log --oneline <lastSyncedCommit>..HEAD -- "<path>"`
     (or "new/untracked" / "uncommitted edit" for dirty files with no
     matching log entry).
   - Map each object to the wiki page(s) that document it. In order of
     specificity:
     a. Exact or prefix match of `objectName` against the table/proc rows in
        `llm-wiki/reference/tables/<module-lowercased>.md`.
     b. Keyword match of `objectName` against the "Cross-cutting subsystems"
        table-name lists in `llm-wiki/architecture/module-catalog.md` (this
        is where things like the approval engine or leave management are
        already tied to a specific `../domain/*.md` page).
     c. A plain grep for `objectName` across `llm-wiki/domain/*.md` and
        `llm-wiki/architecture/*.md` for anything the first two passes
        missed.
     Objects that match nothing land in an explicit "unmapped" bucket —
     report them, don't drop them silently.
   - For each mapped wiki page, check whether it was itself touched in this
     same window (present in step 4's file list, or in the `llm-wiki`
     uncommitted set from step 3). Mark it **updated this window** if so,
     **not touched — review for drift** if not.

6. **Mirror the content.** Run:
   ```
   robocopy "<source>\llm-wiki" "apps\backstage\content\llm-wiki" /MIR /FFT
   ```
   from this repo's root. This adds new files, updates changed ones, and
   removes files deleted at the source — using current on-disk content, so it
   picks up uncommitted edits too and is safe to re-run. Robocopy's exit code
   is a bitmask, not a plain success/fail flag: treat any code **< 8** as
   success; **>= 8** is a real failure — stop and report it.

7. **Update state.** Write
   `apps/backstage/.llm-wiki-sync-state.json`:
   ```json
   {
     "sourceRepo": "<resolved source path>",
     "lastSyncedCommit": "<HEAD sha from step 3>",
     "lastSyncedAt": "<current ISO 8601 timestamp, actual UTC — not local time relabeled>"
   }
   ```

8. **Do not commit or push.** Leave the updated mirror files and state file as
   working-tree changes in `hrms`. Report a summary so the user can review
   (`git status` / `git diff`) and commit when ready.

## Output

Report, in this order:

1. **Module changelog** (step 5) — grouped by module, then by mapped wiki
   page: changed object, nature of change, and the **updated this window** /
   **not touched — review for drift** flag. Include the unmapped bucket and
   the out-of-scope file count. This is the new part — lead with it, don't
   bury it under the file-mirror mechanics.
2. Wiki changelog (step 4): commit range synced (or "initial sync") and the
   commit list, plus any uncommitted `llm-wiki` changes that were included.
3. Files added / updated / removed by robocopy (from its summary output).
4. Confirmation that `apps/backstage/.llm-wiki-sync-state.json` was updated.
5. A reminder that nothing was committed — the user reviews and commits
   `hrms` themselves, and that any flagged drift is for a human to fix in
   `llm-wiki/` (this command never edits wiki content).
