---
source-root: HRMS-DATABASE/HRMS-SURVEY/TABLES
generated-by: mechanical extraction (CREATE TABLE parse for columns/FKs) + LLM-inferred one-line descriptions from table name/columns
confidence: low-medium (descriptions are inferred, not sourced from comments — verify against source before relying on business meaning)
last-analyzed: 2026-07-08
---

# HRMS-SURVEY — Table Catalog

Database: `SURVEY`. Employee surveys: definitions, questions, participants.

5 tables (see `../../architecture/module-catalog.md`). Descriptions are inferred from table/column
names by an LLM pass, not from source comments (this codebase's CREATE TABLE scripts carry none) —
treat as a navigation aid, not authoritative business definition. "Depends on" lists FK targets found
via `FOREIGN KEY ... REFERENCES` in this table's own script and in ALTER scripts elsewhere in the module tree;
it omits self-referential FKs. A handful of tables use non-standard file formats the parser could not read
columns from — these are marked "(unparsed)".

| Table | Description | Depends on |
|---|---|---|
| `TEMAIL_NOTIFICATION` | Queue of email notifications for module requests, tracking status, content, and delivery attempts. | — |
| `TParticipants` | Links employees to surveys as participants, per employer. | `TSurvey` |
| `TSurvey` | Survey definitions with title, dates, confidentiality, publish/close/submit state, and email/thank-you text. | — |
| `TSurvey_Emp` | Employee answers to survey questions, capturing selected option, rating, comments, and IP address. | `TSurveyQuestions` |
| `TSurveyQuestions` | Maps questions to surveys with a display sequence order. | `TSurvey` |
