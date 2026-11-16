---
object: SP_AdminLM_InsLeaveTypeRules
kind: procedure
database: hrms
source: HRMS-DATABASE/HRMS/STOREPROCEDURE/SP_AdminLM_InsLeaveTypeRules.sql
last-analyzed: 2026-11-09
---

# SP_AdminLM_InsLeaveTypeRules

## What it does

Inserts a leave credit rule, optionally computing next run date and filing admin approval.

## Parameters

| Name | Direction | What it is for |
|---|---|---|
| `@LeaveCode` | in | `VARCHAR(10)` |
| `@Frequency` | in | `VARCHAR(20)` |
| `@StartMonth` | in | `VARCHAR(15)` |
| `@CreditMonth` | in | `VARCHAR(10)` |
| `@CreditYear` | in | `INT` |
| `@UseProRata` | in | `INT` |
| `@NoOfDays` | in | null |
| `@Roundoff` | in | `VARCHAR(30)` |
| `@PeriodOfCredit` | in | `CHAR(2)` |
| `@EmailNotify` | in | `VARCHAR(500)` |
| `@ISActive` | in | `BIT` |
| `@Createdby` | in | `INT` |
| `@Employerid` | in | `INT` |
| `@CreditLeaveDOBOrSOM` | in | `CHAR` |
| `@ProRataDayType` | in | `VARCHAR(10)--` |
| `@ExclusionDays` | in | `INT` |
| `@LeavesCreditOn` | in | `VARCHAR(10)` |
| `@CalculationType` | in | `CHAR(2)` |
| `@ConditionalData` | in | `VARCHAR(MAX)` |
| `@SeparationExcludeDays` | in | `INT--` |
| `@AccuralNumberofLeaves` | in | `NUMERIC(9` |
| `@AccuralPresentDays` | in | `INT` |
| `@EffectiveFrom` | in | `DATE` |
| `@EffectiveTill` | in | `DATE` |
| `@ExistingEmpProRata` | in | `BIT` |
| `@CFIncludePresent` | in | `BIT` |
| `@CFIncludePaidLeave` | in | `BIT` |
| `@CFIncludeHoliday` | in | `BIT` |
| `@CFIncludeWeeklyOff` | in | `BIT` |
| `@CFDenominatorType` | in | `CHAR(1)` |
| `@NewJoinerSameAsExisting` | in | `BIT` |
| `@ExistingEmpProRataDayType` | in | `VARCHAR(10)` |
| `@CFNumeratorType` | in | `VARCHAR(100)` |
| `@CFPaidLeaveCodes` | in | `VARCHAR(MAX)` |
| `@MinQualifyingService` | in | `INT` |
| `@MinQualifyingServiceUnit` | in | `VARCHAR(1)` |
| `@CreditOnNoticePeriod` | in | `BIT` |
| `@SendLeaveCreditEmail` | in | `BIT` |
| `@ExperienceTo` | in | null |
| `@NumberOfLeaves` | in | null |
| `@DesignationId` | in | `VARCHAR(MAX)` |
| `@PresentDaysTo` | in | null |
| `@TransId` | in | `NUMERIC` |
| `@lv_LeaveType` | in | `` |
| `@LeaveCode` | in | `` |
| `@EffectiveFrom` | in | `` |
| `@PeriodOfCredit` | in | `` |
| `@Frequency` | in | `` |
| `@NextRunDate` | out | `` |
| `@LeaveCode` | in | `AS` |
| `@Frequency` | in | `AS` |
| `@StartMonth` | in | `AS` |
| `@CreditYear` | in | `AS` |
| `@CreditMonth` | in | `AS` |
| `@UseProRata` | in | `AS` |
| `@AccuralNumberofLeaves` | in | `AS` |
| `@AccuralPresentDays` | in | `AS` |
| `@NoOfDays` | in | `AS` |
| `@Roundoff` | in | `AS` |
| `@PeriodOfCredit` | in | `AS` |
| `@lv_NextRunDate` | in | `AS` |
| `@ISActive` | in | `AS` |
| `@EmailNotify` | in | `AS` |
| `@Createdby` | in | `AS` |

## Call sequence

```mermaid
sequenceDiagram
  participant Caller
  participant Main as SP_AdminLM_InsLeaveTypeRules
  participant N0 as SP_AdminLM_GetLeaveTypeRules_NextRunDate
  participant N1 as SP_AddAdminChanges
  Caller->>Main: execute
  Main->>N0: call
  Main->>N1: call
```

## Callers

| Object | Kind | Page |
|---|---|---|
| `uspProcessLeaveCreditRuleData` | procedure | No page yet |

## Nested

| Object | Kind | When | Page |
|---|---|---|---|
| `SP_AdminLM_GetLeaveTypeRules_NextRunDate` | procedure | Called while this object runs | [SP_AdminLM_GetLeaveTypeRules_NextRunDate](/docs/database/hrms/SP_AdminLM_GetLeaveTypeRules_NextRunDate) |
| `SP_AddAdminChanges` | procedure | Called while this object runs | [SP_AddAdminChanges](/docs/database/hrms/SP_AddAdminChanges) |

## Steps

In `HRMS-DATABASE/HRMS/STOREPROCEDURE/SP_AdminLM_InsLeaveTypeRules.sql`:
1. Accept the declared parameters and run the procedure or function body.
2. Call nested objects listed under Nested when their guarding branches are true.
3. Read or write the tables listed under Tables.
4. Return result sets, scalar values, or status as defined in the script.

## Tables

| Table | Read or write |
|---|---|
| `TDesignationBasedLeave` | read or write |
| `TEmployeeGroupBasedLeave` | read or write |
| `TEmploymentTypeBasedLeave` | read or write |
| `TExperienceBasedLeaves` | read or write |
| `tLeaveTYpeMaster` | read or write |
| `TLeaveTypeRules` | read or write |
| `TModulePages` | read or write |
| `TPresentDaysBasedLeave` | read or write |
| `TWorkflowManagement` | read or write |

## Flow

```mermaid
flowchart TD
  Start[SP_AdminLM_InsLeaveTypeRules] --> Run[Apply the inputs]
  Run --> Child[SP_AdminLM_GetLeaveTypeRules_NextRunDate]
  Child --> Done[Return the result]
```
