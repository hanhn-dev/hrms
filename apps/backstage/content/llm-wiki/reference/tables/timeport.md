---
source-root: HRMS-DATABASE/HRM-TIMEPORT/TABLES
generated-by: mechanical extraction (CREATE TABLE parse for columns/FKs) + LLM-inferred one-line descriptions from table name/columns
confidence: low-medium (descriptions are inferred, not sourced from comments — verify against source before relying on business meaning)
last-analyzed: 2026-07-08
---

# HRM-TIMEPORT — Table Catalog

Database: `HRM_CL_TIMEPORT`. Timesheets, timesheet status workflow, and an integration layer for syncing with external partners.

86 tables (see `../../architecture/module-catalog.md`). Descriptions are inferred from table/column
names by an LLM pass, not from source comments (this codebase's CREATE TABLE scripts carry none) —
treat as a navigation aid, not authoritative business definition. "Depends on" lists FK targets found
via `FOREIGN KEY ... REFERENCES` in this table's own script and in ALTER scripts elsewhere in the module tree;
it omits self-referential FKs. A handful of tables use non-standard file formats the parser could not read
columns from — these are marked "(unparsed)".

| Table | Description | Depends on |
|---|---|---|
| `TDATA_GRID_CONFIG` | Stores per-employee saved UI data-grid column/layout configuration settings. | — |
| `TDATA_GRID_CONFIG_bkp112222` | Dated backup copy of TDATA_GRID_CONFIG grid configuration table. | — |
| `Timeport_Project_Code_Import` | Staging table for importing employee-to-project-code mappings from Timeport by name/number. | — |
| `TIntegrationDirectoryDetails` | Maps external integration partner directories to client, project, and employee records. | — |
| `TIntegrationErrorLog` | Logs errors encountered during timesheet integration syncs with external partners. | `TIntegrationPartner`, `TTSEmpTimeSheet` |
| `TIntegrationFileDetails` | Maps integration partner files/directories to client, project, and employee records. | — |
| `TIntegrationJobMapping` | Maps HRMS lookup/job IDs to corresponding job IDs in an external integration partner system. | `TIntegrationPartner` |
| `TIntegrationPartner` | Master list of external integration partners used for timesheet/data sync. | — |
| `TIntegrationProjectMapping` | Maps HRMS project IDs to external integration partner project IDs per customer. | `TIntegrationPartner` |
| `TIntegrationTaskMapping` | Maps HRMS work item types to external integration partner task IDs per client/project. | `TIntegrationPartner` |
| `TIntegrationTokenMapping` | Stores integration partner API tokens and admin credentials per client/project. | `TIntegrationPartner` |
| `TIntegrationUserMapping` | Maps HRMS employees to integration partner user accounts, tokens, and approvers. | `TIntegrationPartner`, `TIntegrationTokenMapping` |
| `TlookUp_20210514_Ecomak` | Dated snapshot/backup of a client lookup table with hierarchical lookup values. | — |
| `TlookUp_20210602` | Dated snapshot/backup of the lookup table with hierarchical lookup values. | — |
| `TlookUp_20230310` | Dated snapshot/backup of the lookup table, adding a business-unit lookup column. | — |
| `tlookup_bkp372023` | Backup copy of the lookup table including the business-unit lookup column. | — |
| `TPublisherMapping` | Tracks sync status of timesheet entries published to an external integration partner. | `TIntegrationPartner`, `TIntegrationTokenMapping`, `TTSEmpTimeSheet` |
| `TSEmpTimesheetStatus` | Master list of timesheet status codes and descriptions. | — |
| `TSEmpTimesheetStatusMapWithOrg` | Maps timesheet status codes to employer-specific status descriptions. | `TSEmpTimesheetStatus` |
| `TSEmpTimesheetSubmitted_History` | History log of employee timesheet submission status changes by date. | — |
| `TtimesheetConfigOrg` | Per-employer timesheet configuration, including hours-vs-minutes display format. | `TTSReminderNotificationDuration` |
| `TTSEmpTimeSheet` | Main timesheet entries table recording project/task hours, approval status, and comments. | `TTSProjectConfiguration` |
| `TTSEmpTimeSheet_20210602` | Dated backup copy of the main TTSEmpTimeSheet table. | — |
| `TTSEmpTimeSheet_bkp072622` | Backup copy of the main TTSEmpTimeSheet table. | — |
| `TTSEMPTIMESHEET_BKP13023` | Backup copy of the main TTSEmpTimeSheet table. | — |
| `TTSEmpTimeSheetAdminStatus` | Admin-set status and freeze flag overriding a timesheet entry's state. | `TTSEmpTimeSheet` |
| `TTSEmpTimeSheetAdminStatusbkp7262022` | Backup copy of the TTSEmpTimeSheetAdminStatus table. | — |
| `TTSEmpTimeSheetIsqueued0` | Backup/variant of TTSEmpTimeSheet entries, including a duration column, for unqueued records. | — |
| `TTSLOOKUP` | Master lookup table for timesheet-related dropdown values, organized per employer. | — |
| `TTSLOOKUP_20210602` | Dated backup copy of the TTSLOOKUP table. | — |
| `TTSLOOKUP_20230310` | Dated backup copy of the TTSLOOKUP table. | — |
| `ttslookup_bkp372023` | Backup copy of the TTSLOOKUP table. | — |
| `TTSLookUpMapping` | Maps lookup values to time-off/holiday/billable flags with effective-dated temporal versioning. | `TTSProjectConfiguration` |
| `TTSLookUpMapping_20210519` | Dated backup of TTSLookUpMapping before temporal versioning columns were added. | — |
| `TTSLookUpMapping_20210527` | Dated backup of TTSLookUpMapping before temporal versioning columns were added. | — |
| `TTSLookUpMapping_20210527_HT` | Dated backup variant of TTSLookUpMapping before temporal versioning columns were added. | — |
| `TTSLookUpMapping_20210602` | Dated backup of TTSLookUpMapping before temporal versioning columns were added. | — |
| `TTSLookUpMapping_20210908` | Dated backup of TTSLookUpMapping including added project-config and temporal validity columns. | — |
| `TTSLookUpMapping_20230310` | Dated backup of TTSLookUpMapping including project-config and temporal validity columns. | — |
| `TTSLookUpMapping_bkp372023` | Backup copy of TTSLookUpMapping including project-config and temporal validity columns. | — |
| `TTSLookUpMapping-20210727` | Dated backup/snapshot of TTSLookUpMapping with no captured column definitions. | — |
| `TTSLookUpMappingHistory` | History table tracking changes to TTSLookUpMapping records over time. | — |
| `TTSLookUpMappingHistory_20230310` | Dated backup copy of the TTSLookUpMappingHistory table. | — |
| `TTSLookUpMappingHistory_bkp372023` | Backup copy of the TTSLookUpMappingHistory table. | — |
| `TTSProjectConfiguration` | Project-level timesheet configuration including approval rules, SDLC/task requirements, and billing settings. | — |
| `TTSProjectConfiguration_20210519` | Dated backup of TTSProjectConfiguration before later columns were added. | — |
| `TTSProjectConfiguration_20210527` | Dated backup of TTSProjectConfiguration before later columns were added. | — |
| `TTSProjectConfiguration_20210602` | Dated backup of TTSProjectConfiguration before later columns were added. | — |
| `TTSProjectConfiguration_20210619` | Dated backup of TTSProjectConfiguration including active/sync/temporal columns. | — |
| `TTSProjectConfiguration_20230310` | Dated backup of TTSProjectConfiguration including invoicing frequency and temporal columns. | — |
| `TTSProjectConfiguration_bkp372023` | Backup copy of TTSProjectConfiguration including invoicing frequency and temporal columns. | — |
| `TTSProjectConfigurationCopy-20210727` | Dated copy/backup of TTSProjectConfiguration with no captured column definitions. | — |
| `TTSProjectConfigurationHistory` | History table tracking changes to TTSProjectConfiguration records over time. | — |
| `ttsprojectconfigurationHistory_20210826` | Dated backup copy of the TTSProjectConfigurationHistory table. | — |
| `TTSProjectConfigurationHistory_20230310` | Dated backup copy of the TTSProjectConfigurationHistory table. | — |
| `TTSProjectConfigurationHistory_bkp372023` | Backup copy of the TTSProjectConfigurationHistory table. | — |
| `TTSQueue` | Queue of timesheets sent for approval, tracking approver and timing. | `TTSEmpTimeSheet` |
| `TTSSubmitMSGConfigStatus` | Per-employer flag controlling whether allocated-hours submission messages are shown. | — |
| `TTSTimeSheetMail` | Queue/log of timesheet approval email notifications sent per employer. | — |
| `TTSUserProjectMapping` | Maps employees to project configurations with allocation date ranges and approver assignments. | `TTSProjectConfiguration` |
| `TTSUserProjectMapping_07072022` | Dated snapshot/backup of employee-to-project timesheet mapping with allocation dates and approver, from 07/07/2022. | — |
| `TTSUserProjectMapping_13032023` | Dated snapshot/backup of employee-to-project timesheet mapping with allocation and activation periods, from 13/03/2023. | — |
| `TTSUserProjectMapping_20210519` | Minimal dated snapshot/backup of employee-to-project mapping table (mapping, project config, employee IDs only), from 2021-05-19. | — |
| `TTSUserProjectMapping_20210527` | Minimal dated snapshot/backup of employee-to-project mapping table (mapping, project config, employee IDs only), from 2021-05-27. | — |
| `TTSUserProjectMapping_20210527_HT` | Minimal hotfix/test variant snapshot of the employee-to-project mapping table dated 2021-05-27. | — |
| `TTSUserProjectMapping_20210602` | Minimal dated snapshot/backup of employee-to-project mapping table (mapping, project config, employee IDs only), from 2021-06-02. | — |
| `TTSUserProjectMapping_20210619` | Dated snapshot/backup of employee-to-project timesheet mapping with allocation dates and approver, from 2021-06-19. | — |
| `TTSUserProjectMapping_20210807` | Dated snapshot/backup of employee-to-project timesheet mapping with allocation dates and approver, from 2021-08-07. | — |
| `TTSUserProjectMapping_20210826` | Dated snapshot/backup of employee-to-project timesheet mapping with allocation dates and approver, from 2021-08-26. | — |
| `TTSUserProjectMapping_20230310` | Dated snapshot/backup of employee-to-project timesheet mapping with allocation and activation periods, from 2023-03-10. | — |
| `TTSUserProjectMapping_bkp_17032023` | Backup copy of the employee-to-project timesheet mapping table taken 17/03/2023. | — |
| `TTSUserProjectMapping_bkp_3142023` | Backup copy of the employee-to-project timesheet mapping table taken 3/14/2023. | — |
| `TTSUserProjectMapping_BKP01302023` | Backup copy of the employee-to-project timesheet mapping table taken 01/30/2023. | — |
| `TTSUserProjectMapping_Bkp11222022` | Backup copy of the employee-to-project timesheet mapping table taken 11/22/2022. | — |
| `TTSUserProjectMapping_BKP13023` | Backup copy of the employee-to-project timesheet mapping table taken 1/30/23. | — |
| `TTSUserProjectMapping_bkp372023` | Backup copy of the employee-to-project timesheet mapping table taken 3/7/2023. | — |
| `TTSUserProjectMapping-20210727` | Dated backup/snapshot of the employee-to-project mapping table from 2021-07-27; column list unavailable. | — |
| `TTSUserProjectMappingHistory` | History log of employee-to-project timesheet mapping changes, including allocation, approver, and activation periods. | — |
| `TTSUserProjectMappingHistory_13032023` | Dated backup/snapshot of the TTSUserProjectMappingHistory audit table, from 13/03/2023. | — |
| `TTSUserProjectMappingHistory_20210619` | Dated backup/snapshot of the TTSUserProjectMappingHistory audit table, from 2021-06-19. | — |
| `TTSUserProjectMappingHistory_20230310` | Dated backup/snapshot of the TTSUserProjectMappingHistory audit table, from 2023-03-10. | — |
| `TTSUserProjectMappingHistory_bkp_17032023` | Backup copy of the TTSUserProjectMappingHistory audit table taken 17/03/2023. | — |
| `TTSUserProjectMappingHistory_Bkp11222022` | Backup copy of the TTSUserProjectMappingHistory audit table taken 11/22/2022. | — |
| `TTSUserProjectMappingHistory_BKP13023` | Backup copy of the TTSUserProjectMappingHistory audit table taken 1/30/23. | — |
| `TTSUserProjectMappingHistory_bkp3142023` | Backup copy of the TTSUserProjectMappingHistory audit table taken 3/14/2023. | — |
| `TTSUserProjectMappingHistory_bkp372023` | Backup copy of the TTSUserProjectMappingHistory audit table taken 3/7/2023. | — |
