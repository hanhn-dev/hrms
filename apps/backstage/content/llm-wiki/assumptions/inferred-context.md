# Inferred Context

Things inferred from the source but not directly verifiable, each with a
confidence level. Treat these as working hypotheses, not facts.

| Inference | Basis | Confidence |
|---|---|---|
| The system is multi-tenant (one DB serving many employer organizations). | `Employerid` on nearly every table; `TEmployerDetails` tree with `ParentEmployerid`/`RootEmployerId`, per-tenant `LicenseKey`. | high |
| The calling application is an ASP.NET web app. | `/HRM/Login.aspx` literal in `ELMAH_LogError`; ELMAH is an ASP.NET error logger; `TAuditTrail.SessionID/PageName`. | high |
| RRS = a recruitment / resource-requisition subsystem. | `RequestType` values `RecruitmentManagement`, `InterviewFeedback`, `InitiateHiring`; `GetRrsSkillDetails`; `@Lv_RRSId`/`@lv_RRSTitle` vars. | medium |
| OV_ procedures are dashboard/report generators producing card/detail/summary shapes. | naming `OV_Rule_LeaveAttendance_*_{Card,Detail,Summary}`. | medium |
| The product is sold/licensed per organization with a seat count. | `LicenseCount`, `LicenseKey`, `custid`/`parentcustid` on `TEmployerDetails`. | medium |
| PII is stored encrypted for data-protection compliance, with a retention/erasure feature. | `*_Encrypted` columns + `IsPersonalFieldsDeleted`/`PersonalFieldsDeletedDate`, `IsDeletePersonalFields`/`PersonalFieldsDeleteDuration` on employer. | medium |
| The deployment has a primary `*_PROD` instance and at least one dev/test (`Training_Dev` synonym target, `_CL_UAT`/`_DP` table suffixes). | `Training_Dev`, `TLOOKUP_CL_UAT`, numerous `*_DP` tables. | medium |
| Single-char status codes (`P`/`C`/`B`) are the original encoding and full words were introduced later (or vice versa) — a migration in progress. | both encodings coexist on `LeaveStatus`; `DML/.../Remove-ApproveStatus` script exists. | low |
| Tenants were onboarded by SSIS bulk-import from prior systems. | `*_SSIS_Temp_*` staging tables named per tenant (`Ecomak_`, `GenXInfo_`, `Brinton`). | medium |
| The org operates in / supports Fiji (and likely India) jurisdictions. | `EmployerFNPFID` (Fiji National Provident Fund), `AadharNumber` (India national ID), `TCLAIM_ASSIGNMENT_FIJI`. | medium |
| "OV" expands to Object/Overview; "LM" to Leave Management; "RAS" to Resource Allocation System. | SP-prefix usage context; not spelled out in source. | low |

> Promotion rule: when one of these is confirmed against runtime or the app tier,
> move it into the relevant source-derived page and cite the new evidence.
