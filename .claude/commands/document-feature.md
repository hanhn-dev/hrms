---
description: Explore a module/feature across SourceCode and TDG HRMS DB, and write a developer-facing guide (workflow + table-relationship mermaid diagrams) into apps/backstage/content/features/.
argument-hint: <module or feature name>
---

# Command: document-feature

## Context

Two repos hold half the picture each for any given module:

- **SourceCode** (`d:\TDG HRMS\SourceCode`) — the application. Mostly WebForms
  pages under `HRMS.Web\HRMS.Web\HRM\<Module>\*.aspx(.cs)`, calling into a
  shared DAL/BLL layer (`HRMS.Shared\HRMS.DataAccessLayer\<Module>\`,
  `HRMS.Shared\HRMS.BusinessLayer\`) via raw ADO.NET
  (`SqlCommand`/`CommandType.StoredProcedure`) or Enterprise Library
  (`Database.GetStoredProcCommand`). A few newer modules are their own
  top-level projects with their own DAL/BLL split
  (`HRMS.<Module>.DAL`, `HRMS.<Module>.BLL`). Everything terminates in a
  named stored procedure — no dynamic SQL.
- **TDG HRMS DB** (`d:\TDG HRMS DB`) — the database. Objects live under
  `HRMS-DATABASE\<Module>\{TABLES,STOREPROCEDURE,Stored Procedures,VIEWS,
  FUNCTIONS,Triggers,SYNONYMS,UDT}\`. `llm-wiki/domain/*.md` already holds
  **canonical, human-reviewed** DB-lifecycle docs for several modules
  (with their own mermaid `flowchart`/`erDiagram`) — per this repo's own
  knowledge-priority rules, that prose is authoritative for DB behavior and
  must never be silently re-derived or duplicated. When a domain page
  already covers the tables/procs in scope, cite and reuse it; only derive
  directly from DDL when no such page exists.

SourceCode may also have its own `docs\SystemModels\SystemModel-2\` knowledge
base (behavior/workflows, domain/contexts, data/entities) — where it exists,
treat it the same way as `llm-wiki` on the DB side: canonical for **which
code path is actually live**, ahead of what raw grep/folder-naming would
suggest. WebForms-era repos especially tend to have dead/uncompiled sibling
pages sitting next to the real entry point; SystemModel-2, when present, has
often already done the compiled-build check and named the live one.

Neither repo alone shows the **call chain that connects them** — which page
calls which DAL method, which calls which stored procedure, which touches
which tables. That's this command's job: produce one guide per feature that
makes that chain visible, plus the two diagrams developers actually want
(a workflow flowchart and a table ER diagram), and drop it where developers
already browse docs.

Output home: `apps/backstage/content/features/<slug>.md`, served at
`/features/<slug>` by the Next.js app (`apps/backstage/lib/features.ts` +
`apps/backstage/app/features/`). That app renders ```mermaid``` fences
natively (see `lib/mermaid-diagram.tsx`) — write diagrams as standard mermaid
code blocks, nothing app-specific needed.

## Task

Given a module/feature name in `$ARGUMENTS`, explore both repos, and write a
single developer-facing guide connecting the application code to the
database, ending in a workflow diagram and a table-relationship diagram.

## Steps

1. **Resolve the feature name.** Take it from `$ARGUMENTS`. If empty, stop
   and ask for one.

2. **Find the code footprint in SourceCode** (`d:\TDG HRMS\SourceCode`):
   - First check `docs\SystemModels\SystemModel-2\` (if present) for a
     `behavior\workflows\*.md` or `domain\contexts\*.md` page already
     covering this feature — it may already name the live entry point and
     call chain, and may flag sibling files as dead/uncompiled. Prefer its
     answer over what folder/file naming alone would suggest, and cite it.
   - Search `HRMS.Web\HRMS.Web\HRM\` for a folder matching the feature name
     (case-insensitive, tolerate spacing/casing variants — e.g. "Leave
     Management" ↔ `LeaveManagement`, `Leaves`, `Leave_Dashboard`).
   - Search `HRMS.Shared\HRMS.DataAccessLayer\` and
     `HRMS.Shared\HRMS.BusinessLayer\` for a matching subfolder/class.
   - Check for a standalone `HRMS.<Module>[.DAL|.BLL]` project at the repo
     root.
   - Check `HRMS.CoreAPI` for a matching controller.
   - If multiple plausible folders exist and it's not obvious which are in
     scope (e.g. both a legacy and current implementation), include all of
     them rather than guessing which is "the" one — note the ambiguity in
     the output instead of silently picking one.
   - If nothing plausible is found, stop and report — don't fabricate a
     structure.
   - For each matching page/controller, trace its calls into DAL/BLL methods,
     and for each DAL/BLL method that hits the database, record: entry point
     → method (`file:line`) → stored procedure name. Note the call mechanism
     (raw ADO.NET vs Enterprise Library) only if it varies within the
     feature — otherwise it's not worth calling out.
   - For each API endpoint found (controller actions in `HRMS.CoreAPI` or any
     other Web API/MVC controller in scope, plus any AJAX/PageMethods/WebMethod
     endpoints a WebForms page calls), record: HTTP verb, route (from
     `[Route]`/`[HttpGet]`/`[HttpPost]` attributes or the conventional
     controller/action path), and its parameters — name, type, and
     required/optional — read from the action's method signature or bound
     model class (`file:line`). If a feature has no API layer (pure WebForms
     postback with no AJAX/Web API calls), note that explicitly rather than
     leaving the section silently empty.

3. **Find the DB footprint in TDG HRMS DB** (`d:\TDG HRMS DB`):
   - Locate the module folder(s) under `HRMS-DATABASE\` — use the stored
     procedure names collected in step 2 as the strongest signal (the DB
     folder name doesn't always match the app's module name).
   - For each stored procedure found, locate its definition file and
     identify the tables it reads/writes (INSERT/UPDATE/DELETE targets,
     main SELECT sources, table-valued params).
   - Collect the resulting set of tables.

4. **Check for existing canonical DB docs.** Grep `llm-wiki/domain/*.md`,
   `llm-wiki/reference/tables/*.md`, and
   `llm-wiki/architecture/module-catalog.md` for the module name and for the
   stored procedures/tables from step 3.
   - If a domain page already covers this ground and has its own
     `erDiagram`, reuse that diagram and cite the page — do not re-derive
     table relationships from DDL in this case.
   - If no page covers it (or covers only part), derive the ER diagram
     directly from the tables' declared FKs (many HRMS tables have none —
     say so in the diagram the same way existing domain docs do, e.g.
     `"TransId (no FK declared)"`, rather than inventing a relationship).

5. **Write the guide** to
   `apps/backstage/content/features/<kebab-case-slug>.md`. If a file already
   exists for this slug, overwrite it but call out in your final report what
   changed (procs/tables added or removed) versus the previous version.
   Structure:

   ````markdown
   ---
   sources:
     - <SourceCode file paths touched>
     - <TDG HRMS DB file paths touched>
     - <llm-wiki pages cited, if any>
   confidence: <low|medium|high>
   last-analyzed: <today's date, YYYY-MM-DD>
   ---

   # <Feature Name>

   ## Overview
   <A business narrative for someone who has never seen this feature, written
   before you touch any code chain: what does the end user actually do, what
   are the states/outcomes, and who is involved (the initiating role, the
   approving/processing role, any admin/config role)? Prefer a short story
   ("An employee wants X, so they Y, then Z happens...") over a dry feature
   summary. Close with 1-2 sentences pointing at the canonical llm-wiki page(s)
   this section connects, so the reader knows where to go for DB-only depth.>

   ## Workflow

   ```mermaid
   flowchart TD
     ...UI action -> DAL/BLL method -> stored proc -> table...
   ```

   <Diagram comes right after the Overview, before any reference tables — a
   reader should get the shape of the flow while it's still fresh from the
   narrative, before drilling into entry points/call chains/procs.>

   ## Entry points
   <table: UI page / API endpoint -> purpose. If a callout about dead/live
   entry points applies (see step 2's SystemModel-2 guidance), place it
   directly above this table, not stacked at the top of the doc before the
   reader has any context for it.>

   ## Code → database call chain
   <table or list: entry point -> DAL/BLL method (file:line) -> stored procedure>

   ## API endpoints
   <table: HTTP verb, route, parameters (name, type, required/optional),
   purpose, source (file:line). If the feature has no API layer, say so here
   instead of omitting the section.>

   ## Stored procedures & tables involved
   <table: object, file path, one-line purpose, cross-reference to an
   llm-wiki page as a code-span path where one exists. If a callout resolves
   an open question about which procedure is live (see step 4), place it
   directly above this table for the same reason as above.>

   ## Table relationships

   ```mermaid
   erDiagram
     ...
   ```

   ## Known gaps
   <ambiguous folders, legacy code paths, DB objects that couldn't be tied
   back to any code path — list them, don't drop them silently>
   ````

   Section order matters: lead with the plain-language Overview and the
   Workflow diagram (the two things a reader needs to build a mental model),
   *then* the entry points/call-chain/procedure reference tables, *then*
   Known gaps last. Don't front-load accuracy-correction callouts before the
   Overview — anchor each callout to the specific section it corrects.

6. **Do not commit.** This only changes files in the `hrms` working tree —
   leave them for the user to review and commit.

## Output

Report, in this order:
1. Feature scope resolved: which SourceCode folder(s) and which
   `HRMS-DATABASE\<Module>\` folder(s) were treated as in-scope, and any
   ambiguity noted instead of silently resolved.
2. Entry points and the code → DB call chain found.
3. API endpoints found and their parameters (or that none exist).
4. Stored procedures and tables discovered.
5. Which llm-wiki pages were reused/cited vs. where relationships were
   derived directly from DDL.
6. Anything landing in "Known gaps".
7. The file path written, and a reminder that nothing was committed.
