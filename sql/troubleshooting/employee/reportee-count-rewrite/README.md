# Reportee count SP rewrite compare

Local DEV harness for the Count SP rewrite. Not Liquibase.

1. Deploy `Sp_CM_Mydetails_DirectIndirectReports_Count_Legacy.sql` to DEV (snapshot of the pre-rewrite procedure).
2. Deploy the rewritten `Sp_CM_Mydetails_DirectIndirectReports_Count` from `TDG HRMS DB`.
3. Run `compare-count-rewrite.sql` (or `run-compare.js`). Single-employer deltas must be empty; `'10,46'` must equal Legacy(10) + Legacy(46).
4. After a clean diff, run `drop-legacy.sql`.
