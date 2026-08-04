---
sources:
  - HRMS-DATABASE/HRMS/TABLES/TEmployee.sql
  - HRMS-DATABASE/HRMS/STOREPROCEDURE/ELMAH_LogError.sql
  - HRMS-DATABASE/HRMS/SYNONYMS
confidence: medium
last-analyzed: 2026-06-26
---

# External Business Logic

Business rules and dependencies that live **outside this database** but that the
database's correctness depends on. Useful when debugging "why didn't the data
change" — the answer is often that the logic ran (or failed) in the app tier.

- **Authentication / password handling.** Password verification, hashing,
  lockout enforcement, and session issuance run in the application tier.
  `TUsers.PasswordStr` and the policy columns on `TEmployerDetails` are data;
  the algorithm enforcing them is external. See `../architecture/auth-flow.md`.

- **PII encryption / decryption.** `*_Encrypted VARBINARY` columns are populated
  and read by an external encryption key/provider. The DB does not encrypt them
  itself (no `ENCRYPTBYKEY` calls in the DDL). Which of the encrypted vs
  plaintext mirror columns is authoritative is an open question.

- **Email & notification delivery.** The DB records notifications
  (`TEMAIL_NOTIFICATION`, home-page notification rows) but a separate
  process/app sends the actual emails.

- **Scheduling.** Time-driven logic — leave truncation/rollover
  (`SP_AdminLM_TruncateLeave`, `SP_AddLeavesRollOver`), auto-confirmation,
  birthday/anniversary notifications, password-expiry alerts — is implemented as
  SQL procedures but **triggered** by an external scheduler (SQL Agent jobs or
  app cron), which is not in this repo.

- **Attendance capture devices.** Biometric/geo/IP punch data originates in
  external devices and feeds `TAttendanceTransaction` /
  `TAttendanceTransactionOtherSource` / `TGeoTagging*`. The device protocols are
  external.

- **Timesheet integration partners.** `TIMEPORT`'s `TIntegration*` tables exchange
  files/tokens with external systems; the partner-side logic and protocols are
  external.

- **Tax / statutory calculation specifics.** Statutory identifiers exist
  (`EmployerTIN`, `EmployerFNPFID` for Fiji, `AadharNumber` for India) and salary
  structures are stored, but jurisdiction-specific tax/contribution *rules* are
  partly encoded in payroll SPs and partly governed externally — not fully
  extracted here (see `../assumptions/open-questions.md`).

- **Error visibility.** Errors are logged to `ELMAH_Error` by the app via
  `ELMAH_LogError`; reading/alerting on them happens in the ELMAH/ASP.NET layer.
