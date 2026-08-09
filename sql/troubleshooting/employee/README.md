# Employee Troubleshooting

Scenarios worth checking when an employee's profile data looks wrong, a
report/count looks wrong, or an update to an employee record doesn't behave
as expected. Grounded in the actual stored-procedure logic (file:line
references point at `HRMS-DATABASE/HRMS/STOREPROCEDURE/` and
`HRMS-DATABASE/HRMS/TABLES/` in the `TDG HRMS DB` repo). See that repo's
`llm-wiki/domain/employee-lifecycle.md` for the broader employee lifecycle
model.

**Layout note:** unlike the flat-per-folder convention described in
`troubleshooting/README.md`, this folder groups scripts one subfolder per
issue — each subfolder is self-contained (its own README, scripts, and any
RCA doc). Kept local to `employee/` since it's the only feature area so far
with enough scripts per scenario to need it.

## Scenarios

1. **"Indirect Reportees" count is inflated, or the same employee shows up in
   both the Direct and Indirect report lists.**
   → [`indirect-reportee-count-double-counting/`](indirect-reportee-count-double-counting/README.md)

2. **Designation shows selected on the Employment Details tab, but Grade shows
   blank — even though the Designation has a Grade mapped to it.**
   → [`grade-designation-mismatch/`](grade-designation-mismatch/README.md)
