# Acronyms

Two-column expansion of acronyms and short codes that recur in object names,
columns, and stored-procedure prefixes across the HRMS database. Definitions
live in `terminology.md` and `business-entities.md`.

| Acronym | Expansion |
|---|---|
| HRMS | Human Resource Management System |
| AR | Attendance Regularization |
| WFH | Work From Home |
| LM | Leave Management (SP prefix `SP_AdminLM_*`) |
| PMS | Performance Management System |
| CMS | Confirmation Management System |
| TNI | Training Needs Identification |
| BGV | Background Verification |
| RRS | Resource Requisition / Requirement System (recruitment) |
| RAS | Resource Allocation System |
| CRB | Conference Room Booking |
| TNE / T&E | Travel aNd Expense |
| PBI | Product Backlog Item (Azure DevOps work-item, cited in SP change logs) |
| BU | Business Unit |
| DL | Distribution List (email, e.g. `OrgDlEmail`) |
| FNPF | Fiji National Provident Fund (statutory fund; `EmployerFNPFID`) |
| TIN | Tax Identification Number (`EmployerTIN`) |
| PTO | Paid Time Off (`IsLeaveTypePTO`) |
| LOP | Loss Of Pay (`LossOfPay` leave attribute) |
| SSIS | SQL Server Integration Services (staging tables `*_SSIS_Temp_*`) |
| UDT | User-Defined Table type (the `UDT/` folder; TVP parameters) |
| SP / USP | Stored Procedure / User Stored Procedure (object prefixes) |
| OV | Object/Overview reporting SPs (`OV_Rule_*` rule-engine report procs) |
| ELMAH | Error Logging Modules and Handlers (`ELMAH_Error`, `ELMAH_LogError`) |
| GUID | Globally Unique Identifier (`EmployerGUID UNIQUEIDENTIFIER`) |
| UTC | Coordinated Universal Time (`*UtcTime` columns, `getutcdate()`) |

<!-- Source-derived from object/column names across HRMS-DATABASE. Expansions for
RRS/RAS/OV are inferred from usage context; see assumptions/inferred-context.md. -->
