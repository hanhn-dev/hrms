---
source-root: HRMS-DATABASE/HRMS/TABLES
generated-by: mechanical extraction (CREATE TABLE parse for columns/FKs) + LLM-inferred one-line descriptions from table name/columns
confidence: low-medium (descriptions are inferred, not sourced from comments — verify against source before relying on business meaning)
last-analyzed: 2026-07-08
---

# HRMS — Table Catalog

Database: `HRMS_PROD`. Core HR: employees, employers (tenants), roles/access, leave, attendance, payroll/salary, resignation, BGV, recruitment (RRS), confirmation (CMS), performance (PMS), the approval engine, ELMAH error log.

1106 tables (see `../../architecture/module-catalog.md`). Descriptions are inferred from table/column
names by an LLM pass, not from source comments (this codebase's CREATE TABLE scripts carry none) —
treat as a navigation aid, not authoritative business definition. "Depends on" lists FK targets found
via `FOREIGN KEY ... REFERENCES` in this table's own script and in ALTER scripts elsewhere in the module tree;
it omits self-referential FKs. A handful of tables use non-standard file formats the parser could not read
columns from — these are marked "(unparsed)".

| Table | Description | Depends on |
|---|---|---|
| `019_PersonalInfo_Template` | Import/export template layout for employee personal info fields (name, DOB, address, marital status). | — |
| `BrintonEmployeeDeActivate` | Tenant staging list of employees to deactivate, with designation and last working date. | — |
| `BrintonNewEmploymentNumber` | Tenant staging table mapping old to new employment numbers for employee transfers, with managers. | — |
| `BrintonRoleEmployee` | Tenant staging table of employees with role, designation, and sales territory/zone/district hierarchy. | — |
| `CompensationAnnexure` | Compensation annexure definitions linking pay components and structures to business units, locations, employer. | — |
| `CustomerTabConfigMaster` | Master config toggling tenant-specific onboarding/UI feature tabs and settings visibility per employer. | — |
| `Ecomak_SSIS_Temp_DomainDetailsMaster` | SSIS staging table for importing employee domain/experience details (Ecomak tenant). | — |
| `Ecomak_SSIS_Temp_TActivityMaster` | SSIS staging table for importing separation clearance activity master data (Ecomak tenant). | — |
| `Ecomak_SSIS_Temp_TActivityType` | SSIS staging table for importing clearance activity category/type master data (Ecomak tenant). | — |
| `Ecomak_SSIS_Temp_TAttachmentCategory` | SSIS staging table for importing document attachment category master data (Ecomak tenant). | — |
| `Ecomak_SSIS_Temp_TAttendanceRegularizationAndDays` | SSIS staging table for importing attendance regularization requests with day-wise details (Ecomak tenant). | — |
| `Ecomak_SSIS_Temp_TAttendanceRegularizeCategory` | SSIS staging table for importing attendance regularization category master data (Ecomak tenant). | — |
| `Ecomak_SSIS_Temp_TBank` | SSIS staging table for importing bank master data (Ecomak tenant). | — |
| `Ecomak_SSIS_Temp_TBankBranchDetails` | SSIS staging table for importing bank branch master data (Ecomak tenant). | — |
| `Ecomak_SSIS_Temp_TCalendarMaster` | SSIS staging table for importing work/holiday calendar master data (Ecomak tenant). | — |
| `Ecomak_SSIS_Temp_TCategory` | SSIS staging table for importing skill category master data (Ecomak tenant). | — |
| `Ecomak_SSIS_Temp_TCMSConfirmationComponents` | SSIS staging table for importing confirmation management system component configuration (Ecomak tenant). | — |
| `Ecomak_SSIS_Temp_TEmployeeBankDetails` | SSIS staging table for importing employee bank account details (Ecomak tenant). | — |
| `Ecomak_SSIS_Temp_TEmployeeContactDetails` | SSIS staging table for importing employee phone and email contact details (Ecomak tenant). | — |
| `Ecomak_SSIS_Temp_TEmployeeEmergencyContactDetails` | SSIS staging table for importing employee emergency contact details (Ecomak tenant). | — |
| `Ecomak_SSIS_Temp_TEmployeeFamilyDetails` | SSIS staging table for importing employee family/dependent member details (Ecomak tenant). | — |
| `Ecomak_SSIS_Temp_TEmployeeNomination` | SSIS staging table for importing employee nomination/beneficiary details (Ecomak tenant). | — |
| `Ecomak_SSIS_Temp_TEmployerDetails` | SSIS staging table for importing employer org hierarchy and password policy settings (Ecomak tenant). | — |
| `Ecomak_SSIS_Temp_TExitInterviewTemplate` | SSIS staging table for importing exit interview template master data (Ecomak tenant). | — |
| `Ecomak_SSIS_Temp_TGrade` | SSIS staging table for importing employee grade/band master data (Ecomak tenant). | — |
| `Ecomak_SSIS_Temp_THolidayMaster` | SSIS staging table for importing holiday master data per calendar (Ecomak tenant). | — |
| `Ecomak_SSIS_Temp_TLeaveBalance` | SSIS staging table for importing employee leave balance data (Ecomak tenant). | — |
| `Ecomak_SSIS_Temp_TLeaveRequestAndDays` | SSIS staging table for importing leave requests with day-wise leave details (Ecomak tenant). | — |
| `Ecomak_SSIS_Temp_TLeaveTypeMaster` | SSIS staging table for importing leave type policy rules (encashment, cancellation, eligibility) (Ecomak tenant). | — |
| `Ecomak_SSIS_Temp_TLocation` | SSIS staging table for importing work location master data (Ecomak tenant). | — |
| `Ecomak_SSIS_Temp_TMEmploymentTypes` | SSIS staging table for importing employment type master data (Ecomak tenant). | — |
| `Ecomak_SSIS_Temp_TMSkills` | SSIS staging table for importing skills master data (Ecomak tenant). | — |
| `Ecomak_SSIS_Temp_TOrgHierarchyDetails` | SSIS staging table for importing organization unit hierarchy data (Ecomak tenant). | — |
| `Ecomak_SSIS_Temp_TResignation` | SSIS staging table for importing resignation reason master data (Ecomak tenant). | — |
| `Ecomak_SSIS_Temp_TResignationDetails` | SSIS staging table for importing employee resignation/separation request details (Ecomak tenant). | — |
| `Ecomak_SSIS_Temp_TROLES` | SSIS staging table for importing user role master data (Ecomak tenant). | — |
| `Ecomak_SSIS_Temp_TSecondaryActivityOwnerRole` | SSIS staging table for importing secondary clearance activity owner role master data (Ecomak tenant). | — |
| `Ecomak_SSIS_Temp_TSeparationType` | SSIS staging table for importing separation type master data (Ecomak tenant). | — |
| `Ecomak_SSIS_Temp_TSHIFTMASTER` | SSIS staging table for importing work shift master timing rules (Ecomak tenant). | — |
| `Ecomak_SSIS_Temp_Ttitle` | SSIS staging table for importing personal title master data (Ecomak tenant). | — |
| `Ecomak_SSIS_Temp_TWeeklyOffMaster` | SSIS staging table for importing weekly-off day master data by calendar (Ecomak tenant). | — |
| `Ecomak_SSIS_Temp_TWorkFromHomeRequestAndDays` | SSIS staging table for importing work-from-home requests with day-wise details (Ecomak tenant). | — |
| `EcomakGeoAttendanceCheckInOut` | Geo-tagged attendance check-in/out event log with device, GPS coordinates, and sync status. | — |
| `EcomakSaralPay` | Staging table for importing employee personal and payroll data from the SaralPay system. | — |
| `ELMAH_Error` | ELMAH error logging table storing unhandled application exceptions and request context. | — |
| `EmployeeContactInformation` | Staging/export table with employee identity, joining date, and basic contact details. | — |
| `EmployeeDeactivateNw` | Staging table listing employees to deactivate with manager, designation, and last working date. | — |
| `Employer_Info` | Reference table mapping employer GUID to employer/employee display name. | — |
| `GenXInfo_SSIS_Temp_DomainDetailsMaster` | SSIS staging table for importing employee domain/experience details (GenXInfo tenant). | — |
| `GenXInfo_SSIS_Temp_TActivityMaster` | SSIS staging table for importing separation clearance activity master data (GenXInfo tenant). | — |
| `GenXInfo_SSIS_Temp_TActivityType` | SSIS staging table for importing clearance activity category/type master data (GenXInfo tenant). | — |
| `GenXInfo_SSIS_Temp_TAttachmentCategory` | SSIS staging table for importing document attachment category master data (GenXInfo tenant). | — |
| `GenXInfo_SSIS_Temp_TAttendanceRegularizationAndDays` | SSIS staging table for importing attendance regularization requests with day-wise details (GenXInfo tenant). | — |
| `GenXInfo_SSIS_Temp_TAttendanceRegularizeCategory` | SSIS staging table for importing attendance regularization category master data (GenXInfo tenant). | — |
| `GenXInfo_SSIS_Temp_TBank` | SSIS staging table for importing bank master data (GenXInfo tenant). | — |
| `GenXInfo_SSIS_Temp_TBankBranchDetails` | SSIS staging table for importing bank branch master data (GenXInfo tenant). | — |
| `GenXInfo_SSIS_Temp_TCalendarMaster` | SSIS staging table for importing work/holiday calendar master data (GenXInfo tenant). | — |
| `GenXInfo_SSIS_Temp_TCategory` | SSIS staging table for importing skill category master data (GenXInfo tenant). | — |
| `GenXInfo_SSIS_Temp_TCMSConfirmationComponents` | SSIS staging table for importing confirmation management system component configuration (GenXInfo tenant). | — |
| `GenXInfo_SSIS_Temp_TEmployee` | SSIS staging table for importing full employee master personal details (GenXInfo tenant). | — |
| `GenXInfo_SSIS_Temp_TEmployeeBankDetails` | SSIS staging table for importing employee bank account details during GenXInfo data migration. | — |
| `GenXInfo_SSIS_Temp_TEmployeeContactDetails` | SSIS staging table for importing employee phone and personal email contact details during migration. | — |
| `GenXInfo_SSIS_Temp_TEmployeeEmergencyContactDetails` | SSIS staging table for importing employee emergency contact details during migration. | — |
| `GenXInfo_SSIS_Temp_TEmployeeFamilyDetails` | SSIS staging table for importing employee family/dependent member details during migration. | — |
| `GenXInfo_SSIS_Temp_TEmployeeInfo` | SSIS staging table for importing employee job/employment details (designation, grade, joining date) during migration. | — |
| `GenXInfo_SSIS_Temp_TEmployeeNomination` | SSIS staging table for importing employee nominee/beneficiary details during migration. | — |
| `GenXInfo_SSIS_Temp_TEmployerDetails` | SSIS staging table for importing employer/company configuration and password policy settings during migration. | — |
| `GenXInfo_SSIS_Temp_TExitInterviewTemplate` | SSIS staging table for importing exit interview template names during migration. | — |
| `GenXInfo_SSIS_Temp_TGrade` | SSIS staging table for importing employee grade and grade band master data during migration. | — |
| `GenXInfo_SSIS_Temp_THolidayMaster` | SSIS staging table for importing holiday calendar entries during migration. | — |
| `GenXInfo_SSIS_Temp_TLeaveBalance` | SSIS staging table for importing employee leave balance-days data during migration. | — |
| `GenXInfo_SSIS_Temp_TLeaveRequestAndDays` | SSIS staging table for importing leave request records and their day-wise leave details during migration. | — |
| `GenXInfo_SSIS_Temp_TLeaveTypeMaster` | SSIS staging table for importing leave type policy rules (eligibility, encashment, limits) during migration. | — |
| `GenXInfo_SSIS_Temp_TLocation` | SSIS staging table for importing office/branch location master data during migration. | — |
| `GenXInfo_SSIS_Temp_TMEmploymentTypes` | SSIS staging table for importing employment type master data during migration. | — |
| `GenXInfo_SSIS_Temp_TMSkills` | SSIS staging table for importing employee skill master data during migration. | — |
| `GenXInfo_SSIS_Temp_TOrgHierarchyDetails` | SSIS staging table for importing organization unit hierarchy data during migration. | — |
| `GenXInfo_SSIS_Temp_TResignation` | SSIS staging table for importing resignation reason master data during migration. | — |
| `GenXInfo_SSIS_Temp_TResignationDetails` | SSIS staging table for importing employee resignation/separation case details during migration. | — |
| `GenXInfo_SSIS_Temp_TROLES` | SSIS staging table for importing user role master data during migration. | — |
| `GenXInfo_SSIS_Temp_TSecondaryActivityOwnerRole` | SSIS staging table for importing secondary activity owner role data during migration. | — |
| `GenXInfo_SSIS_Temp_TSeparationType` | SSIS staging table for importing separation type master data during migration. | — |
| `GenXInfo_SSIS_Temp_TSHIFTMASTER` | SSIS staging table for importing shift master timing/grace-period configuration during migration. | — |
| `GenXInfo_SSIS_Temp_Ttitle` | SSIS staging table for importing employee title/salutation master data during migration. | — |
| `GenXInfo_SSIS_Temp_TWeeklyOffMaster` | SSIS staging table for importing weekly-off calendar configuration during migration. | — |
| `GenXInfo_SSIS_Temp_TWorkFromHomeRequestAndDays` | SSIS staging table for importing work-from-home request records and day-wise details during migration. | — |
| `GeoAttendanceCheckInOut` | Geo-tagged attendance log recording employee check-in/out date, time, and punch location. | — |
| `Global_OfficialInfo_Template` | Bulk-upload template defining employee official/job info fields (designation, grade, dates) for import. | — |
| `Global_PersonalInfo_Template` | Bulk-upload template defining employee personal info fields (name, DOB, address, IDs) for import. | — |
| `GlobalEmployeeData` | Bulk import staging table combining employee personal and official/job info fields. | — |
| `HRMSModules` | Matrix mapping enabled HRMS module names against client/company codes. | — |
| `IITEXP` | Lookup linking a TEmployeeInfo import record to its prior work experience in months. | — |
| `Import_AllLeave` | Bulk import staging table of employee leave balances, usage, and lapse details by leave type and year. | — |
| `Import_Contactinfo` | Bulk import staging table of employee contact details (phone, email) keyed by employment number. | — |
| `Import_Contactinfo1` | Secondary/duplicate staging table for bulk-importing employee contact details. | — |
| `Import_Officialinfo` | Bulk import staging table of employee official/job assignment details (designation, grade, manager). | — |
| `Import_officialInfo1` | Secondary/duplicate staging table for bulk-importing employee official/job assignment details. | — |
| `import_optionalHoliday` | Bulk import staging table of optional holiday leave applications and their approval status per employee. | — |
| `import_personalinfo` | Bulk import staging table of employee personal details (name, DOB, address, marital status). | — |
| `Import_PersonalInfo1` | Secondary/duplicate staging table for bulk-importing employee personal details. | — |
| `Import_Separation_Data` | Bulk import staging table of employee resignation/separation case details and approval workflow status. | — |
| `JFEEmployeeDataFiles` | Bulk import staging table combining employee personal and official info fields for JFE data load. | — |
| `JobLocationMappingData` | Mapping table pairing old and new location IDs, per named table, for remapping location references. | — |
| `NiyatiGroupEmployeeExperiance` | Staging table of employee prior work experience (months) and marital status for a group data import. | — |
| `Nyati_NBPL` | Minimal staging table listing employment numbers and names for the Nyati NBPL entity import. | — |
| `Nyati_NECPL` | Minimal staging table listing employment numbers and names for the Nyati NECPL entity import. | — |
| `OccuranceVialoationActivityDetail` | Condition/threshold rule detail (points, card color) defining scoring for an occurrence/violation activity. | — |
| `OccuranceVialoationActivityMaster` | Master list of disciplinary occurrence/violation activities configured per module and employer. | — |
| `OccuranceVialoationCategory` | Master list of occurrence/violation categories used to classify violation-related fields. | — |
| `OccuranceVialoationCategoryFields` | Field definitions within an occurrence/violation category, mapped to underlying database columns. | — |
| `OccuranceVialoationConditionMaster` | Master list of condition types usable in occurrence/violation rule definitions. | — |
| `OccuranceVialoationConditionOperatorMaster` | Master list of comparison operators available for occurrence/violation rule conditions. | — |
| `OccuranceVialoationExclude` | Exclusion rules exempting specific employees or parameters from an occurrence/violation activity. | — |
| `OccuranceVialoationFieldTemplate` | Named template grouping category fields for occurrence/violation configuration per employer. | — |
| `OccuranceVialoationFieldTemplateDetail` | Detail rows linking an occurrence/violation field template to specific categories and fields. | — |
| `OccuranceVialoationModuleCondition` | Mapping of applicable rule conditions to a given module for occurrence/violation scoring. | — |
| `OccuranceVialoationModuleConditionDetail` | Operator detail rows for a module's condition in occurrence/violation rule configuration. | — |
| `OccuranceVialoationSPCategory` | Mapping linking occurrence/violation categories to stored-procedure categories per module and employer. | — |
| `OccuranceVialoationSPsCategoryMaster` | Master list of stored-procedure categories used to compute occurrence/violation activities. | — |
| `POBCandidate` | Pre-onboarding candidate personal, identity, and address details captured before hire confirmation. | `POBCandidateAuthenticationType` |
| `POBCandidateAppointmentLetter` | Onboarding candidate's appointment letter details: job title, CTC, probation, notice period, status. | `POBCandidate` |
| `POBCandidateAppointmentLetterHistory` | Audit/history mirror of POBCandidateAppointmentLetter capturing prior versions of appointment letters. | — |
| `POBCandidateAttachment` | File attachments uploaded for an onboarding candidate, categorized by attachment type. | — |
| `POBCandidateAuthenticationType` | Lookup of authentication/login method types available for onboarding candidates per employer. | — |
| `POBCandidateBankDetails` | Onboarding candidate's bank account details (account no, IBAN, branch) for payroll setup. | `POBCandidate` |
| `POBCandidateEducationDetails` | Onboarding candidate's education/qualification history including institute, grade, and sponsorship. | `POBCandidate` |
| `POBCandidateEducationDetails_bkp` | Backup copy of POBCandidateEducationDetails preserving prior candidate education records. | — |
| `POBCandidateEmergencyContacts` | Emergency contact details (name, relationship, phone, address) for onboarding candidates. | `POBCandidate` |
| `POBCandidateFamilyDetails` | Onboarding candidate's family/dependent details including relation, DOB, and insurance status. | `POBCandidate` |
| `POBCandidateHistory` | Status change/audit history log with comments for onboarding candidates. | `POBCandidate` |
| `POBCandidateLogin` | Onboarding candidate portal login credentials and access URL/expiry details. | — |
| `POBCandidateSkillsDetail` | Onboarding candidate's self-rated skills with years/months of experience per skill. | `POBCandidate` |
| `POBCandidateTemplate` | Mapping of onboarding candidates to assigned document/form templates. | `POBTemplate` |
| `POBCandidateUploadDocument` | Documents uploaded by onboarding candidates, storing document name and file reference. | `POBCandidate` |
| `POBConfiguredTemplate` | Employer-configured onboarding templates with selected fields to capture. | — |
| `POBContactDetails` | Onboarding candidate's contact details: work/personal email, phone, and fax numbers. | `POBCandidate` |
| `POBEmployeeDomainDetails` | Onboarding candidate's functional domain experience mapped in months. | `POBCandidate` |
| `POBLookupEmployerMapping` | Employer-specific mapping/configuration of onboarding lookup items, marking mandatory fields. | — |
| `POBLookupItems` | Individual lookup items belonging to an onboarding lookup category. | — |
| `POBLookupMaster` | Master list of onboarding lookup categories used across candidate forms. | — |
| `POBPastEmploymentDetails` | Onboarding candidate's past employment/work history including role, company, and leaving reason. | `POBCandidate` |
| `POBPastEmploymentDetails_bkp` | Backup copy of POBPastEmploymentDetails preserving prior past-employment records. | — |
| `POBPreOfferCandiadteAttachment` | Attachments uploaded for candidates at the pre-offer stage of onboarding. | — |
| `POBTemplate` | Master list of onboarding document/letter templates defined per employer. | — |
| `POBTemplateCategory` | Categories used to classify onboarding templates. | — |
| `POBTemplateFields` | Lookup fields configured to appear within a given onboarding template. | `POBTemplate` |
| `POBTemplateForms` | Generated onboarding form/document files associated with a template. | `POBTemplate` |
| `POBvisaPassportdetails` | Onboarding candidate's visa and passport details including numbers, issue/expiry dates. | `POBCandidate` |
| `Remote_Location_Template` | Import template of geo-tagged remote work locations with coordinates, radius, and face/location flags. | — |
| `Remotelocation_nbpl` | Client-specific (NBPL) staging data for remote/geo-tagged attendance locations. | — |
| `RemoteLocation_NECPL` | Client-specific (NECPL) staging data for remote/geo-tagged attendance locations. | — |
| `Remotelocation_necplLatest` | Latest version of client-specific (NECPL) remote/geo-tagged attendance location data. | — |
| `SAMPLE_NAME` | Sample/test table storing employee first and last name with employee ID. | — |
| `SaralPayEcomak` | Imported employee/payroll master data from the SaralPay system for the Ecomak client. | — |
| `SSIS_Temp_AddWorkFLow` | SSIS staging table for importing approval workflow setup and routing definitions. | — |
| `SSIS_Temp_AddWorkFLow_History` | Audit/history mirror of SSIS_Temp_AddWorkFLow capturing prior workflow import records. | — |
| `SSIS_Temp_AssetCategory` | SSIS staging table for importing asset category master data. | — |
| `SSIS_Temp_AssetCategory_History` | Audit/history mirror of SSIS_Temp_AssetCategory capturing prior asset category imports. | — |
| `SSIS_Temp_AssetMapping` | SSIS staging table for importing asset allocation records to employees. | — |
| `SSIS_Temp_AssetMapping_Deallocation` | SSIS staging table for importing asset deallocation records from employees. | — |
| `SSIS_Temp_AssetMapping_Deallocation_History` | Audit/history mirror of SSIS_Temp_AssetMapping_Deallocation capturing prior deallocation imports. | — |
| `SSIS_Temp_AssetMapping_History` | Audit/history mirror of SSIS_Temp_AssetMapping capturing prior asset allocation imports. | — |
| `SSIS_Temp_AssetRegistration` | SSIS staging table for importing new asset registration details (purchase, vendor, warranty). | — |
| `SSIS_Temp_AssetRegistration_History` | Audit/history mirror of SSIS_Temp_AssetRegistration capturing prior asset registration imports. | — |
| `SSIS_Temp_AttendanceOverTimeRule` | SSIS staging table for importing attendance overtime rule configurations. | — |
| `SSIS_Temp_AttendanceOverTimeRule_History` | Audit/history mirror of SSIS_Temp_AttendanceOverTimeRule capturing prior overtime rule imports. | — |
| `SSIS_Temp_BulkDocumentImportTemplate` | SSIS staging table for bulk importing document categories for employees. | — |
| `SSIS_Temp_BulkDocumentImportTemplate_History` | Audit/history mirror of SSIS_Temp_BulkDocumentImportTemplate capturing prior bulk document imports. | — |
| `SSIS_Temp_CRBManageReferenceDataTemplate` | SSIS staging table for importing conference room booking reference data (type, text, room). | — |
| `SSIS_Temp_CRBManageReferenceDataTemplate_History` | Audit/history mirror of SSIS_Temp_CRBManageReferenceDataTemplate capturing prior reference data imports. | — |
| `SSIS_Temp_CRBMasterDataTemplate` | SSIS staging table for importing conference room master data (floor, room, seating capacity). | — |
| `SSIS_Temp_CRBMasterDataTemplate_History` | Audit/history mirror of SSIS_Temp_CRBMasterDataTemplate capturing prior conference room master imports. | — |
| `SSIS_Temp_DefineWorkFlow` | SSIS staging table for importing approval workflow definitions and approver notifications. | — |
| `SSIS_Temp_DefineWorkFlow_History` | Audit/history mirror of SSIS_Temp_DefineWorkFlow capturing prior workflow definition imports. | — |
| `SSIS_Temp_DomainDetailsMaster` | SSIS staging table for importing employee functional domain/experience data. | — |
| `SSIS_Temp_DomainDetailsMaster_Brinton` | Client-specific (Brinton) variant of the SSIS staging table for employee domain details import. | — |
| `SSIS_Temp_DomainDetailsMaster_History` | Audit/history mirror of SSIS_Temp_DomainDetailsMaster capturing prior domain details imports. | — |
| `SSIS_Temp_EducationDeatilsTemplate` | SSIS staging table for importing employee education details (institute, discipline, sponsorship). | — |
| `SSIS_Temp_EducationDeatilsTemplate_History` | Audit/history mirror of SSIS_Temp_EducationDeatilsTemplate capturing prior education detail imports. | — |
| `SSIS_Temp_ERMasterDataTemplate` | SSIS staging table for importing employee relations (ER) reference master data. | — |
| `SSIS_Temp_ERMasterDataTemplate_History` | Audit/history mirror of SSIS_Temp_ERMasterDataTemplate capturing prior versions of ER master data import rows. | — |
| `SSIS_Temp_LeaveCreditRulesTemplate` | SSIS staging table for bulk-importing leave credit rule templates (frequency, rounding, pro-rata, credit days). | — |
| `SSIS_Temp_LeaveCreditRulesTemplate_History` | Audit/history mirror of SSIS_Temp_LeaveCreditRulesTemplate capturing prior versions of imported leave credit rules. | — |
| `SSIS_Temp_ManageAllocationMasterDataTemplate` | SSIS staging table for bulk-importing Manage Allocation module master reference data by employer. | — |
| `SSIS_Temp_ManageAllocationMasterDataTemplate_History` | Audit/history mirror of SSIS_Temp_ManageAllocationMasterDataTemplate capturing prior versions of imported rows. | — |
| `SSIS_Temp_MAProjectTemplate` | SSIS staging table for bulk-importing Manage Allocation project details including client, code, dates, site allowance. | — |
| `SSIS_Temp_Master_RASTemplate` | SSIS staging table for bulk-importing RAS project/site details such as client, dates, region, site allowance. | — |
| `SSIS_Temp_Master_RASTemplate_History` | Audit/history mirror of SSIS_Temp_Master_RASTemplate capturing prior versions of imported RAS project rows. | — |
| `SSIS_Temp_MasterEducationDeatilsTemplate` | SSIS staging table for bulk-importing employee education master data (institution, university, discipline, level). | — |
| `SSIS_Temp_MasterEducationDeatilsTemplate_History` | Audit/history mirror of SSIS_Temp_MasterEducationDeatilsTemplate capturing prior versions of imported education rows. | — |
| `SSIS_Temp_MasterRASMasterDataTemplate` | SSIS staging table for bulk-importing RAS module master reference type/text data by employer. | — |
| `SSIS_Temp_MasterRASMasterDataTemplate_History` | Audit/history mirror of SSIS_Temp_MasterRASMasterDataTemplate capturing prior versions of imported RAS reference rows. | — |
| `SSIS_Temp_RecruitmentManagementMasterTemplate` | SSIS staging table for bulk-importing recruitment master data: hiring reasons, billing types, expertise levels, interviewers, feedback templates. | — |
| `SSIS_Temp_RecruitmentManagementMasterTemplate_History` | Audit/history mirror of SSIS_Temp_RecruitmentManagementMasterTemplate capturing prior versions of imported recruitment master rows. | — |
| `SSIS_Temp_RemoteLocationGeoTracking` | SSIS staging table for bulk-importing employee remote-location geo-tracking settings (interval, mode, tracking window). | — |
| `SSIS_Temp_RemoteLocationGeoTracking_History` | Audit/history mirror of SSIS_Temp_RemoteLocationGeoTracking capturing prior versions of imported geo-tracking rows. | — |
| `SSIS_Temp_RemoteLocationTemplate` | SSIS staging table for bulk-importing remote work location geofences (coordinates, radius, face-auth, auto check-in). | — |
| `SSIS_Temp_RemoteLocationTemplate_History` | Audit/history mirror of SSIS_Temp_RemoteLocationTemplate capturing prior versions of imported remote location rows. | — |
| `SSIS_Temp_SurveyMasterQuestionBankTemplate` | SSIS staging table for bulk-importing survey question bank entries (category, topic, answer type, question text). | — |
| `SSIS_Temp_SurveyMasterQuestionBankTemplate_History` | Audit/history mirror of SSIS_Temp_SurveyMasterQuestionBankTemplate capturing prior versions of imported survey question rows. | — |
| `SSIS_Temp_TActivityMaster` | SSIS staging table for bulk-importing clearance activity master definitions (name, owner, type) by employer. | — |
| `SSIS_Temp_TActivityMaster_Brinton` | Tenant-specific (Brinton) variant of SSIS_Temp_TActivityMaster staging table for clearance activity imports. | — |
| `SSIS_Temp_TActivityType` | SSIS staging table for bulk-importing clearance activity type/category master data by employer. | — |
| `SSIS_Temp_TActivityType_Brinton` | Tenant-specific (Brinton) variant of SSIS_Temp_TActivityType staging table for clearance activity type imports. | — |
| `SSIS_Temp_TAttachmentCategory` | SSIS staging table for bulk-importing document/attachment category master values by employer. | — |
| `SSIS_Temp_TAttachmentCategory_Brinton` | Tenant-specific (Brinton) variant of SSIS_Temp_TAttachmentCategory staging table for attachment category imports. | — |
| `SSIS_Temp_TAttendanceRegularizationAndDays` | SSIS staging table for bulk-importing employee attendance regularization requests (dates, reason, duration, status). | — |
| `SSIS_Temp_TAttendanceRegularizationAndDays_Brinton` | Tenant-specific (Brinton) variant of SSIS_Temp_TAttendanceRegularizationAndDays staging table for attendance regularization imports. | — |
| `SSIS_Temp_TAttendanceRegularizeCategory` | SSIS staging table (columns not captured) for bulk-importing attendance regularization category master data. | — |
| `SSIS_Temp_TAttendanceRegularizeCategory_Brinton` | Tenant-specific (Brinton) variant staging table for bulk-importing attendance regularization category master data. | — |
| `SSIS_Temp_TAttendanceRegularizeCategory_History` | Audit/history mirror of SSIS_Temp_TAttendanceRegularizeCategory capturing prior versions of imported category rows. | — |
| `SSIS_Temp_TBank` | SSIS staging table for bulk-importing bank master data (bank name) by employer. | — |
| `SSIS_Temp_TBank_Brinton` | Tenant-specific (Brinton) variant of SSIS_Temp_TBank staging table for bank master imports. | — |
| `SSIS_Temp_Tbank_History` | Audit/history mirror of SSIS_Temp_TBank capturing prior versions of imported bank master rows. | — |
| `SSIS_Temp_TBankBranchDetails` | SSIS staging table for bulk-importing bank branch master details (branch name, bank identifier) by employer. | — |
| `SSIS_Temp_TBankBranchDetails_Brinton` | Tenant-specific (Brinton) variant of SSIS_Temp_TBankBranchDetails staging table for bank branch imports. | — |
| `SSIS_Temp_TBankBranchDetails_History` | Audit/history mirror of SSIS_Temp_TBankBranchDetails capturing prior versions of imported bank branch rows. | — |
| `SSIS_Temp_TCalendarMaster` | SSIS staging table for bulk-importing calendar master definitions (name, description) by employer. | — |
| `SSIS_Temp_TCalendarMaster_Brinton` | Tenant-specific (Brinton) variant of SSIS_Temp_TCalendarMaster staging table for calendar master imports. | — |
| `SSIS_Temp_TCalendarMaster_History` | Audit/history mirror of SSIS_Temp_TCalendarMaster capturing prior versions of imported calendar rows. | — |
| `SSIS_Temp_TCategory` | SSIS staging table for bulk-importing skill category master values by employer. | — |
| `SSIS_Temp_TCategory_Brinton` | Tenant-specific (Brinton) variant of SSIS_Temp_TCategory staging table for skill category imports. | — |
| `SSIS_Temp_TCategory_History` | Audit/history mirror of SSIS_Temp_TCategory capturing prior versions of imported skill category rows. | — |
| `SSIS_Temp_TCMSConfirmationComponents` | SSIS staging table for bulk-importing confirmation/probation management component definitions (name, type, order, choices). | — |
| `SSIS_Temp_TCMSConfirmationComponents_Brinton` | Tenant-specific (Brinton) variant of SSIS_Temp_TCMSConfirmationComponents staging table for confirmation component imports. | — |
| `SSIS_Temp_TCMSConfirmationComponents_History` | Audit/history mirror of SSIS_Temp_TCMSConfirmationComponents capturing prior versions of imported confirmation component rows. | — |
| `SSIS_Temp_TEmployee` | SSIS staging table for bulk-importing core employee personal/demographic master data by employer. | — |
| `SSIS_Temp_TEmployee_Brinton` | Tenant-specific (Brinton) variant of SSIS_Temp_TEmployee staging table for employee master data imports. | — |
| `SSIS_Temp_TEmployee_History` | Audit/history mirror of SSIS_Temp_TEmployee capturing prior versions of imported employee master rows. | — |
| `SSIS_Temp_TEmployeeBankDetails` | SSIS staging table for bulk-importing employee bank account details (bank, branch, account number, type) by employer. | — |
| `SSIS_Temp_TEmployeeBankDetails_Brinton` | Tenant-specific (Brinton) variant of SSIS_Temp_TEmployeeBankDetails staging table for employee bank detail imports. | — |
| `SSIS_Temp_TEmployeeBankDetails_History` | Audit/history mirror of SSIS_Temp_TEmployeeBankDetails capturing prior versions of imported employee bank rows. | — |
| `SSIS_Temp_TEmployeeContactDetails` | SSIS staging table for bulk-importing employee contact details (phone numbers, personal email) by employer. | — |
| `SSIS_Temp_TEmployeeContactDetails_Brinton` | Tenant-specific (Brinton) variant of SSIS_Temp_TEmployeeContactDetails staging table for employee contact imports. | — |
| `SSIS_Temp_TEmployeeContactDetails_History` | Audit/history mirror of SSIS_Temp_TEmployeeContactDetails capturing prior versions of imported contact detail rows. | — |
| `SSIS_Temp_TEmployeeEmergencyContactDetails` | SSIS staging table for bulk-importing employee emergency contact details (name, relationship, phone, address) by employer. | — |
| `SSIS_Temp_TEmployeeEmergencyContactDetails_Brinton` | Tenant-specific (Brinton) variant of SSIS_Temp_TEmployeeEmergencyContactDetails staging table for emergency contact imports. | — |
| `SSIS_Temp_TEmployeeEmergencyContactDetails_History` | Audit/history mirror of SSIS_Temp_TEmployeeEmergencyContactDetails capturing prior versions of imported emergency contact rows. | — |
| `SSIS_Temp_TEmployeeFamilyDetails` | SSIS staging table for bulk-importing employee family/dependent details (relationship, DOB, gender, dependent status) by employer. | — |
| `SSIS_Temp_TEmployeeFamilyDetails_Brinton` | Tenant-specific (Brinton) variant of SSIS_Temp_TEmployeeFamilyDetails staging table for employee family detail imports. | — |
| `SSIS_Temp_TEmployeeFamilyDetails_History` | Audit/history mirror of TEmployeeFamilyDetails capturing prior versions of employee family/dependent records. | — |
| `SSIS_Temp_TEmployeeInfo` | SSIS staging table for bulk-importing employee core info (designation, joining, grade, manager, PF/UAN/ESIC). | — |
| `SSIS_Temp_TEmployeeInfo_Brinton` | Client-specific (Brinton) SSIS staging variant for importing employee core/employment info. | — |
| `SSIS_Temp_TEmployeeInfo_History` | Audit/history mirror of SSIS_Temp_TEmployeeInfo capturing prior versions of imported employee info rows. | — |
| `SSIS_Temp_TEmployeeNomination` | SSIS staging table for importing employee nominee/beneficiary details (relationship, share percentage). | — |
| `SSIS_Temp_TEmployeeNomination_Brinton` | Client-specific (Brinton) SSIS staging variant for importing employee nomination/beneficiary data. | — |
| `SSIS_Temp_TEmployeeNomination_History` | Audit/history mirror of SSIS_Temp_TEmployeeNomination capturing prior versions of imported nomination rows. | — |
| `SSIS_Temp_TEmployerDetails` | SSIS staging table for importing employer/organization setup data including contact info and password policy settings. | — |
| `SSIS_Temp_TEmployerDetails_Brinton` | Client-specific (Brinton) SSIS staging variant for importing employer/organization setup data. | — |
| `SSIS_Temp_TExitInterviewTemplate` | SSIS staging table for importing exit interview template definitions per employer. | — |
| `SSIS_Temp_TExitInterviewTemplate_Brinton` | Client-specific (Brinton) SSIS staging variant for importing exit interview templates. | — |
| `SSIS_Temp_TGrade` | SSIS staging table for importing employee grade/grade-band master data. | — |
| `SSIS_Temp_TGrade_Brinton` | Client-specific (Brinton) SSIS staging variant for importing grade/grade-band master data. | — |
| `SSIS_Temp_TGrade_History` | Audit/history mirror of SSIS_Temp_TGrade capturing prior versions of imported grade rows. | — |
| `SSIS_Temp_THelpdeskCategory` | SSIS staging table for importing helpdesk ticket category master data. | — |
| `SSIS_Temp_THelpdeskCategory_History` | Audit/history mirror of SSIS_Temp_THelpdeskCategory capturing prior versions of imported category rows. | — |
| `SSIS_Temp_THolidayMaster` | SSIS staging table for importing holiday calendar entries (date, name, optional/half-day flags). | — |
| `SSIS_Temp_THolidayMaster_Brinton` | Client-specific (Brinton) SSIS staging variant for importing holiday calendar entries. | — |
| `SSIS_Temp_THolidayMaster_History` | Audit/history mirror of SSIS_Temp_THolidayMaster capturing prior versions of imported holiday rows. | — |
| `SSIS_Temp_TimeportManageReferenceDataTemplate` | SSIS staging table for importing Timeport reference data templates (client/project/billable/holiday codes). | — |
| `SSIS_Temp_TimeportManageReferenceDataTemplate_History` | Audit/history mirror of the Timeport reference data template staging table capturing prior imported rows. | — |
| `SSIS_Temp_TimeportResourceMappingData` | SSIS staging table for importing timesheet resource-to-project/approver mapping assignments. | — |
| `SSIS_Temp_TimeportResourceMappingData_History` | Audit/history mirror of the Timeport resource mapping staging table capturing prior imported rows. | — |
| `SSIS_Temp_TimeportSetupMasterTemplate` | SSIS staging table for importing Timeport project setup templates (client, cost center, review cycle, timesheet options). | — |
| `SSIS_Temp_TimeportSetupMasterTemplate_History` | Audit/history mirror of the Timeport setup master template staging table capturing prior imported rows. | — |
| `SSIS_Temp_TimePortTemplate` | SSIS staging table for importing Timeport project templates (client, project code, region, date range). | — |
| `SSIS_Temp_TLeaveBalance` | SSIS staging table for importing employee leave balance adjustments by leave type. | — |
| `SSIS_Temp_TLeaveBalance_Brinton` | Client-specific (Brinton) SSIS staging variant for importing employee leave balances. | — |
| `SSIS_Temp_TLeaveBalance_GPX` | Client-specific (GPX) SSIS staging variant for importing employee leave balances. | — |
| `SSIS_Temp_TLeaveBalance_History` | Audit/history mirror of SSIS_Temp_TLeaveBalance capturing prior versions of imported leave balance rows. | — |
| `SSIS_Temp_TLeaveBalance_temp` | Temporary/working copy of the SSIS leave balance staging data (same shape as the GPX variant). | — |
| `SSIS_Temp_TLeaveRequestAndDays` | SSIS staging table for importing individual leave requests and their day-level breakdown per employee. | — |
| `SSIS_Temp_TLeaveRequestAndDays_Brinton` | Client-specific (Brinton) SSIS staging variant for importing leave requests and day-level details. | — |
| `SSIS_Temp_TLeaveTypeMaster` | SSIS staging table for importing leave type master configuration (eligibility rules, encashment, carry-forward limits). | — |
| `SSIS_Temp_TLeaveTypeMaster_Brinton` | Client-specific (Brinton) SSIS staging variant for importing leave type master configuration. | — |
| `SSIS_Temp_TLeaveTypeMaster_History` | Audit/history mirror of SSIS_Temp_TLeaveTypeMaster capturing prior versions of imported leave type rows. | — |
| `SSIS_Temp_TLocation` | SSIS staging table for importing work location/branch master data with address and contact details. | — |
| `SSIS_Temp_TLocation_Brinton` | Client-specific (Brinton) SSIS staging variant for importing work location master data. | — |
| `SSIS_Temp_TLocation_History` | Audit/history mirror of SSIS_Temp_TLocation capturing prior versions of imported location rows. | — |
| `SSIS_Temp_tLocation_HT` | Client-specific (HT) SSIS staging variant for importing work location master data. | — |
| `SSIS_Temp_TMEmploymentTypes` | SSIS staging table for importing employment type master data (e.g. confirmation status, employee-code prefix). | — |
| `SSIS_Temp_TMEmploymentTypes_Brinton` | Client-specific (Brinton) SSIS staging variant for importing employment type master data. | — |
| `SSIS_Temp_TMEmploymentTypes_History` | Audit/history mirror of SSIS_Temp_TMEmploymentTypes capturing prior versions of imported rows. | — |
| `SSIS_Temp_TMSkills` | SSIS staging table for importing employee/organization skill master data with skill type and description. | — |
| `SSIS_Temp_TMSkills_Brinton` | Client-specific (Brinton) SSIS staging variant for importing skill master data. | — |
| `SSIS_Temp_TMSkills_History` | Audit/history mirror of SSIS_Temp_TMSkills capturing prior versions of imported skill rows. | — |
| `SSIS_Temp_TOrgHierarchyDetails` | SSIS staging table for importing organization unit/hierarchy master data. | — |
| `SSIS_Temp_TOrgHierarchyDetails_Brinton` | Client-specific (Brinton) SSIS staging variant for importing organization hierarchy unit data. | — |
| `SSIS_Temp_TPMSCompetencyMaster` | SSIS staging table for importing performance-management competency master definitions. | — |
| `SSIS_Temp_TPMSGoalCategoryDetails` | SSIS staging table for importing performance-management goal category/KRA-KPA definitions and targets. | — |
| `SSIS_Temp_TrainingMasterDataTemplate` | SSIS staging table for importing training-module reference/master data templates. | — |
| `SSIS_Temp_TrainingMasterDataTemplate_History` | Audit/history mirror of the training master data template staging table capturing prior imported rows. | — |
| `SSIS_Temp_TravelMasterTemplate` | SSIS staging table for importing travel-module reference/master data templates. | — |
| `SSIS_Temp_TravelMasterTemplate_History` | Audit/history mirror of the travel master template staging table capturing prior imported rows. | — |
| `SSIS_Temp_TResignation` | SSIS staging table for importing resignation reasons, separation types, and clearance activity definitions. | — |
| `SSIS_Temp_TResignation_Brinton` | Client-specific (Brinton) SSIS staging variant for importing resignation reason master data. | — |
| `SSIS_Temp_TResignation_History` | Audit/history mirror of SSIS_Temp_TResignation capturing prior versions of imported resignation setup rows. | — |
| `SSIS_Temp_TResignationDetails` | SSIS staging table for importing individual employee resignation/separation case records with clearance and exit dates. | — |
| `SSIS_Temp_TResignationDetails_Brinton` | Client-specific (Brinton) SSIS staging variant for importing employee resignation/separation case records. | — |
| `SSIS_Temp_TROLES` | SSIS staging table for importing user/system role master data with access scope and reporting type. | — |
| `SSIS_Temp_TROLES_Brinton` | SSIS staging table for importing employer/role (TROLES) data, Brinton client batch variant | — |
| `SSIS_Temp_TROLES_History` | History mirror of SSIS_Temp_TROLES imports capturing prior role import request details | — |
| `SSIS_Temp_TSecondaryActivityOwnerRole` | SSIS staging table for importing secondary activity owner role data | — |
| `SSIS_Temp_TSecondaryActivityOwnerRole_Brinton` | Brinton client batch variant of the secondary activity owner role import staging table | — |
| `SSIS_Temp_TSeparationType` | SSIS staging table for importing employee separation type master data | — |
| `SSIS_Temp_TSeparationType_Brinton` | Brinton client batch variant of the separation type import staging table | — |
| `SSIS_Temp_TShiftGroupMaster` | SSIS staging table for importing shift group master data including grace period and late-in rules | — |
| `SSIS_Temp_TShiftGroupMaster_History` | History mirror of SSIS_Temp_TShiftGroupMaster capturing prior shift group import records | — |
| `SSIS_Temp_TSHIFTMASTER` | SSIS staging table for importing shift master definitions (timings, grace periods, overtime rules) | — |
| `SSIS_Temp_TSHIFTMASTER_Brinton` | Brinton client batch variant of the shift master import staging table | — |
| `SSIS_Temp_TSHIFTMASTER_History` | History mirror of SSIS_Temp_TSHIFTMASTER capturing prior shift master import records | — |
| `SSIS_Temp_Ttitle` | SSIS staging table for importing job title and grade master data | — |
| `SSIS_Temp_Ttitle_Brinton` | Brinton client batch variant of the job title import staging table | — |
| `SSIS_Temp_Ttitle_History` | History mirror of SSIS_Temp_Ttitle capturing prior title import records | — |
| `SSIS_Temp_TWeeklyOffMaster` | SSIS staging table for importing weekly-off calendar master data | — |
| `SSIS_Temp_TWeeklyOffMaster_Brinton` | Brinton client batch variant of the weekly-off calendar import staging table | — |
| `SSIS_Temp_TWeeklyOffMaster_History` | History mirror of SSIS_Temp_TWeeklyOffMaster capturing prior weekly-off import records | — |
| `SSIS_Temp_TWorkFromHomeRequestAndDays` | SSIS staging table for importing work-from-home requests and their day-wise details | — |
| `SSIS_Temp_TWorkFromHomeRequestAndDays_Brinton` | Brinton client batch variant of the work-from-home request import staging table | — |
| `SSIS_Temp_WorkFlowGroup` | SSIS staging table for importing approval workflow group definitions | — |
| `SSIS_Temp_WorkFlowGroup_History` | History mirror of SSIS_Temp_WorkFlowGroup capturing prior workflow group import records | — |
| `SunfireBankDetails` | Staging table of employee bank account details for Sunfire data migration/import | — |
| `SunfireEmpDataForImport` | Staging table of employee personal and demographic data for Sunfire migration/import | — |
| `T_AgentWorkstationContractDetails` | Stores contract/agreement documents associated with employee workstation assets | `T_AgentWorkstationDetails` |
| `T_AgentWorkstationDetails` | Master table of employee-assigned workstation machines with hardware, software, and network info | — |
| `T_AgentWorkstationHistory` | History log of workstation agent scans capturing prior machine hardware/software states | `T_AgentWorkstationDetails` |
| `T_AgentWorkStationInformation` | Detailed IT asset inventory record for workstations including vendor, cost, warranty, and network details | `Asset_Info_SetUpMaster`, `T_AgentWorkstationDetails` |
| `T_ASSET_FIELD_HISTORY` | Audit history of field-level changes (old/new values) made to asset records | — |
| `T_Mobile_ConversationDetail` | Stores mobile app messaging/conversation records between a sender and receiver | — |
| `T_REGISTERED_ASSET_FIELD_HISTORY` | Audit history of field-level changes (old/new values) made to registered asset records | — |
| `T41201` | License subscription record tracking customer license counts, modules opted, and validity period | — |
| `TACCFDetails` | Records incident/compliance form details linked to an employee and incident type | `TEmployee` |
| `TAccountType` | Master list of bank/financial account types configurable per employer | — |
| `TActivityDetails` | Tracks resignation-related activity tasks with owner, due date, and approval status | — |
| `TActivityLog` | Audit log of user login/page access activity with IP address, browser, and role | — |
| `TActivityLogTypes` | Master list of activity log types mapped to module, menu, and path for categorization | — |
| `TActivityLogUserInfo` | Stores machine name and IP address info of users for activity logging | — |
| `TActivityMaster` | Master list of resignation/offboarding activities with owner and activity type | — |
| `TActivityType` | Master list of activity type categories used by TActivityMaster | — |
| `TAdminChangesApprovalDetails` | Field-level detail (old/new values) of admin data change requests pending approval | `TAdminChangesApprovals` |
| `TAdminChangesApprovals` | Header table tracking admin data change requests routed through an approval workflow | — |
| `TAllowanceNames` | Master list of payroll allowance names and descriptions | — |
| `TAllowances` | Employee-specific allowance assignments with amount, type, and effective start date | `TEmployee` |
| `TAllowancesTransactions` | Payroll transaction records applying allowance amounts to a specific employee pay run | `TAllowances`, `TEmployee` |
| `TAnnexureSalaryStructure` | Candidate offer annexure salary structure component breakdown with monthly/yearly amounts | — |
| `TAnnexureSalaryStructure_bkp111622` | Backup snapshot of TAnnexureSalaryStructure taken on 11/16/22 | — |
| `tassessmentYear` | Master list of assessment years with start/end dates used for appraisal/tax periods per employer | — |
| `TAssignedQuestions` | Maps assessment questions assigned to a question template | — |
| `TAttachmentCategory` | Master list of document attachment categories configurable per employer | — |
| `TAttachmentType` | Master list of document attachment types configurable per employer | — |
| `TAttendance` | Daily employee attendance punch records including check-in/out times, hours worked, and shift | — |
| `TAttendance_3889` | Backup/alternate copy of TAttendance daily attendance punch records | — |
| `tattendance_deleted_Rows` | Archive of rows deleted from the TAttendance attendance table | — |
| `tAttendanceCaptureMode` | Master list of attendance capture modes (e.g., biometric, manual) per employer | — |
| `TAttendanceConfiguration` | Configuration rules for attendance policy including grace periods and late/early deductions | — |
| `TAttendanceDataFromClient` | Staging table for raw attendance punch data received from client biometric/mobile devices | — |
| `TAttendanceExceptions` | Defines attendance exception overrides for specific dates, locations, or employees | `TEmployerDetails` |
| `TAttendanceForPayroll` | Aggregated per-employee attendance summary (present/absent/leave days) used for payroll processing | — |
| `TAttendanceRegularisation` | Employee requests to regularize/correct attendance records with manager approval workflow | — |
| `TAttendanceRegularization` | Employee requests to regularize attendance records with approval workflow (alternate spelling of Regularisation) | — |
| `TAttendanceRegularizationDays` | Tracks number of attendance regularization days requested per employee per date. | — |
| `TAttendanceRegularizeCategory` | Master list of attendance regularization categories with rules on frequency, duration, and pullback limits. | — |
| `TAttendanceRegularizeCategory_History` | Audit/history mirror of TAttendanceRegularizeCategory capturing prior versions of category rule rows. | — |
| `TAttendanceTransaction` | Raw employee attendance punch/swipe transactions from access devices, with in/out and geo-location data. | — |
| `TAttendanceTransaction_2060` | Partition/archive copy of TAttendanceTransaction attendance punch records, likely for employer/batch 2060. | — |
| `TAttendanceTransaction_3889` | Partition/archive copy of TAttendanceTransaction attendance punch records, likely for employer/batch 3889. | — |
| `TAttendanceTransaction_AAA` | Partition/archive or test copy of TAttendanceTransaction holding attendance punch records. | — |
| `TAttendanceTransaction_Log` | Log of client-submitted attendance check-in/check-out transactions with descriptions. | — |
| `TAttendanceTransactionOtherSource` | Attendance punch transactions imported from an alternate/external source system. | — |
| `TAuditTrail` | Generic audit log of user page access sessions with username, page, and access timestamp. | — |
| `TAwards_MedalsDetails` | Records employee awards/medals with gazette number, category, and award date. | `TEmployee` |
| `TBank` | Master list of banks used for employee payroll/banking setup. | `TEmployerDetails` |
| `TBankBranchDetails` | Master list of bank branches linked to a parent bank. | `TBank` |
| `TBGVCategory` | Categories for background verification (BGV) checks, e.g. document types to verify. | `TEmployerDetails` |
| `TBGVDocumentsRequest` | Tracks documents requested from a candidate for a background verification case by category. | `TBGVVerificationRequest` |
| `TBGVRequestCategory` | Maps background verification requests to categories with per-category status. | `TBGVVerificationRequest` |
| `TBGVStatusLOOKUP` | Lookup table of background verification status values, hierarchically parented. | `TEmployerDetails` |
| `TBGVVendor` | Master list of external vendors performing background verification checks. | `TEmployerDetails` |
| `TBGVVerificationReport` | Tracks verification report document uploads for a background verification request. | `TBGVVerificationRequest` |
| `TBGVVerificationRequest` | Core background verification case record per candidate/employee with status, dates, and encrypted PII. | `TEmployerDetails` |
| `Tbillingtype` | Master list of billing types used for cost/project billing classification. | — |
| `TBonus` | Employee bonus awards with amount, occurrence count, and approval date. | `TEmployee` |
| `TBonusTransactions` | Pay-cycle transactions disbursing bonus amounts to employees, with paid status. | `TBonus`, `TEmployee`, `TPayCycle` |
| `TBudget` | Departmental/business-unit budget records with pre-approved, requested, and balance amounts. | — |
| `TBudgetDetails` | Line-item budget allocations per position within a budget. | — |
| `TBudgetHistory` | Audit/history log of actions taken on budget records. | — |
| `TBulkUplaodTemplateMaster` | Master templates defining Excel bulk-upload sheet structure mapped to target database tables. | — |
| `TBulkUpload` | Tracks bulk upload batch jobs with file, status, and processing results. | `TAttachmentCategory`, `TEmployerDetails` |
| `TBulkUploadDetail` | Per-employee row-level detail and status for a bulk upload batch. | `TBulkUpload` |
| `TBulkUploadFailedRequests` | Records failed rows/requests from a bulk upload batch with error details. | — |
| `TBulkUploadRemoteLocationStatus` | Tracks bulk-uploaded remote work location geofencing settings per employee, with lat/long and radius. | — |
| `TBulkUploadRemoteLocationStatus_BKP` | Audit/history mirror of TBulkUploadRemoteLocationStatus capturing prior versions of rows. | — |
| `TBulkUploadRequests` | Tracks individual bulk upload requests linked to an upload template with completion status. | — |
| `TBusinessCards` | Employee business card print requests with contact details and card quantity. | `TEmployee` |
| `TBusinessUnit` | Master list of business units within the organization. | — |
| `tBusinessUnitAssets` | Tracks asset allocation to business units with allocation/deallocation dates. | — |
| `tBusinessUnitAssets_History` | Audit/history mirror of tBusinessUnitAssets capturing prior versions of asset allocation rows. | — |
| `TBusinessUnitClientMap` | Maps business units to clients for organizational/billing association. | `TEmployerDetails` |
| `TCalendarMaster` | Master list of named calendars (e.g. holiday/work calendars) per employer. | — |
| `TCancelledReason` | Master list of reasons used when cancelling a request or transaction. | — |
| `TcandiadteProcessingConfig` | Per-employer configuration flags for candidate onboarding processing templates. | — |
| `TCandidateApplicationHistory` | History log of a candidate's job application status changes over time. | — |
| `TCandidates` | Master record of recruitment candidates with personal details, resume, and skills. | `TGender` |
| `TCandidatesHistory` | Audit/history mirror of TCandidates capturing prior versions of candidate application rows. | — |
| `Tcandidatesource` | Master list of recruitment candidate sourcing channels (e.g. referral, job board). | — |
| `TCategory` | Generic master list of categories used elsewhere in the system per employer. | — |
| `TCertification` | Master list of professional certifications available for employees. | — |
| `TCertificationDetails` | Employee-specific certification records with certifying institution, dates, and score. | `TCertification`, `TEmployee`, `TMSkills` |
| `TCertificationDetailsHistory` | Audit/history mirror of TCertificationDetails capturing prior versions of employee certification rows. | — |
| `TChartDashboards` | Master list of dashboards used to group analytics charts. | — |
| `TChartFields` | Master list of data fields available for use as chart axes. | — |
| `TChartPermissions` | Role-based access permissions controlling which charts/dashboards a role can view. | — |
| `TChartPreferences` | User/employer-level display preferences and ordering for dashboard charts. | — |
| `TCharts` | Master list of defined analytics charts. | — |
| `TChartTypes` | Master list of chart type options (e.g. bar, pie, line) for chart configuration. | — |
| `TChatMessengerDetails` | Stores chat/support messenger conversation messages between employee and support contact. | — |
| `TClientAttendanceDataLog` | Log of attendance check-in/check-out data imported from client source systems. | — |
| `TClientAttendanceDataLog_34_July` | Archived monthly copy of TClientAttendanceDataLog holding imported client attendance records, likely for employer 34/July. | — |
| `TCMSConfirmationComponents` | Configurable components/questions used in confirmation (probation) review forms. | — |
| `TCMSConfirmationViewManagerPermissions` | Defines which manager review levels can view confirmation (probation) reviews per employer. | — |
| `TCMSEmployeeCompetencyRatingAttachment` | Attachments supporting employee competency confirmation ratings, storing document paths per rating transaction. | — |
| `TCMSEmployeeCompetencyRatings` | Employee competency assessment ratings with weightage, calculated scores, and manager comments per confirmation. | — |
| `TCMSEmployeeComponentComments` | Manager and employee comments/answers on confirmation assessment components, with evidence attachments. | — |
| `TCMSEmployeeConfirmation` | Employee probation/confirmation review header record with status, ratings scale, notice period, and approval status. | — |
| `TCMSEmployeeConfirmationForBU` | Maps employee confirmation rating configurations to applicable business units. | — |
| `TCMSEmployeeConfirmationForDesignation` | Maps employee confirmation rating configurations to applicable designations. | — |
| `TCMSEmployeeConfirmationForRole` | Maps employee confirmation rating configurations to applicable roles. | — |
| `TCMSEmployeeConfirmationMapping` | Configuration rules defining scoring method and applicability scope for employee confirmation ratings. | — |
| `TCMSManagerRatingPermissions` | Grants managers permission to submit competency ratings, with mandatory-comments configuration flags. | — |
| `TCMSNOticePeriodDays` | Configurable notice period day counts used in employee confirmation processing per employer. | — |
| `TComp_OffRequestByEmployee` | Employee compensatory-off requests recording worked date, days claimed, status, and approval comments. | `TEmployee` |
| `TComp_OffRequestByEmployee_History` | Audit/history mirror of TComp_OffRequestByEmployee capturing prior versions of comp-off requests. | — |
| `TCompensationStructure` | Named compensation structures per employer listing associated salary component IDs and currency. | — |
| `TCompensationStructure_bkp111622` | Backup snapshot of TCompensationStructure taken on 11/16/22. | — |
| `TCompensationStructureConfig` | Per-country, per-employer configuration toggling active compensation structure settings. | — |
| `TCompensationStructureConfig_bkp3282023` | Backup snapshot of TCompensationStructureConfig taken on 3/28/2023. | — |
| `TCompOffRequest` | Compensatory-off/leave requests tracking request type, leave code, dates, days, status, and approval workflow. | `TEmployee` |
| `TCompOffRequest_LeaveDetails` | Links comp-off requests to specific leave requests and days consumed against them. | — |
| `TComponentsMaster` | Master list of payroll salary components with calculation type, formula settings, and edit/delete permissions. | — |
| `TComponentsMaster_bkp111622` | Backup snapshot of TComponentsMaster taken on 11/16/22. | — |
| `TContactTracer` | COVID-era contact tracing log linking user UUIDs by employer for exposure tracking. | `TEmployerDetails` |
| `TCONVERTED_CURRENCY` | Daily currency conversion rates snapshot relative to a base currency from an external source. | — |
| `tCostCenter` | Cost center master list per employer with active/deleted status flags. | — |
| `TCostCenters` | Cost center code and description lookup table. | — |
| `TCOUNTRY` | Reference master of countries with ISO codes, phone codes, and currency metadata. | — |
| `TCountry_bkp` | Backup mirror of the TCOUNTRY reference master table. | — |
| `TCountryStates` | Reference master of states/provinces per country with codes and identifiers. | — |
| `TCountryWiseFieldName` | Country-specific configuration overriding field labels, validation rules, and masks for form fields. | `TCOUNTRY` |
| `TCourseDetails` | Employee training/course records covering internal and external courses, award dates, and reporting status. | `TEmployee` |
| `TCurrency` | Currency master list per employer with a default-currency flag. | — |
| `TCustomComponentFormulaMaster` | Custom formula definitions for payroll components, combining operators and percentage/flat amounts. | — |
| `TCustomComponentFormulaMaster_bkp111622` | Backup snapshot of TCustomComponentFormulaMaster taken on 11/16/22. | — |
| `TCustomerLicensedUserDetails` | Tracks licensed user email addresses per customer/tenant for license usage management. | — |
| `TCustomerLicensedUserDetails_HT` | Historical/legacy variant of TCustomerLicensedUserDetails tracking licensed users per customer. | — |
| `TCustomerSettings` | Tenant-level configuration for login methods, integrations (Azure, Google, SSO), and module toggles. | — |
| `tcustomersettings_bkp12522` | Backup snapshot of TCustomerSettings taken on 1/25/22. | — |
| `TCustomerStatusChangeComments` | Comments logged when a customer/tenant's account status is changed. | — |
| `TCustomFieldsMaster` | Definitions of tenant-configurable custom form fields including control type, section, and validation. | — |
| `TCustomFieldsMasterHistory` | Audit/history mirror of TCustomFieldsMaster capturing prior versions of custom field definitions. | — |
| `TCustomFieldValues` | Selectable value options belonging to a custom field defined in TCustomFieldsMaster. | `TCustomFieldsMaster` |
| `TCustomFormulas` | Custom calculation formulas for payroll components with operators, amounts, and delete flag. | — |
| `TCustomReports` | User-defined custom report definitions storing query text, filters, grouping, and access scope. | — |
| `TDailyAttendance` | Raw daily attendance punch records from swipe/biometric machines with check-in/out times and hours worked. | — |
| `TDailyAttendanceReport` | Consolidated daily attendance summary per employee combining leave, absence-regularization, and work-from-home status. | — |
| `TDailyRegisterNew` | Daily attendance register tracking worked minutes, break time, extra time, and weekly attendance status per employee. | — |
| `TDailyRegisterNew_3928` | Backup/snapshot variant of TDailyRegisterNew, likely tied to a specific migration or ticket. | — |
| `TDailyRegisterNew_BreakRemove` | Backup/snapshot variant of TDailyRegisterNew retained before a break-time removal correction. | — |
| `TDailyRegisterNew_Sunfire_HardDeleted` | Archive of hard-deleted TDailyRegisterNew rows from the Sunfire tenant/migration. | — |
| `TDashboardOptions` | Configurable dashboard tile/option definitions with icons, URLs, and enabled status per employer. | — |
| `TDataUpload_BankDetails` | Staging table for bulk-uploaded employee bank account details prior to import. | — |
| `TDataUpload_CertificationDetails` | Staging table for bulk-uploaded employee certification records prior to import. | — |
| `Tdataupload_ClearanceActivity` | Staging table for bulk-uploaded employee exit clearance activities with import status tracking. | — |
| `TDataUpload_ContactDetails` | Staging table for bulk-uploaded employee contact detail updates prior to import. | — |
| `TDataUpload_ContactDetails_Delete` | Staging table for bulk-deleting employee contact details via upload. | — |
| `TDataUpload_EducationDetails` | Staging table for bulk-uploaded employee education history records prior to import. | — |
| `Tdataupload_EmergencyContact` | Staging table for bulk-uploaded employee emergency contact records prior to import. | — |
| `TdataUpload_EmployeePictures` | Staging table for bulk-uploaded employee photo file paths with import status tracking. | — |
| `Tdataupload_ExitInterview` | Staging table for bulk-uploaded exit interview questionnaire responses with import status tracking. | — |
| `Tdataupload_FamilyDetails` | Staging table for bulk-uploaded employee family/dependent details prior to import. | — |
| `Tdataupload_LeaveBalance` | Staging table for bulk-uploaded employee leave balance figures with import status tracking. | — |
| `TDataupload_LeaveTransaction` | Bulk-upload staging table for employee leave applications with approver comments and import status. | — |
| `TDataUpload_NominationDetails` | Bulk-upload staging table for employee nominee/beneficiary details by category and relationship. | — |
| `TDataUpload_OfficialInfo` | Bulk-upload staging table for employee official/job details such as designation, department, and grade. | — |
| `TDataUpload_OfficialInfo_12102018` | Dated snapshot/backup copy of the TDataUpload_OfficialInfo bulk-upload staging table. | — |
| `TDataUpload_OfficialInfo_Delete` | Staging table holding TDataUpload_OfficialInfo records marked for deletion. | — |
| `Tdataupload_OfficialinfoHistory` | Audit/history mirror of TDataUpload_OfficialInfo capturing prior versions of uploaded official-info rows. | — |
| `TDataUpload_PassportDetails` | Bulk-upload staging table for employee passport details including number, issue/expiry dates. | — |
| `TDataUpload_PersonalInfo` | Bulk-upload staging table for employee personal details such as name, DOB, contact, and IDs. | — |
| `TDataUpload_PersonalInfo_12102018` | Dated snapshot/backup copy of the TDataUpload_PersonalInfo bulk-upload staging table. | — |
| `TDataUpload_PersonalInfo_Delete` | Staging table holding TDataUpload_PersonalInfo records marked for deletion. | — |
| `Tdataupload_ResignationDetails` | Bulk-upload staging table for employee resignation/separation details including notice and relieving dates. | — |
| `TDataUpload_VISADetails` | Bulk-upload staging table for employee visa details including type, country, and expiry date. | — |
| `TDayWiseAttendance` | Pivoted daily attendance table with one column per calendar date holding each employee's attendance code. | — |
| `tDeactivationDetails` | Records employee deactivation events with separation type, resignation reason, and audit fields. | — |
| `TDeletePersonalFields` | Tracks which personal information fields were flagged for deletion per employer. | `TEmployerDetails` |
| `TDeletePersonalInfoAuditLog` | Audit log recording which personal-info fields were deleted for an employee and when. | `TEmployee`, `TEmployerDetails` |
| `TDepartment` | Master list of organizational departments with name, description, and department head. | `TEmployee` |
| `TDepartmentHierarchy` | Parent-child hierarchy mapping between departments. | `TDepartment` |
| `TDesignationBasedLeave` | Configures leave entitlement (number of leaves) allocated per designation/designation grouping. | — |
| `TDeviceInvalidLoginAttemptDetails` | Logs invalid/failed device login attempts by employee with device ID and reason. | `TUsers` |
| `TDisciplineDetails` | Records employee disciplinary actions including offence type, punishment, and interdiction details. | `TEmployee` |
| `TDocumentAttestation` | Records attestation events for employee documents with attestation date. | — |
| `TDocumentGroup` | Groups documents together, e.g. for associating videos/files under a shared document group. | `TDOCUMENTS` |
| `TDocumentPaths` | Maps a transaction/record to its stored document file path and type. | — |
| `TDocumentPaths_03312023` | Dated snapshot/backup copy of the TDocumentPaths table. | — |
| `TDocumentRepositoryDetails` | Tracks documents shared between users in a document repository, with sharer, recipient, and shared files. | — |
| `TDOCUMENTS` | Master registry of uploaded documents with URI, file name, extension, and creator. | — |
| `Tdocuments_History` | Audit/history mirror of TDOCUMENTS capturing prior versions and deletion reasons for document rows. | — |
| `TDonarInfoMaster` | Master data for donors/grant sources including donor type, contact info, and total grant amount. | — |
| `TDonorBudget` | Defines project budgets allocated against a donor, including amount, currency, and project dates. | — |
| `TDonorBudgetDetail` | Line-item budget allocations under a donor budget by location, holder, program, and expense nature. | — |
| `TDynamicMenuHierarchy` | Stores per-employer dynamic navigation menu configuration as XML. | — |
| `TDynamicMenuHierarchyDetails` | Defines individual menu units in the dynamic menu hierarchy with parent linkage and navigation URL. | — |
| `TDynamicMenuHierarchyHistory` | Audit/history mirror of TDynamicMenuHierarchy capturing prior versions of menu XML configuration. | — |
| `Teamroll_SSIS_Temp_DomainDetailsMaster` | SSIS staging table for importing employee domain/technical skill experience records. | — |
| `Teamroll_SSIS_Temp_TActivityMaster` | SSIS staging table for importing separation clearance activity master data. | — |
| `Teamroll_SSIS_Temp_TActivityType` | SSIS staging table for importing clearance activity category/type master data. | — |
| `Teamroll_SSIS_Temp_TAttachmentCategory` | SSIS staging table for importing document attachment category master data. | — |
| `Teamroll_SSIS_Temp_TAttendanceRegularizationAndDays` | SSIS staging table for importing attendance regularization requests and affected days. | — |
| `Teamroll_SSIS_Temp_TAttendanceRegularizeCategory` | SSIS staging table for importing attendance regularization category master data. | — |
| `Teamroll_SSIS_Temp_TBank` | SSIS staging table for importing bank master data. | — |
| `Teamroll_SSIS_Temp_TBankBranchDetails` | SSIS staging table for importing bank branch master data. | — |
| `Teamroll_SSIS_Temp_TCalendarMaster` | SSIS staging table for importing work calendar master data. | — |
| `Teamroll_SSIS_Temp_TCategory` | SSIS staging table for importing skill category master data. | — |
| `Teamroll_SSIS_Temp_TCMSConfirmationComponents` | SSIS staging table for importing confirmation management system (CMS) component configuration. | — |
| `Teamroll_SSIS_Temp_TEmployee` | SSIS staging table for importing employee personal/master details. | — |
| `Teamroll_SSIS_Temp_TEmployeeBankDetails` | SSIS staging table for importing employee bank account details. | — |
| `Teamroll_SSIS_Temp_TEmployeeContactDetails` | SSIS staging table for importing employee contact/phone/email details. | — |
| `Teamroll_SSIS_Temp_TEmployeeEmergencyContactDetails` | SSIS staging table for importing employee emergency contact details. | — |
| `Teamroll_SSIS_Temp_TEmployeeFamilyDetails` | SSIS staging table for importing employee family/dependent member details. | — |
| `Teamroll_SSIS_Temp_TEmployeeInfo` | SSIS staging table for importing employee job/official information such as designation and grade. | — |
| `Teamroll_SSIS_Temp_TEmployeeNomination` | SSIS staging table for importing employee nominee/beneficiary details. | — |
| `Teamroll_SSIS_Temp_TEmployerDetails` | SSIS staging table for importing employer/organization master and security policy settings. | — |
| `Teamroll_SSIS_Temp_TExitInterviewTemplate` | SSIS staging table for importing exit interview template master data. | — |
| `Teamroll_SSIS_Temp_TGrade` | SSIS staging table for importing employee grade master data. | — |
| `Teamroll_SSIS_Temp_THolidayMaster` | SSIS staging table for importing holiday calendar master data. | — |
| `Teamroll_SSIS_Temp_TLeaveBalance` | SSIS staging table for importing employee leave balance data by leave code. | — |
| `Teamroll_SSIS_Temp_TLeaveRequestAndDays` | SSIS staging table for importing leave request records with day-level detail and status. | — |
| `Teamroll_SSIS_Temp_TLeaveTypeMaster` | SSIS staging table for importing leave type master configuration including eligibility and encashment rules. | — |
| `Teamroll_SSIS_Temp_TLocation` | SSIS staging table for importing office location master data. | — |
| `Teamroll_SSIS_Temp_TMEmploymentTypes` | SSIS staging table holding employment types imported from Teamroll before processing into HRMS. | — |
| `Teamroll_SSIS_Temp_TMSkills` | SSIS staging table holding skill names/descriptions imported from Teamroll for processing. | — |
| `Teamroll_SSIS_Temp_TOrgHierarchyDetails` | SSIS staging table holding organizational unit hierarchy data imported from Teamroll. | — |
| `Teamroll_SSIS_Temp_TResignation` | SSIS staging table holding resignation reasons imported from Teamroll for processing. | — |
| `Teamroll_SSIS_Temp_TResignationDetails` | SSIS staging table holding full employee resignation/separation workflow details imported from Teamroll. | — |
| `Teamroll_SSIS_Temp_TROLES` | SSIS staging table holding role names imported from Teamroll before processing into HRMS. | — |
| `Teamroll_SSIS_Temp_TSecondaryActivityOwnerRole` | SSIS staging table holding secondary activity owner role data imported from Teamroll. | — |
| `Teamroll_SSIS_Temp_TSeparationType` | SSIS staging table holding employment separation type names imported from Teamroll. | — |
| `Teamroll_SSIS_Temp_TSHIFTMASTER` | SSIS staging table holding work shift master definitions (timings, grace periods) imported from Teamroll. | — |
| `Teamroll_SSIS_Temp_Ttitle` | SSIS staging table holding job/personal title definitions imported from Teamroll. | — |
| `Teamroll_SSIS_Temp_TWeeklyOffMaster` | SSIS staging table holding weekly-off calendar definitions imported from Teamroll. | — |
| `Teamroll_SSIS_Temp_TWorkFromHomeRequestAndDays` | SSIS staging table holding work-from-home requests and day-wise details imported from Teamroll. | — |
| `TEarningSalaryComponents` | Master list of payroll earning/salary components with calculation type, formula, and display settings per employer. | — |
| `TEducationDetails` | Employee education records: institute, qualification, dates attended, grade, and sponsorship details. | `TEmployee`, `TEstablishmentName`, `TEstablishmentType`, `TQualificationLevel`, `TSubject`, `TUniverSity` |
| `TEducationDetails_bkp` | Backup copy of TEducationDetails preserving prior employee education records. | — |
| `TEducationHistoryDetails` | Audit/history table capturing prior versions of employee education records from TEducationDetails. | — |
| `TEmail` | Outbound email queue/log with recipients, subject, body, attachment, and send status. | — |
| `TEmailNotification` | Workflow-driven email notification queue tracking transaction, action, status, and fetch state. | `TEmployee` |
| `TEmailTemplates` | Master library of reusable email templates by module, type, and workflow node. | — |
| `TEmailTemplateValidations` | Validation results/messages recorded for email templates by employer. | — |
| `TEmergencyRelationship` | Master list of emergency-contact relationship types per employer. | — |
| `Temp_Sunfire_BankDetails` | Temporary staging table for employee bank account details imported from the Sunfire source system. | — |
| `TEmpBirthdayQuote` | Master table of birthday card quotes and images used for employee birthday notifications. | — |
| `tEmpDocGenerated_MasterStatus` | Master list of statuses for generated employee documents, per employer. | — |
| `TEmpDocGenerated_StatusDetails` | Status history/comments for individual generated employee documents. | — |
| `TEmpDomainHistoryDetails` | Audit/history mirror of employee domain/experience details capturing prior values. | — |
| `TEmpHomeLoanDet` | Employee home loan details (principal/interest, lender) used for tax assessment. | `TEmployee`, `tassessmentYear` |
| `TEmpHomeLoanLetOutDet` | Employee let-out property home loan tax computation details (rent received, deductions, net income). | `TEmployee`, `tassessmentYear` |
| `TEmpHouseRentDet` | Employee house rent declaration details (period, amount, landlord PAN) for tax purposes. | `TEmployee`, `tassessmentYear` |
| `TEmpIncomeTaxDet` | Employee income tax declaration/investment details by tax section and assessment. | `TEmployee`, `tassessmentYear` |
| `TEmpLetterDocumentTemplates` | Master library of employee letter/document templates by module and type. | `TEmployerDetails` |
| `TEMPLocationDetails` | Master table of geofenced work locations per employee with coordinates, radius/shape, and tracking flags. | — |
| `TEMPLocationLog` | Log of employee geolocation tracking pings with timestamp and device. | `TEmployee` |
| `TEmployee` | Core employee master table with personal details (name, DOB, gender, address, contact) and role/shift assignment. | `TMaritalStatus`, `TPersonalTitle` |
| `TEmployeeAssets` | Tracks physical assets allocated/deallocated to employees with dates and descriptions. | — |
| `TEmployeeAssets_History` | Audit/history mirror of TEmployeeAssets capturing prior asset allocation records. | — |
| `TEmployeeAttachment` | Employee document/file attachments categorized by type with uploader metadata. | `TAttachmentCategory`, `TAttachmentType`, `TEmployee` |
| `TEmployeeBankDetails` | Employee bank account details (account number, IBAN, branch) used for payroll disbursement. | `TAccountType`, `TEmployee` |
| `TEmployeeBankDetails_History` | Audit/history mirror of TEmployeeBankDetails capturing prior versions of bank account records. | — |
| `TEmployeeBenefitVoucher` | Employee benefit voucher requests with amount, status, and approval dates. | `TEmployee`, `TVoucher` |
| `TEmployeeBenefitVoucherHistory` | Audit/history mirror of TEmployeeBenefitVoucher capturing prior voucher request states. | `TEmployeeBenefitVoucher` |
| `TEmployeeBudgetSourceDetails` | Maps employee cost/CTC bifurcation to donor/project budget sources for grant-funded staff. | — |
| `TEmployeeBudgetSourceDetailsHistory` | Audit/history mirror of TEmployeeBudgetSourceDetails capturing prior budget source assignments. | — |
| `TEmployeeChartPreferences` | Stores an employee's saved dashboard/chart display preferences. | — |
| `TEmployeeChildInfo` | Employee dependent children details including name, DOB, and tax ID for tax/benefit purposes. | `TEmployee` |
| `TEmployeeContactDetails` | Employee contact information including phone numbers, emails, and pay location codes. | `TEmployee` |
| `TEmployeeContactDetails_Arc` | Archive copy of TEmployeeContactDetails preserving prior employee contact records. | — |
| `TEmployeeCustomFields` | Stores custom field values assigned to individual employees per employer configuration. | — |
| `TEmployeeCustomFieldsHistory` | Audit/history mirror of TEmployeeCustomFields capturing prior custom field values. | — |
| `TEmployeeDayWiseAttendanceStatus` | Stores per-day attendance status records for employees (minimal columns captured). | — |
| `TEmployeeDepartmentHistory` | Audit/history log of employee department reassignments over time. | `TEmployee` |
| `TEmployeeDesignationHistory` | Audit/history log of employee designation/title changes over time. | `TEmployee`, `TTitle` |
| `TEmployeeDetail_Category` | Master list of employee detail categories grouped under a segment, used for dynamic field configuration. | `TEmployeeDetail_Segment` |
| `TEmployeeDetail_CustomFieldsValues` | Stores current/latest values of dynamically configured custom employee detail fields. | — |
| `TEmployeeDetail_Fields` | Metadata-driven field definitions (DB mapping, validation, display) for configurable employee detail forms. | `TAttachmentCategory`, `TEmployeeDetail_Section`, `TFieldType_LookUp` |
| `TEmployeeDetail_Fields_History` | Audit/history mirror of TEmployeeDetail_CustomFieldsValues capturing prior field value versions. | — |
| `TEmployeeDetail_Section` | Master list of employee detail form sections/tabs with DML and audit column mapping metadata. | — |
| `TEmployeeDetail_Section_Category` | Junction table linking employee detail sections to their categories. | — |
| `TEmployeeDetail_Segment` | Master list of top-level segments grouping employee detail categories. | — |
| `Temployeedetail_Staging_Employee_creation` | Staging table holding new-employee onboarding data (personal, payroll, tax) pending creation into HRMS. | — |
| `TEmployeeDetail_Upload` | Tracks bulk employee-detail upload batches with validation/processing status and audit fields. | — |
| `TEmployeeDetail_Upload_Creation_Finalizing` | Tracks finalization status and employment-number results for an employee-detail upload batch. | `TEmployeeDetail_Upload` |
| `TEmployeeDetail_Upload_Section` | Per-section breakdown of an employee-detail upload batch, tracking valid/invalid/processed record counts. | — |
| `TEmployeeDocumentGeneratedDetails` | Logs generated employee documents with file path, type, and approval status. | `TEmpLetterDocumentTemplates` |
| `TEmployeeDocumnets` | Stores employee-uploaded documents including binary file data, type, and description. | `TEmployee` |
| `TEmployeeDomainDetails` | Records an employee's domain/functional area of expertise and months of experience in it. | — |
| `TEmployeeEmergencyContact` | Legacy table storing an employee's emergency contact and physician details. | `TEmployee` |
| `TEmployeeEmergencyContactDetails` | Current employee emergency contact and physician details, with submission/effective-date tracking. | `TEmployee` |
| `TEmployeeEmergencyContactDetails_Arc` | Archive mirror of TEmployeeEmergencyContactDetails retaining prior emergency contact records. | — |
| `TEmployeeEmergencyContactDetailsHistory` | Audit/history mirror of TEmployeeEmergencyContactDetails capturing prior versions of rows. | — |
| `TEmployeeEmploymentInfo` | Basic employment record listing an employee's company, position, job description, and tenure dates. | `TEmployee` |
| `TEmployeeEmploymentType` | Assigns an employee's employment type (e.g. permanent/contract) with contract end date and effective date. | `TEmployee`, `TMEmploymentTypes` |
| `TEmployeeEmploymentTypeHistory` | Audit/history mirror of TEmployeeEmploymentType capturing prior versions of rows. | — |
| `TEmployeeExitInterviewDetails` | Stores an employee's exit interview responses to questionnaire questions. | `TEmployee`, `TQuestionnaireMaster` |
| `TEmployeeFamilyDetails` | Records employee family/dependant members with relation, insurance, and personal details. | `TEmployee` |
| `TEmployeeFamilyDetails_Arc` | Archive mirror of TEmployeeFamilyDetails retaining prior family-member records. | — |
| `TEmployeeFamilyDetails_history` | Audit/history mirror of TEmployeeFamilyDetails capturing prior versions of rows. | — |
| `TEmployeeFutureInfo` | Staged future employment/job-assignment details for an employee pending an effective date change. | — |
| `TEmployeeGeoAttendance` | Records geo-tagged attendance sessions for an employee with start/end time and approval status. | — |
| `TEmployeeGoalSettingReviewLevelMaster` | Master list of employee role-based review levels used in goal-setting/appraisal workflows. | — |
| `TEmployeeHistory` | Audit/history mirror of the core employee profile table capturing prior versions of personal data. | — |
| `TEmployeeHomePagePreferences` | Stores an employee's selected dashboard/home-page widget preferences. | — |
| `TEmployeeInfo` | Core employment record with job title, department, employment type, pay grade, and confirmation/termination dates. | `TEmployee`, `TEmployerDetails`, `TLocation`, `TMEmploymentTypes`, `TTitle` |
| `TEmployeeInfoHistory` | Audit/history mirror of TEmployeeInfo capturing prior versions of employment records. | — |
| `TEmployeeLeaveHistory` | Historical log of employee leave applications with dates, duration, approver, and status. | `TEmployee`, `TLeaveTypes` |
| `TEmployeeLeaves` | Employee leave balance ledger tracking total and available leave by year and leave type. | `TEmployee`, `TLeaveTypes` |
| `TEmployeeMedicalInfo` | Records an employee's medical conditions and disabilities linked to an emergency contact. | `TEmployee`, `TEmployeeEmergencyContact` |
| `TEmployeeNomination` | Records employee nominee/beneficiary declarations (e.g. for benefits) with relationship and value. | `TEmployee` |
| `TEmployeeNomination_Arc` | Archive mirror of TEmployeeNomination retaining prior nomination records. | — |
| `TEmployeeNominationCategory` | Master list of nomination categories (e.g. benefit/insurance types) available per employer. | `TEmployerDetails` |
| `TEmployeeNominationHistory` | Audit/history mirror of TEmployeeNomination capturing prior versions of rows. | — |
| `TEmployeeOrgBusinessHead` | Maps an employee as the business-unit head within an employer's organizational structure. | — |
| `TEmployeePassportDetails` | Stores an employee's passport number, issue/expiry dates, and encrypted passport holder name. | `TEmployee` |
| `TEmployeePassportDetailsHistory` | Audit/history mirror of TEmployeePassportDetails capturing prior versions of rows. | — |
| `TEmployeePay` | Employee compensation record with yearly gross pay, hourly rate, and pay cycle type. | `TEmployee` |
| `TEmployeePayHistory` | Audit/history mirror of TEmployeePay tracking prior yearly gross pay values over time. | `TEmployee` |
| `TEmployeePictures` | Stores employee profile photo binary data. | `TEmployee` |
| `TEmployeePreviousEmploymentDetails` | Records an employee's prior employment year-to-date gross pay and tax (PAYE) figures. | `TEmployee` |
| `TEmployeeQualificationInfo` | Records an employee's educational qualifications, institution, discipline, and sponsorship details. | `TEmployee`, `TQualificationName` |
| `TEmployeeRoaster` | Monthly shift roster header assigning an employee to a shift group/business unit for a date range. | — |
| `TEmployeeRoasterDetails` | Day-level shift roster assignments for an employee including shift start/end times. | — |
| `TEmployeeRoasterDetails_43` | Snapshot/backup variant of TEmployeeRoasterDetails with identical shift-assignment structure. | — |
| `TEmployeeRoasterDetails_History` | Audit/history mirror of TEmployeeRoasterDetails capturing prior versions of shift assignments. | — |
| `TEmployeeRoleMaster` | Master list of employee role names/descriptions defined per employer. | `TEmployerDetails`, `temployerdetails` |
| `TEmployeeScheduledDeduction` | Recurring payroll deduction schedule for an employee with type, percentage/amount, and start date. | `TEmployee`, `TScheduleDeductionType` |
| `TEmployeeScheduledDeductionTransaction` | Transaction log of scheduled deductions actually applied to an employee's pay run. | `TEmployee`, `TEmployeeScheduledDeduction` |
| `TEmployeeSearchPurposeDetails` | Audit log of employee record searches capturing who searched, for whom, and the stated purpose. | `TEmployee`, `TEmployeeSearchPurposeMaster`, `TEmployerDetails` |
| `TEmployeeSearchPurposeMaster` | Master list of allowed reasons/purposes for searching employee records, per employer. | — |
| `TEmployeeSignatureImages` | Stores an employee's uploaded digital signature image and approval status. | `TEmployee`, `TEmployerDetails` |
| `TEmployeeSkillDetails` | Records an employee's skills with proficiency level and months of experience. | `TEmployee`, `TMSkills` |
| `TEmployeeSkillHistoryDetails` | Audit/history mirror of TEmployeeSkillDetails capturing prior versions of skill records. | — |
| `TEmployeeTrainingInfo` | Records training courses attended by an employee, institution, certification, and skills acquired. | `TEmployee`, `TMTrainings` |
| `TEmployeeVisaInfo` | Stores an employee's visa type, number, issue/expiry dates, and country. | `TEmployee` |
| `TEmployeeVisaInfoHistory` | Audit/history mirror of TEmployeeVisaInfo capturing prior versions of rows. | — |
| `TEmployeeWelcomeEmailRequest` | Tracks status of onboarding welcome-email requests and send confirmations for new employees. | `TEmployee` |
| `TEmployer_RosterNotificationDays` | Configures how many days in advance an employer sends roster/shift notification alerts. | — |
| `TEmployer_RosterProvider` | Designates employees approved as roster providers/schedulers for an employer. | — |
| `TEmployer_RosterProvider_BU` | Maps roster providers to the specific business units they are authorized to schedule for. | — |
| `TEmployerCustomFields` | Employer-level configuration for custom business-unit/department field labeling and display. | `TEmployerDetails` |
| `TEmployerDetails` | Core employer/organization master record with contact info, banking details, licensing, and security policy settings. | — |
| `TEmployerModule` | Maps which HRMS modules are enabled/active for each employer (tenant). | — |
| `TEmployerPMSCustomFields` | Per-employer custom performance management field labels for competencies, KRAs, and KPAs. | — |
| `TEmployerSealImages` | Stores per-employer official seal/stamp image paths for use on documents. | `TEmployerDetails` |
| `TEmployerWishesMaster` | Per-employer template text for birthday and work anniversary wish messages. | — |
| `TEmploymentTypeClubWith` | Maps employment types that are clubbed together with probation and notice period rules. | — |
| `TempNBPL` | Temporary staging table of employee geo-tracking/location config for a specific customer (NBPL). | — |
| `TempNECPL` | Temporary staging table of employee geo-tracking/location config for a specific customer (NECPL). | — |
| `TEmpSalary` | Employee salary/CTC records with currency, effective date, and remarks. | — |
| `TEmpSalary_bkp` | Backup copy of TEmpSalary preserving prior employee salary/CTC records. | — |
| `TEmpSalaryHistory` | Field-level change history (old/new values) for TEmpSalary records. | — |
| `TEmpSupportContact` | Directory of designated employee support/HR contact persons by business unit. | — |
| `TEmpWelcomeMail` | Per-employer branding images (header, footer, logo) used in new employee welcome emails. | `TEmployerDetails` |
| `TEmpWorkAnniversaryQuote` | Per-employer branding images and daily quotes used in work anniversary notifications. | — |
| `TEntityDetails` | Master list of organizational legal entities with codes, names, and parent entity hierarchy. | `TMasterEntity` |
| `TErrorLog` | Application error log capturing error messages, stack traces, and the user who triggered them. | — |
| `TESS_OrgHierarchydetails` | Employee self-service org hierarchy/business unit contact directory entries. | — |
| `TESSLetterHeaderFooter` | Per-employer letter template header/footer/watermark images and margin settings for documents. | `TEmployerDetails` |
| `TEstablishmentName` | Master list of establishment names configured per employer (statutory/compliance context). | — |
| `TEstablishmentType` | Master list of establishment types configured per employer (statutory/compliance context). | — |
| `Tevents` | Stores calendar/system event definitions with type, subject, and XML body content per employer. | — |
| `TExitInterviewAnsByEmp` | Employee-submitted exit interview answers along with HR comments. | — |
| `TExitInterviewHRComments` | HR comments recorded against employee exit interviews, with reset tracking. | `TEmployee` |
| `TExitInterviewTemplate` | Master list of exit interview templates configurable per employer. | — |
| `TExperienceBasedLeaves` | Leave entitlement tiers defining number of leaves granted based on experience range. | — |
| `TExpertise` | Master list of employee expertise/skill areas configurable per employer. | — |
| `TExternal_Payroll_Configuration` | External payroll provider integration settings including API keys and OAuth tokens per customer. | — |
| `TFields` | Metadata registry of form fields mapping display names to database columns and field types. | — |
| `TFields_bkp111622` | Dated backup snapshot of the TFields form field metadata registry. | — |
| `tfields_bkp113033` | Dated backup snapshot of the TFields form field metadata registry. | — |
| `TFieldType_LookUp` | Lookup master list of available field types used in dynamic form configuration. | — |
| `TFNPF` | Employee and employer contribution percentage rates for the FNPF provident fund scheme. | — |
| `TFreezeAttendance` | Records attendance freeze dates locking attendance data from further edits per employer. | — |
| `TFringeBenefits` | Fringe benefit amounts assigned to individual employees with start date and status. | `TEmployee` |
| `TFringeBenefitsNames` | Master list of fringe benefit types with names and descriptions. | — |
| `TGender` | Lookup master list of gender values. | — |
| `TGeoTaggingDetails` | Geo-tagged check-in/out records capturing employee location, device, project, and attachments. | — |
| `TGeoTaggingServiceUsage` | Usage log of geo-tagging API service calls per employee with location and API key. | — |
| `TGeoTaggingTemplateDetails` | Templates defining custom geo-tagging field sets and assigned employees. | — |
| `TGeoTrackingConfig` | Per-employee geo-tracking configuration including tracking interval and distance filter. | — |
| `TGeoTrackingConfig_History` | Audit/history mirror of TGeoTrackingConfig capturing prior versions of tracking settings. | — |
| `TGrade` | Master list of employee job grades with grade bands, configurable per employer. | — |
| `TGradeBands` | Lookup master list of grade band names keyed by grade ID. | — |
| `TGridColumnConfig` | Stores user/employer-specific saved column configurations for data grid pages. | — |
| `THelpDesk` | Employee helpdesk support ticket requests with details, status, and HR comments. | `TEmployee` |
| `THelpdeskCategory` | Master list of helpdesk ticket categories configurable per employer. | — |
| `THelpDeskGroup` | Master list of helpdesk support groups and their assigned handlers. | — |
| `THelpDeskGroup_Category` | Maps helpdesk category types to support groups with assigned handlers. | — |
| `THelpDeskGroup_Category_Activity` | Maps specific helpdesk activities to a group-category combination with assigned handlers. | — |
| `THelpDeskGroup_Category_Lkp` | Lookup master list of helpdesk categories used in group-category mapping. | — |
| `THelpDeskHistory` | Audit/history mirror of THelpDesk capturing prior versions of helpdesk ticket records. | `THelpDesk` |
| `THiringReason` | Master list of reasons for hiring, configurable per employer. | `TEmployerDetails` |
| `THive_Payroll_configInfo` | Employee-level Hive external payroll integration config including OAuth tokens. | — |
| `THolidayMaster` | Master list of holidays by calendar, date, and employer, including optional holiday flag. | `TCalendarMaster` |
| `THolidayMaster_History` | Audit/history mirror of THolidayMaster capturing prior versions of holiday records with action taken. | — |
| `THomePageCntsDetails` | Detail records behind home page pending action/approval counts, linked to source requests. | — |
| `THomePageNotificationCategory` | Master list of home page notification group categories with display order. | — |
| `THomePageNotificationCnts` | Per-employee home page notification counts for pending actions and approvals. | — |
| `THomePageNotificationMappHistory` | History log of changes to role-to-notification mapping assignments. | — |
| `THomePageNotificationRoleMapping` | Maps home page notification types to the roles that receive them, per employer. | — |
| `THomePageNotifications` | Master list of home page notification types with request type and display icon. | — |
| `THomePageNotifications_bkp111622` | Backup snapshot (11/16/22) of home page notification configuration records. | — |
| `THomePagePreferences` | Master list of configurable home page widget/preference options with display sequence per employer. | — |
| `THrmsCustomer` | Customer/tenant master record for the HRMS licensing system, including contact and parent customer info. | — |
| `THrmsLicenseUser` | License user accounts mapped to customers, storing login credentials and auth tokens for HRMS access. | — |
| `THrmsModules` | Master list of licensable HRMS application modules with display order and notification flag. | — |
| `TIncomeTaxCategoryType` | Category types under an income tax section, used for tax declaration classification. | — |
| `TIncomeTaxSection` | Master list of income tax sections (e.g. statutory deduction sections) with limits and amounts per employer. | — |
| `TIncomeTaxSectionCategoryDet` | Detail categories and limits within an income tax section for tax exemption calculations. | — |
| `TInterviewCancelledReason` | Master list of reasons for cancelling a candidate interview. | — |
| `TInterviewLevel` | Master list of interview levels/rounds with type and sequence for recruitment workflow. | — |
| `TInterviewMode` | Master list of interview modes (e.g. phone, video, in-person). | — |
| `TIPBasedAccess` | Whitelisted static IP addresses permitted for system access per employer. | `TEmployerDetails` |
| `TJobLocation` | Master list of job/office locations with address and contact details for job postings. | — |
| `TJobSchedulerConfiguration` | Key-value configuration settings for background job scheduler tasks. | — |
| `TJobSchedulerDetails` | Execution log/run history of scheduled background jobs, including status and executed-by info. | `TJobSchedulerMaster` |
| `TJobSchedulerMaster` | Master list of background scheduled jobs with name and description. | — |
| `tKranthi_PayrollDetails` | Ad hoc payroll detail records (basic, CTC, gross, TDS regime) per employee/employment number. | — |
| `tLanguage` | Master list of languages available per employer, e.g. for localization. | — |
| `tleaveadjustments` | Manual/bulk leave balance adjustment transactions with reason and days adjusted. | — |
| `TleaveApplicationStatus` | Master list of possible leave application statuses (e.g. Pending, Approved, Rejected). | — |
| `tLeaveBalance` | Current leave balance per employee and leave type. | — |
| `tLeaveBalance_Sunfire` | Variant/migration copy of employee leave balances, tagged Sunfire, mirroring tLeaveBalance. | — |
| `TLeaveBalance_Sunfire_BKP` | Backup copy of the tLeaveBalance_Sunfire leave balance table. | — |
| `TLeaveBalanceHistory` | Audit/history log of changes to employee leave balances over time. | — |
| `TLeaveBalanceLedger` | Transactional ledger of leave balance movements with opening/closing balance and expiry tracking per employee. | — |
| `TLeaveBalanceLedgerbkp251022` | Backup snapshot (10/25/22) of the TLeaveBalanceLedger leave transaction ledger. | — |
| `TLeaveBusinessUnit` | Mapping of leave types applicable to specific business units. | — |
| `TLeaveBusinessUnit_History` | Audit/history mirror of TLeaveBusinessUnit capturing prior versions of leave-to-business-unit mappings. | — |
| `TLeaveCalendar` | Mapping of leave types to applicable leave calendars. | — |
| `TLeaveClubWith` | Configuration of which leave codes can be clubbed together when applying for leave. | — |
| `TLeaveClubWith_History` | Audit/history mirror of TLeaveClubWith capturing prior versions of leave-clubbing rules. | — |
| `TLeaveEmployeeStatus` | Mapping of leave types to eligible employee statuses, controlling allotment and availing of leaves. | — |
| `TLeaveEmployeeStatus_History` | Audit/history mirror of TLeaveEmployeeStatus capturing prior versions of employee-status leave eligibility. | — |
| `TLeaveGrade` | Mapping of leave types applicable to specific employee grades. | — |
| `TLeaveGrade_History` | Audit/history mirror of TLeaveGrade capturing prior versions of leave-to-grade mappings. | — |
| `TLeaveLocation` | Mapping of leave types applicable to specific job locations. | — |
| `TLeaveLocation_History` | Audit/history mirror of TLeaveLocation capturing prior versions of leave-to-location mappings. | — |
| `TLeaveRequest` | Employee leave application records with dates, reason, status, cancellation and pullback details. | — |
| `TLeaveRequestDays` | Day-by-day breakdown of a leave request, recording status and days for each leave date. | — |
| `TLeaveTypeMaster` | Master configuration of leave types defining rules like cancellation, encashment, half-day, and eligibility. | — |
| `TLeaveTypeMaster_History` | Audit/history mirror of TLeaveTypeMaster capturing prior versions of leave type configuration. | — |
| `TLeaveTypeRules` | Accrual/credit rules per leave type, including frequency, pro-rata, rounding, and scheduling of credit runs. | — |
| `TLeaveTypeRules_History` | Audit/history mirror of TLeaveTypeRules capturing prior versions of leave accrual rules. | — |
| `TLeaveTypes` | Simple lookup list of leave type names and active status. | — |
| `TLicenseEmailTemplate` | Email templates (subject/body/from/cc) used for license-related notifications. | — |
| `TLicenseType` | Master list of license types available for customers/employers. | — |
| `TLicenseUser` | License user account records with login credentials and login-enabled flag per customer. | — |
| `TLoans` | Employee loan records tracking loan amount, balance due, installments, and status. | `TEmployee` |
| `TLoanTransactions` | Individual loan repayment/deduction transactions linked to a loan and pay cycle. | `TEmployee`, `TLoans`, `TPayCycle` |
| `TLocation` | Master list of company office locations with address, contact, and timezone details. | `TCOUNTRY` |
| `TLocationAssets` | Mapping of asset categories allocated/deallocated to a location, with allocation date range. | — |
| `tLocationAssets_History` | Audit/history mirror of TLocationAssets capturing prior versions of location asset allocations. | — |
| `TLockUnlockUserAccount` | Records of employee user account lock/unlock actions with reason and default-password flag. | — |
| `TLockUnlockUserAccount_History` | Audit/history mirror of TLockUnlockUserAccount capturing prior versions of account lock/unlock actions. | — |
| `TLOOKUP` | Generic hierarchical lookup/reference table with parent-child text values used across the system. | — |
| `TLOOKUP_AllocationTitleData` | Variant of the generic lookup table specifically for allocation title data, with old/new ID mapping. | — |
| `TLOOKUP_BKP112922` | Backup snapshot (11/29/22) of the generic TLOOKUP reference table. | — |
| `tlookup_bkp161122` | Backup snapshot (16/11/22) of the generic TLOOKUP reference table. | — |
| `tlookupbackup_81822` | Backup snapshot (8/18/22) of the generic TLOOKUP reference table. | — |
| `TMAddCandidate` | Recruitment record for an added candidate, including personal details, offer letter, and onboarding documents. | — |
| `TMajorField` | Master list of academic major fields of study, scoped per employer. | — |
| `TManualAttendance` | Manually entered employee attendance records with clock-in and clock-out times. | — |
| `TMApplicationStatus` | Master list of application status values used across modules, with soft-delete flag. | — |
| `TMaritalStatus` | Master lookup list of marital status options. | — |
| `TMAssetsMaster` | Master catalog of company assets with category, description, and active/deleted flags per employer. | — |
| `TMAssetsMaster_History` | Audit/history mirror of TMAssetsMaster capturing prior versions of asset records, including numbering and effective-date changes. | — |
| `TMASTER_SSRSReportDetails` | Master list of SSRS reports with name, description, module link, and active flag. | — |
| `TMASTER_SSRSREPORTMODULES` | Master list of modules used to categorize SSRS reports. | — |
| `TMasterEntity` | Master lookup list of business entity names. | — |
| `TMedicalConditionaDetails` | Employee medical condition records with date, condition type, and active status. | `TEmployee` |
| `TMEmploymentTypes` | Master list of employment types with probation/notice period rules and prefix codes, per employer. | — |
| `TMEmploymentTypes_History` | Audit/history mirror of TMEmploymentTypes capturing prior versions of employment type configuration changes. | — |
| `tMenuDetails` | Master list of application navigation menu items with URL, page, and icon, per employer. | — |
| `tMenuDetailsHistory` | Audit/history mirror of tMenuDetails capturing prior versions of menu item changes. | — |
| `TMenuHierarchy` | Parent-child hierarchy structure linking menu items into a navigation tree, per employer. | — |
| `TMenuHierarchyHistory` | Audit/history mirror of TMenuHierarchy capturing prior versions of menu hierarchy changes. | — |
| `TMenuUserManualMap` | Mapping of menu items to user manual/help document entries with navigation links. | — |
| `TMinorField` | Master list of academic minor fields of study, scoped per employer. | — |
| `TMLanguages` | Master lookup list of language keys and descriptions used for localization. | — |
| `TMMandatorySkills` | Mapping of mandatory skills required for a given job role. | `TMSkills`, `TTitle` |
| `TMobileCustomer` | Mobile app tenant configuration storing service URLs, branding, and app version details per customer. | — |
| `tmobilecustomer_bkp432023` | Dated backup snapshot of TMobileCustomer mobile tenant configuration. | — |
| `TMobileNotification` | Registered mobile device push notification tokens per employee, by platform and batch. | `TEmployee`, `TEmployerDetails` |
| `TMobileTracking` | GPS location tracking records for employee mobile trips, including speed, distance, and approval status. | — |
| `TMobileUser` | Registered mobile app users with employee identity, business unit, and online status. | — |
| `TModulePages` | Master list of pages within application modules, with workflow and enable flags. | — |
| `TModulePages_bkp111622` | Dated backup snapshot of TModulePages module page definitions. | — |
| `TMSkills` | Master catalog of skills with category, keywords, and type, per employer. | `TMSkillTypes` |
| `TMSkillTypes` | Master lookup list of skill type classifications. | — |
| `TMSkins` | Master list of UI skin/theme options with active flag. | — |
| `TMTrainings` | Master catalog of training courses with name and description. | — |
| `TMyDetailChangesNotification` | Notification records for employee self-service profile change requests, tracking table/action/status. | `TEmployee` |
| `TMyDetailsChangeRequestDetails` | Field-level old/new value details for employee self-service profile change requests. | — |
| `TMyDetailsChangeRequests` | Header records for employee self-service requests to change personal details, with approval status. | — |
| `TMyDetailsChangesNotificationDetails` | Field-level notification details (old/new values) for employee profile change requests. | `TMyDetailChangesNotification` |
| `TNewsAndEvents` | Company news and events posts with content, active/deleted status, and audit fields. | — |
| `TNewsAndEvents_EmployeeDetails` | Tracks which employees have read a given news/events post. | — |
| `tNoticePeriodTypes` | Master list of notice period type basis options, per employer. | — |
| `TOfferLetterHeaderFooter` | Offer letter document template settings for header, footer, watermark images, and page margins. | `TEmployerDetails`, `TRRSDocumentTemplates` |
| `ToptionalHoliday` | Configuration of optional/floating holiday allowances by year and calendar, per employer. | `TEmployerDetails` |
| `TOptionalHolidayRequest` | Employee requests to take an optional holiday, with status, cancellation, and pullback tracking. | `THolidayMaster` |
| `TOrganisationHierarchy` | Stores the organization chart structure as XML per employer. | — |
| `TORGChart` | Employee reporting-line records linking employee to manager with effective date. | `TEmployee` |
| `TOrgChart_History` | Audit/history mirror of TORGChart capturing prior versions of reporting-line changes. | — |
| `TORGChartHistory` | Audit/history mirror of TORGChart capturing prior versions of employee reporting-line changes. | — |
| `TOrgHierarchyDetails` | Organizational unit hierarchy with parent unit links and active/deleted flags, per employer. | — |
| `TOrgHierarchyDetails_HT` | Variant/staging copy of TOrgHierarchyDetails organizational unit hierarchy data. | — |
| `TOrgnizationRoles` | Organization role assignments linking a role to a responsible employee. | — |
| `TOtherDeductions` | Miscellaneous payroll deduction amounts applied to an employee's pay run. | `TEmployee`, `TPayCycle` |
| `TOverseasExposureDetails` | Employee overseas visit/workshop exposure records with country, organization, and report submission status. | `TEmployee` |
| `TOverTimeWages` | Overtime wage multiplier rules keyed by billable hour bands. | — |
| `TPageModule` | Master list of application page modules. | — |
| `TParameters` | Key-value configuration parameter store, with optional encryption, per employer. | — |
| `TPastEmploymentDetails` | Employee work history records for prior employers, roles, and reasons for leaving. | `TCOUNTRY`, `TEmployee` |
| `TPastEmploymentDetails_bkp` | Backup copy of TPastEmploymentDetails employee prior employment history. | — |
| `TPastEmploymentDetails_History` | Audit/history mirror of TPastEmploymentDetails capturing prior versions of employment history records. | — |
| `TPayCycle` | Payroll pay cycle definitions with type, date range, and processed flag. | — |
| `TPayDeduction` | Payroll deduction amounts applied to an employee's pay run. | `TEmployee`, `TPayCycle` |
| `TPayeDeduction` | PAYE income tax deduction bracket rules with fixed and percentage tax rates. | — |
| `TPayrollMaster` | Employee payroll run summary with gross pay, deductions, allowances, taxes, and net pay. | `TEmployee` |
| `TPersonalfields` | Master list of configurable personal-info fields mapping field names to their source DB tables. | — |
| `TPersonalTitle` | Lookup of personal titles (e.g. Mr, Mrs, Dr) used for employee salutations. | — |
| `TPMS_AppraisalReviewFrequency` | Defines review frequency schedule and multi-level form submission deadlines for an appraisal cycle. | `TPMSAppraisalCycles` |
| `TPMS_AppraisalReviewSequence` | Defines the ordered sequence of reviews configured for an appraisal cycle. | — |
| `TPMS_BulkUploadEmployeeReviewData` | Tracks bulk-uploaded files of employee appraisal review data with comments and source path. | — |
| `TPMS_BulkUploadEmployeeReviewDetails` | Row-level detail of bulk-uploaded employee review data mapping employment numbers to employee IDs. | — |
| `TPMS_EmployeeTrainingDetails` | Tracks training assignments for employees per appraisal cycle, category, topic, year and quarter. | — |
| `TPMS_EmployeeTrainingHistory` | Audit/history mirror of TPMS_EmployeeTrainingDetails capturing prior training status, rating and actions. | — |
| `TPMS_GoalSettingReviewFrequency` | Defines review frequency schedule and multi-level form submission deadlines for a goal-setting cycle. | — |
| `TPMS_TEmployeeGoalSections` | Defines weighted sections and optional custom fields used in employee goal-setting forms. | — |
| `TPMS_TrainingRecComments` | Stores rating comments recorded against an employee's training recommendation. | — |
| `TPMS_ViewManagerCommentsPermissions` | Defines which review levels are permitted to view manager comments per appraisal cycle. | — |
| `TPMS_ViewManagerRatingPermissions` | Defines which review levels are permitted to view manager ratings per appraisal cycle. | — |
| `TPMSAppraisalCumulativeRating` | Stores an employee's cumulative appraisal rating per approval level for an appraisal cycle. | — |
| `TPMSAppraisalCycles` | Master definition of performance appraisal cycles including dates, form type, review levels and mapping flags. | — |
| `TPMSAppraisalCyclesForBU` | Maps appraisal cycles to the business units they apply to. | — |
| `TPMSAppraisalCyclesForDesignation` | Maps appraisal cycles to the designations they apply to. | — |
| `TPMSAppraisalCyclesForRole` | Maps appraisal cycles to the employee roles they apply to. | — |
| `TPMSAppraisalFormComponents` | Defines custom question/answer components and choices used in an appraisal cycle's form. | — |
| `TPMSAppraisalPermissions` | Defines employee/designation/org-unit scoped access and comment permissions for an appraisal cycle. | — |
| `TPMSAppraisalViewManagerPermissions` | Maps appraisal permission sets to review levels allowed to view manager data. | — |
| `TPMSAssessmentViewManagerPermissions` | Defines review levels permitted to view manager assessment data per employer. | — |
| `TPMSCategoryCompetencies` | Maps competencies to appraisal category sections with weightage. | — |
| `TPMSCategoryDesignationMapping` | Maps appraisal/goal categories to designations, roles or business units with applicability flags. | — |
| `TPMSCategoryGoalKRAs` | Maps KRA categories to appraisal category sections with weightage. | — |
| `TPMSCategoryMaster` | Master list of appraisal categories defining section weightages, appraisal type and form type. | — |
| `TPMSCategoryMasterGoalFormData` | Configures optional custom fields and weightage for goal categories linked to an appraisal category. | — |
| `TPMSCategorySections` | Defines weighted sections (e.g. competency, KRA) belonging to an appraisal category. | — |
| `TPMSCompetencyMaster` | Master list of competencies used for appraisal ratings, with name and description per employer. | — |
| `TPMSDesignationMappingForBU` | Maps appraisal/goal categories to business units for designation-based form applicability. | — |
| `TPMSDesignationMappingForDesignation` | Maps appraisal/goal categories to specific designations for form applicability. | — |
| `TPMSDesignationMappingForRole` | Maps appraisal/goal categories to employee roles for form applicability. | — |
| `TPMSEmpAppraisalHRComments` | Stores HR comments recorded against an employee's appraisal for a given cycle. | — |
| `TPMSEmpConfirmationHRComments` | Stores HR comments recorded against an employee's confirmation (probation) case. | — |
| `TPMSEmpConfirmationStatus` | Tracks an employee's confirmation (probation) status over time. | — |
| `TPMSEmployeeAppraisalCycleMapping` | Maps employees to appraisal cycles and categories, tracking form submission/approval status. | — |
| `TPMSEmployeeAppraisalForBellCurve` | Denormalized snapshot of employee appraisal ratings used for bell-curve rating distribution analysis. | — |
| `TPMSEmployeeAppraisalReport` | Denormalized reporting view of employee appraisal cycle results, ratings and profile details. | — |
| `TPMSEmployeeCompetencyRatingAttachment` | Stores file attachments supporting an employee's competency rating submission. | — |
| `TPMSEmployeeCompetencyRatings` | Stores an employee's per-competency appraisal ratings, weightage and manager comments. | — |
| `TPMSEmployeeCompetencyRatingsHistory` | Audit/history mirror of TPMSEmployeeCompetencyRatings capturing prior competency rating values. | — |
| `TPMSEmployeeFormComponentComments` | Stores employee/manager answers and evidence for custom appraisal form component questions. | — |
| `TPMSEmployeeFormMappingForBU` | Maps an employee's goal form to a business unit for goal-setting applicability. | — |
| `TPMSEmployeeFormMappingForDesignation` | Maps an employee's goal form to a designation for goal-setting applicability. | — |
| `TPMSEmployeeFormMappingForRole` | Maps an employee's goal form to a role for goal-setting applicability. | — |
| `TPMSEmployeeGoalComments` | Stores comments recorded at various review levels against an employee's goal. | — |
| `TPMSEmployeeGoalFormComponents` | Defines custom question/answer components and choices used in a goal-setting form. | `TEmployerDetails` |
| `TPMSEmployeeGoalFormComponentsComments` | Stores employee/manager answers and evidence for custom goal form component questions. | — |
| `TPMSEmployeeGoalFormData` | Tracks an employee's saved goal-setting form data and KRA definition flags for a goal cycle. | — |
| `TPMSEmployeeGoalFormDataDetails` | Stores KRA definitions, weightage and custom fields for an employee's goal-setting form data. | — |
| `TPMSEmployeeGoalFormDataHistory` | Audit/history mirror of TPMSEmployeeGoalFormData(Details) capturing prior goal form data versions. | — |
| `TPMSEmployeeGoalFormSettingDetails` | Configures optional custom fields and KRA/KPA description settings for a goal-setting form template. | — |
| `TPMSEmployeeGoalMapping` | Maps employees to goal-setting cycles, tracking multi-level review approval and form status. | — |
| `TPMSEmployeeGoals` | Stores individual employee goals with category, weightage, target date and status for an appraisal cycle. | — |
| `TPMSEmployeeGoalSetting` | Master definition of goal-setting cycles/periods including dates, freeze status and review levels. | — |
| `TPMSEmployeeGoalSettingDetails` | Stores optional custom fields configured for a goal-setting cycle's form template. | — |
| `TPMSEmployeeGoalSettingRatings` | Stores manager ratings and weightage for an employee's goal-setting form submission. | — |
| `TPMSEmployeeGoalSettingReviewLevel` | Defines the names of up to five review levels configured for a goal-setting cycle. | — |
| `TPMSEmployeeGoalSettingTemplate` | Maps a goal-setting cycle to its assigned form template. | — |
| `TPMSEmployeeSelfAppraisal` | Tracks an employee's self-appraisal submission status, weightage and comments for an appraisal cycle. | — |
| `TPMSGoalCategory` | Performance management (PMS) goal category master defining goal groupings per employer. | — |
| `TPMSGoalCategoryDetails` | KRA/KPA and measurement criteria definitions linked to a PMS goal category. | — |
| `TPMSGoalCategoryOutcomeDeatils` | Rating-level outcome ranges (min/max rating, color code) for a goal category's measurement criteria. | — |
| `TPMSGoalManagerComments` | Manager approval-level comments recorded against an employee performance goal. | — |
| `TPMSGoalStatus` | Lookup of performance goal status values (e.g. draft, approved) per employer. | — |
| `TPMSRatingMaster` | Master list of performance appraisal rating scales defined per employer. | — |
| `TPMSRatingScaleDetails` | Level-by-level rating scale bands (min/max rating, description, color) for a rating master. | — |
| `TPMSWeightageMaster` | Master list of performance goal weightage scales defined per employer. | `TEmployerDetails` |
| `TPMSWeightageScaleDetails` | Level-by-level weightage bands (min/max weightage, outcome) for a weightage master. | — |
| `TPoisePayrollDetails` | Connection/authentication config for integrating with the Poise external payroll system. | — |
| `tPoisePayrollEducationDetails` | Employee education/qualification records synced to the Poise payroll system. | — |
| `tPoisePayrollEmployeeDocumentInfo` | Employee document attachment metadata synced to the Poise payroll system. | — |
| `tPoisePayrollEmployeeFullInfo` | Consolidated employment/verification/PF details per employee synced to Poise payroll. | — |
| `tPoisePayrollHrEmployeeFullInfo` | Consolidated HR/personal/bank/contact details per employee synced to Poise payroll. | — |
| `tPoisePayrollHrMediclaimNomineeDetails` | Mediclaim (health insurance) nominee details per employee synced to Poise payroll. | — |
| `tPoisePayrollNomineeDetails` | General insurance/benefit nominee details per employee synced to Poise payroll. | — |
| `tPoisePayrollPastEmploymentDetails` | Employee's previous employment history records synced to the Poise payroll system. | — |
| `TPolicyDocument` | Company policy documents with version, activation date, and upload metadata. | — |
| `TProcessBulkUploadRequest` | Tracks completion status of a bulk upload processing request. | — |
| `TProcessedBatchResult` | Per-batch results and status of a processed bulk employee data upload. | `TEmployeeDetail_Upload_Section` |
| `TProductLocationType` | Lookup of product/asset location types. | — |
| `TProjectConfDetails` | Project configuration details including code, dates, work location, and site allowance amount. | — |
| `TPublicHolidays` | Public holiday calendar entries by year and date. | — |
| `TQualificationLevel` | Lookup of education qualification levels defined per employer. | — |
| `TQualificationName` | Lookup of specific qualification/degree names with search keywords, per employer. | — |
| `tquestion_lookup` | Hierarchical lookup values for questionnaire questions, scoped by root employer. | — |
| `TQuestionnaireMaster` | Master list of questionnaire questions with control type and mandatory/choice settings. | `TQuestionCategory` |
| `TRChart_ChartFields` | Mapping of fields included in a reporting chart definition. | — |
| `TRChartModules` | Mapping of reporting charts to the application modules they belong to. | — |
| `TRCharts_ChartTypes` | Mapping of chart type (e.g. bar, pie) assigned to a reporting chart. | — |
| `TReallocationConfDetails` | Configuration for asset/resource reallocation rules (revocation day, allocation percent) per employer. | — |
| `TRecruiter` | Maps employees designated as recruiters, per employer. | — |
| `TRecruitmentAdminMaster` | Master list of employees assigned as recruitment module administrators. | — |
| `TRecruitmentClaim_Permission` | Permission flags (role-based BU access, retained access rights) for a recruitment claim assignment. | — |
| `TRecruitmentNotifications` | Recruitment workflow notifications sent to managers for approval requests. | — |
| `tref_candidate_status` | Reference lookup of candidate status values and hierarchy, per employer. | — |
| `tref_candidate_status_custom` | Employer-specific customizations/overrides of candidate status reference values. | — |
| `tref_rrs_excelConfig` | Reference configuration of Excel import columns (row name, mandatory, max length) for recruitment RRS. | — |
| `tref_rrs_excelConfig_custom` | Employer-specific customization of the recruitment RRS Excel import column configuration. | — |
| `TRegisterAssets` | Company asset register recording purchase, vendor, warranty, and assignment details of physical assets. | — |
| `TRegisterAssets_History` | Audit/history mirror of TRegisterAssets capturing prior versions of asset records. | — |
| `tReligion` | Lookup of religion values available for employee profiles, per employer. | — |
| `TReportCategories` | Lookup of categories used to group reports. | — |
| `TreportMaster` | Master list of reports with hierarchy, page view name, and employer scoping. | — |
| `TRequestWorkflows` | Generic approval workflow tracking table recording approval-level status for employee requests. | — |
| `TResignation` | Lookup of resignation type/description values, per employer. | — |
| `TResignationActivityDetails` | Offboarding checklist activities and their assignment/approval status for a resignation. | — |
| `TResignationActivityDetails_Arc` | Archive mirror of TResignationActivityDetails preserving completed/past offboarding activity records. | — |
| `TResignationDateTypeMaster` | Lookup of resignation-related date type definitions, per employer. | — |
| `TResignationDetails` | Detailed resignation/separation record for an employee including dates, notice period, and approval status. | `TEmployee`, `TResignation`, `TSeparationType` |
| `TResignationDetails_History` | Audit/history mirror of TResignationDetails capturing prior versions of resignation records. | — |
| `TRestrictEmpForAttendanceNotification` | List of employees excluded from receiving attendance notifications, per employer. | `TEmployee`, `TEmployerDetails` |
| `TRoleBasePagesAccess` | Maps roles/employees to accessible application pages. | `TEmployee`, `TModulePages` |
| `TRoleBasePagesAccess_Arc` | Archive mirror of TRoleBasePagesAccess capturing prior role-to-page access records. | — |
| `tRoleBusinessUnitMapping` | Maps security roles to the business units they are scoped to. | — |
| `tRoleEmployeeMapping` | Maps security roles to the employees assigned to them. | — |
| `tRoleLocationMapping` | Maps security roles to the work locations they are scoped to. | — |
| `TRoleManagement` | Master list of security/access roles with default and authorized-signatory flags, per employer. | — |
| `TRoleManagementArc` | Archive mirror of TRoleManagement capturing prior role definitions including location/BU/employee scope. | — |
| `TRolePagesMapping` | Maps roles to accessible application pages with creation/update audit fields. | — |
| `TRolePagesMappingHistory` | Audit/history mirror of role-to-page access mapping, tracking changes to which pages a role can access. | — |
| `TRoles` | Master list of user roles with name, description, default/active flags, and reporting type per employer. | — |
| `TRoleTabDetails` | Maps roles to accessible menu tabs, with editability flag per employer. | `TTabDetails` |
| `TRoleTabDetailsHistory` | Audit/history mirror of TRoleTabDetails capturing prior versions of role-to-tab access changes. | — |
| `TRollWisePageAccess` | Role-wise page/module access control list with active/inactive flags and tab/menu linkage. | `TPageModule`, `TRoles` |
| `TRollWisePageAccessHistory` | Audit/history mirror of TRollWisePageAccess capturing prior versions of role page access changes. | — |
| `TRRS_GRID_CONFIG` | Per-employee saved grid/table display configuration settings for UI grids. | — |
| `TRRS_GRID_CONFIGbkp22823` | Backup snapshot of TRRS_GRID_CONFIG grid configuration data. | — |
| `TRRSApprover` | List of employees designated as approvers for the recruitment requisition (RRS) workflow. | — |
| `TRRSBudgetSourceDetails` | Budget/donor/project funding source details linked to a recruitment requisition, including CTC bifurcation. | — |
| `TRRSCandidate` | Recruitment candidate master profile with contact, passport, visa, relocation, and current CTC details. | `TRRSDetails` |
| `trrscandidate_bkp` | Backup snapshot of TRRSCandidate candidate profile data. | — |
| `TRRSCandidateAchievements` | Achievements listed for a shortlisted recruitment candidate. | — |
| `TRRSCandidateAchievementsHistory` | Audit/history mirror of TRRSCandidateAchievements capturing prior versions of candidate achievement entries. | — |
| `trrscandidateActivityDet` | Activity log of status changes and actions taken on a recruitment candidate. | `TRRSCandidate` |
| `tRRSCandidateClientOrg` | Client organizations a shortlisted candidate previously worked with, with engagement period. | — |
| `tRRSCandidateClientOrgHistory` | Audit/history mirror of tRRSCandidateClientOrg capturing prior versions of candidate client-org records. | — |
| `tRRSCandidateComments` | Comments/notes logged against a recruitment candidate or shortlist entry. | — |
| `TRRSCandidateEduDetails` | Educational qualification history of a recruitment candidate, including degree, university, and gaps. | `TRRSCandidate` |
| `TRRSCandidateEmployerDet` | Prior employment history of a recruitment candidate, including designation, CTC, and employment gaps. | `TRRSCandidate` |
| `TRRSCandidateFeedback` | Interview feedback and skill/quality assessment ratings recorded for a recruitment candidate. | `TRRSDetails` |
| `TRRSCandidateInterview` | Scheduled and conducted interview records for recruitment candidates, including panel, status, and meeting details. | `TRRSCandidate` |
| `TRRSCandidateMapping` | Mapping of shortlisted candidates to requisitions with recruiter assignment, stage, and status tracking. | — |
| `TRRSCandidateNotes` | Free-text notes recorded against a recruitment candidate. | `TRRSCandidate` |
| `TRRSCandidateOfferDetails` | Offer letter email/document details generated and sent to a recruitment candidate. | — |
| `tRRSCandidateOtherOffers` | Other competing job offers held by a shortlisted candidate, with reason for not joining. | — |
| `tRRSCandidateOtherOffersHistory` | Audit/history mirror of tRRSCandidateOtherOffers capturing prior versions of candidate's other-offer records. | — |
| `TRRSCandidateProjectSkills` | Project-specific skill details and usage duration for a shortlisted candidate. | — |
| `TRRSCandidateProjectSkillsHistory` | Audit/history mirror of TRRSCandidateProjectSkills capturing prior versions of candidate project skill entries. | — |
| `TRRSCandidateSkillDetails` | Skill inventory of a recruitment candidate with years of experience, certification, and rating. | `TRRSCandidate` |
| `TRRSCandidateSourcing` | Sourced candidate leads captured for a requisition, including source channel, recruiter, and status. | — |
| `tRRSCandidateTraining` | Training/course information recorded for a shortlisted recruitment candidate. | — |
| `tRRSCandidateTrainingHistory` | Audit/history mirror of tRRSCandidateTraining capturing prior versions of candidate training records. | — |
| `TRRSCandidiateInitiateHiringComments` | Comments raised during the hiring-initiation process for a candidate, covering referral, joining, relocation, and notice-period topics. | — |
| `TRRSClientMaster` | Master list of client organizations associated with recruitment requisitions. | — |
| `tRRSComments` | General comments logged against a recruitment requisition (RRS). | — |
| `TrrsCtcComments` | Comments on CTC/compensation details recorded during an HR interview for a candidate. | — |
| `TRRSDetailNotes` | Detailed notes recorded against a recruitment requisition (RRS). | `TRRSDetails` |
| `TRRSDetails` | Core recruitment requisition (job opening) record with title, priority, client, positions, CTC range, timing, and approval status. | — |
| `TRRSDETAILS_bkp` | Backup snapshot of TRRSDetails recruitment requisition data. | — |
| `TRRSDocumentTemplates` | Document templates (e.g. offer letters) used within the recruitment module, with approval status. | — |
| `TrrsDomainDetails` | Domain expertise requirements or candidate domain experience linked to a recruitment requisition. | `TRRSDetails` |
| `TrrsHRCandidateInterview` | HR-round interview record for a recruitment candidate against a requisition, with status tracking. | — |
| `TrrsHRInterviewAdditionalInfo` | Additional question-and-answer responses captured during an HR interview. | — |
| `TrrsHRInterviewCompatibilityMatrix` | HR interview assessment comparing candidate's current vs expected vs offered role, responsibilities, designation, and timing. | — |
| `TrrsHRInterviewCTCDet` | Current, expected, and negotiated CTC/compensation details captured during an HR interview. | — |
| `TrrsHRInterviewEduDetails` | Educational qualification details captured during an HR interview for a candidate. | — |
| `TrrsHRInterviewEmployerDet` | Prior employment details captured during an HR interview for a candidate. | — |
| `TrrsHRInterviewJobFit` | Job-fit assessment captured during an HR interview, covering relocation, onsite, transport, and timing preferences. | — |
| `TrrsHRInterviewMiscellaneousSection` | Miscellaneous template-driven questionnaire answers captured during an HR interview. | — |
| `TrrsHRInterviewPersonalDet` | Personal details (hometown, tenure, marital status, family, medical history) captured during an HR interview. | — |
| `TrrsHRInterviewPersonalityTraits` | Personality-trait questionnaire answers captured during an HR interview. | — |
| `TrrsHRInterviewRecommendation` | HR interviewer's final recommendation on role and compensation for a candidate. | — |
| `TrrsHRInterviewSkillDet` | Skill ratings and competency assessment captured during an HR interview for a candidate. | — |
| `TrrsHrInterviewTemplate` | Master list of HR interview questionnaire templates by section, per employer. | — |
| `TRRSjobposting` | Job postings published for a recruitment requisition, with job details, qualifications, and experience range. | `TRRSDetails` |
| `TRRSjobreferral` | Employee-referred candidate submissions linked to a job posting/requisition. | `TRRSDetails` |
| `TRRSManualStatus` | Master list of manually defined status values used in the recruitment (RRS) workflow. | — |
| `TRRSOutlookEmailDetails` | Log of interview-related Outlook emails sent, including recipients, subject, body, and meeting time. | — |
| `TRRSPageConfig` | Per-employee/employer UI page configuration settings for the recruitment module. | — |
| `TRRSPOSITIONDETAILS` | Transaction log of actions/comments on a recruitment requisition (RRS) position. | — |
| `TRRSRatingMaster` | Master list of candidate rating scales with number of levels, used in recruitment (RRS). | — |
| `TRRSRatingScaleDetails` | Level-wise min/max rating ranges and descriptions for an RRS rating scale. | — |
| `TrrsSection` | Master of recruitment requisition (RRS) sections/categories. | — |
| `TRRSShortListCandidate` | Shortlisted candidate profile for a recruitment requisition, including interview, CTC and status details. | — |
| `TRRSShortlistCandidateEduDetails` | Education/degree details of a shortlisted recruitment candidate. | `TRRSShortListCandidate` |
| `TRRSShortlistCandidateEduDetailsHistory` | Audit/history mirror of TRRSShortlistCandidateEduDetails capturing prior versions of rows. | — |
| `TRRSShortListCandidateEmpDetails` | Prior employment history details of a shortlisted recruitment candidate. | — |
| `TRRSShortListCandidateEmpDetailsHistory` | Audit/history mirror of TRRSShortListCandidateEmpDetails capturing prior versions of rows. | — |
| `TRRSShortListCandidateHistory` | Audit/history mirror of TRRSShortListCandidate capturing prior versions of shortlisted candidate records. | — |
| `TRRSShortlistCandidateSkillDet` | Skill-wise experience and rating details of a shortlisted recruitment candidate. | `TRRSShortListCandidate` |
| `TRRSShortlistCandidateSkillDetHistory` | Audit/history mirror of TRRSShortlistCandidateSkillDet capturing prior versions of rows. | — |
| `TRRSShortListCertifications` | Certifications listed for a shortlisted recruitment candidate. | — |
| `TRRSShortListCertificationsHistory` | Audit/history mirror of TRRSShortListCertifications capturing prior versions of rows. | — |
| `TRRSSkillDetails` | Required skills and expertise levels defined for a recruitment requisition (RRS). | `TRRSDetails` |
| `TRRSStatus` | Master of status values used on recruitment (RRS) dashboards, ordered by sequence. | — |
| `TRRSTempBudgetSourceDetails` | Funding/donor/project budget source details allocated to a recruitment requisition position. | — |
| `TRRStransactionDetails` | Transaction log of recruiter assignment and status changes on a recruitment requisition (RRS). | `TRRSDetails` |
| `TSaralEmployeeDataMapping` | Mapping of employees to branch/leave/salary/attendance config IDs for sync with external Saral system. | — |
| `TScheduleDeductionType` | Master list of payroll deduction types used in scheduling. | — |
| `TScheduleInterview` | Scheduled exit/resignation-related interview entries for an employee. | `TEmployee` |
| `TSCHEDULERCONFIGURATION` | Configuration settings for automated schedulers, including data reconciliation and employee restrictions. | — |
| `TSchedulers` | Definitions of recurring/scheduled jobs (hourly, daily, weekly, monthly, yearly) with next-run and status tracking. | `TEmployerDetails`, `TJobSchedulerMaster` |
| `TSchedulerTransactions` | Execution log of individual scheduler runs, including status, errors and timing. | `TSchedulers` |
| `TSecondaryActivityOwnerRole` | Master of roles designated as secondary owners of activities/tasks. | — |
| `TSEP_SetupAutoExitInterview` | Configuration for automatically triggering exit interviews after resignation based on days and mapping rules. | — |
| `TSEP_SetupAutoExitInterviewMappingForBU` | Business unit mapping for an auto exit-interview setup rule. | — |
| `TSEP_SetupAutoExitInterviewMappingForDesignation` | Designation mapping for an auto exit-interview setup rule. | — |
| `TSEP_SetupAutoExitInterviewMappingForLocation` | Location mapping for an auto exit-interview setup rule. | — |
| `TSEP_SetupAutoExitInterviewMappingForRole` | Role mapping for an auto exit-interview setup rule. | — |
| `TSeparationType` | Master list of employee separation/termination types. | — |
| `TShift` | Shift master defining weekday, Saturday, Sunday and holiday start/end times. | — |
| `TShiftAttendanceConfig` | Attendance calculation rules per shift, including absent/half-day/full-day hour thresholds and grace periods. | — |
| `TShiftAttendanceConfig_bkp72722` | Dated backup copy of TShiftAttendanceConfig. | — |
| `TShiftAttendanceConfig_History` | Audit/history mirror of TShiftAttendanceConfig capturing prior versions of rows. | — |
| `TShiftGroupEmployee` | Assignment of employees to shift groups. | — |
| `TShiftGroupMapping` | Mapping of individual shifts to a shift group. | — |
| `TShiftGroupMaster` | Master of shift groups defining grace periods and occurrence-based attendance rules. | — |
| `TSHIFTMASTER` | Shift master defining timings, grace periods, absent/half-day/full-day rules and overtime. | — |
| `TSHIFTMASTER_History` | Audit/history mirror of TSHIFTMASTER capturing prior versions of shift definitions. | — |
| `TSkillDomainMaster` | Master of skill domains with descriptions and search keywords. | — |
| `TSQL_Errorlogs` | Log table capturing SQL error messages raised by stored procedures. | — |
| `TSubject` | Master list of subjects, per employer. | — |
| `TSubscriptionExecutionHistory` | History of when each subscription was last executed. | `TSubscriptionType` |
| `TSubscriptions` | Employee subscriptions to notification/report subscription types. | `TSubscriptionType` |
| `TSubscriptionType` | Master of subscription types with execution frequency. | — |
| `TTabDetails` | Master of UI tabs belonging to a menu. | — |
| `TTaskDocument` | Documents attached to a task record. | — |
| `TTaxCode` | Master of tax codes and descriptions. | — |
| `TTempAccessCardReason` | Master of reasons for issuing a temporary access card. | `TEmployerDetails` |
| `TTemporaryCardMstr` | Master of temporary access cards with card and access identifiers. | — |
| `TTemporaryCardUsageDet` | Allocation/usage details of a temporary access card issued to an employee. | — |
| `TTerminationActivityDetails` | Checklist of offboarding activities and their owners/due dates tied to an employee termination. | — |
| `TTerminationDetail` | Employee termination/exit record including reason, last working date, approvals and exit interview status. | `TEmployee`, `TTerminationReason` |
| `TTerminationDetailHistory` | Audit/history mirror of TTerminationDetail capturing prior versions of termination records. | — |
| `TTerminationReason` | Master list of employee termination reasons. | — |
| `TTimeSheet` | Timesheet header record for an employee's pay period, including submission and approval status. | `TEmployee`, `TPayCycle` |
| `TTimeSheetTasks` | Task-level line items within a timesheet, with hours worked per cost center. | `TCostCenters`, `TTimeSheet` |
| `TTitle` | Master of person titles with description and associated designation level. | — |
| `TUniverSity` | Master list of universities/institutions. | — |
| `TUserEmployee` | Mapping table linking system user accounts to their corresponding employee records. | — |
| `TUSerPagesMapping` | Maps users/roles to authorized application pages, controlling page-level access permissions. | — |
| `TUSerPagesMappingHistory` | Audit/history mirror of TUSerPagesMapping capturing prior page-access mapping changes. | — |
| `TuserPasswordHistory` | Historical log of past user passwords with change dates, used for password reuse checks. | `TEmployerDetails` |
| `TUsers` | Core user account table storing login credentials, roles, lock/status flags, and mobile app version. | `TRoles` |
| `TUsersHistory` | Audit/history mirror of TUsers capturing prior versions of user account changes. | — |
| `TUserTabDetails` | Maps users to editable menu tabs within pages, controlling tab-level UI permissions. | `TTabDetails` |
| `TUserTabDetailsHistory` | Audit/history mirror of TUserTabDetails capturing prior tab-permission changes. | — |
| `TVacancyRequisition` | Job vacancy requisition requests raised by managers specifying role, skills, and headcount needed. | `TDepartment`, `TEmployee`, `TMEmploymentTypes` |
| `TVaccinationDetails` | Employee vaccination records including vaccination type, date, and reference/batch number. | `TEmployee` |
| `TVisaType` | Master list of visa types available for employee immigration/work-authorization records. | — |
| `TVoucher` | Voucher header records tracking issuance, status, confirmation, and cancellation/closure lifecycle. | `TvoucherTypeMaster` |
| `TVoucherAmount` | Denomination/amount breakdown lines associated with a voucher. | `TVoucher` |
| `TVoucherBaseLocations` | Maps vouchers to the locations where they are valid or issued. | `TVoucher` |
| `TvoucherTypeMaster` | Master list of voucher types with denomination counts and allowed amount values. | `TEmployerDetails` |
| `TWEBAPI_AUTHORIZATION` | Stores web API client credentials (client ID, secret key) and key expiration for authorization. | — |
| `TWeeklyOffMaster` | Master calendar defining weekly off days (full/half day) per week number and weekday. | `TCalendarMaster` |
| `TWeeklyOffMaster_History` | Audit/history mirror of TWeeklyOffMaster capturing prior weekly-off configuration changes. | — |
| `TWorkflowDetails` | Approval workflow routing details defining managers, levels, and notification templates per workflow. | — |
| `TWorkflowManagement` | Master approval workflow definitions including routing levels, mapped pages, and workflow tree structure. | `THrmsModules` |
| `TWorkflowManagement_History` | Audit/history mirror of TWorkflowManagement capturing prior workflow definition changes. | — |
| `TWorkflowManagementArc` | Archive table for TWorkflowManagement retaining deleted or superseded workflow definitions. | `THrmsModules` |
| `TWorkFromHomeRequest` | Employee work-from-home request records with dates, duration, status, and cancellation/pullback details. | — |
| `TWorkfromHomeRequestDays` | Day-level breakdown of individual work-from-home dates linked to a WFH request. | — |
| `UCC_Employee_Business_UnitDetails` | Reference/import list mapping employees to their business unit/department by name and email. | — |
| `UCC_VendorAccNumber` | Reference/import list mapping employees to vendor account numbers, designation, and skill category. | — |
