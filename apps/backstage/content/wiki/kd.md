Liquibase Migration Guide for TDG HRMS Database
Context
Repository: TDG HRMS DB (cloned from Azure DevOps) Challenge: Migrating an existing database with 1000+ SQL files that have already been applied to production Goal: Implement Liquibase for version control and automated deployments going forward

Key Decision: Initial Setup Approach
✅ Use changelog-sync (CORRECT)
Marks changesets as already executed WITHOUT running them
Perfect for existing databases with applied changes
Prevents re-running changes that already exist in the database
❌ Do NOT use generate-changelog
Would reverse-engineer current database state
Loses history and organization of original SQL files
Generated changelog won't match existing SQL files
Harder to maintain
Recommended Migration Strategy
Phase 1: Baseline Creation
Step 1: Generate Baseline Schema Snapshot
# Generate a snapshot of the current production database
liquibase --output-file=baseline/baseline-schema.sql generate-changelog
This creates a single SQL file representing the entire current database state for fresh installations only.

Step 2: Create Master Changelog Structure
<?xml version="1.0" encoding="UTF-8"?>
<databaseChangeLog
    xmlns="http://www.liquibase.org/xml/ns/dbchangelog"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://www.liquibase.org/xml/ns/dbchangelog
    http://www.liquibase.org/xml/ns/dbchangelog/dbchangelog-latest.xsd">
    <!-- ===================================================== -->
    <!-- BASELINE CHANGESET                                    -->
    <!-- For fresh database installations only                 -->
    <!-- ===================================================== -->
    <changeSet id="baseline-fresh-install" author="migration" context="new-database">
        <comment>Full schema for fresh database installations (as of 2026-01-09)</comment>
        <sqlFile path="../baseline/baseline-schema.sql" 
                 relativeToChangelogFile="true"
                 splitStatements="true"
                 endDelimiter="GO"/>
        <tagDatabase tag="baseline-v1.0"/>
    </changeSet>
    <!-- ===================================================== -->
    <!-- BASELINE MARKER                                       -->
    <!-- For existing databases - marks migration point        -->
    <!-- ===================================================== -->
    <changeSet id="baseline-existing-db" author="migration" context="!new-database">
        <tagDatabase tag="baseline-v1.0"/>
        <comment>Baseline marker: All changes before 2026-01-09 are already applied</comment>
    </changeSet>
    <!-- ===================================================== -->
    <!-- FUTURE CHANGES START HERE                             -->
    <!-- All new changes after Liquibase migration             -->
    <!-- ===================================================== -->
    
    <!-- Include future changesets below -->
    
</databaseChangeLog>
Step 3: Archive Old SQL Files
Organize the repository:

TDG HRMS DB/
├── archive/
│   └── pre-liquibase-2026-01-09/
│       ├── TABLES/           # 1000+ old table scripts
│       ├── STORED-PROCEDURES/
│       ├── VIEWS/
│       ├── FUNCTIONS/
│       └── README.md         # Document what's archived and why
├── baseline/
│   └── baseline-schema.sql   # Generated snapshot for fresh installs
├── changelog/
│   ├── db.changelog-master.xml
│   └── releases/
│       ├── v2.0/
│       ├── v2.1/
│       └── ...
├── DDL/                      # NEW changes only
├── DML/
├── STORED-PROCEDURE/
└── liquibase.properties
Create archive/pre-liquibase-2026-01-09/README.md:

# Pre-Liquibase SQL Files Archive
**Archived Date**: 2026-01-09
**Total Files**: 1000+ SQL files
## Purpose
These SQL files represent all database changes applied to production before 
Liquibase migration. They are archived for historical reference only.
## Status
✅ All changes in this archive have been applied to production
✅ Baseline snapshot created: `baseline/baseline-schema.sql`
✅ Production database synced with baseline tag: `baseline-v1.0`
## Important Notes
- **DO NOT** modify these files
- **DO NOT** add these to new Liquibase changesets
- For new changes, create new changesets in the main changelog
- These files are kept for audit and reference purposes only
Phase 2: Initial Deployment to Existing Databases
For Production/Staging/UAT (databases that already have the schema):
# Step 1: Verify connection
liquibase status
# Step 2: Sync to baseline (marks baseline as executed without running it)
liquibase changelog-sync-to-tag --tag=baseline-v1.0
# Step 3: Verify sync
liquibase status
# Should show: "Database is up to date. No changesets to execute."
# Step 4: Check DATABASECHANGELOG table
liquibase history
# Should show baseline changesets marked as EXECUTED
For Fresh/New Databases:
# Use context to run the baseline schema
liquibase update --contexts=new-database
Phase 3: Future Development Workflow
Creating New Changes
1. DDL Changes (Tables, Columns, Indexes)

Create file: DDL/v2.0/001_add_employee_email.sql

-- Plain SQL file (will be wrapped in changeset in master changelog)
IF NOT EXISTS (
    SELECT 1 FROM sys.columns 
    WHERE object_id = OBJECT_ID('dbo.T_Employee') AND name = 'Email'
)
BEGIN
    ALTER TABLE dbo.T_Employee ADD Email NVARCHAR(255) NULL;
END
GO
Add to 
db.changelog-master.xml
:

<changeSet id="ddl-v2.0-001-add-employee-email" author="hiep.pham" labels="v2.0">
    <comment>Add Email column to Employee table</comment>
    <sqlFile path="../DDL/v2.0/001_add_employee_email.sql" 
             relativeToChangelogFile="true"
             splitStatements="true"
             endDelimiter="GO"/>
    <rollback>
        ALTER TABLE dbo.T_Employee DROP COLUMN Email;
    </rollback>
</changeSet>
2. Stored Procedures (Use Liquibase Formatted SQL with runOnChange)

Create file: STORED-PROCEDURE/v2.0/sp_GetEmployeeDetails.sql

--liquibase formatted sql
--changeset hiep.pham:sp-get-employee-details runOnChange:true splitStatements:false endDelimiter:GO labels:v2.0
--comment: Get employee details with email
CREATE OR ALTER PROCEDURE dbo.sp_GetEmployeeDetails
    @EmployeeId INT
AS
BEGIN
    SELECT 
        EmployeeId,
        FirstName,
        LastName,
        Email,
        Department
    FROM dbo.T_Employee
    WHERE EmployeeId = @EmployeeId;
END
GO
Include in master changelog:

<include file="../STORED-PROCEDURE/v2.0/sp_GetEmployeeDetails.sql" 
         relativeToChangelogFile="true"/>
3. Views (Use runOnChange for in-place modifications)

--liquibase formatted sql
--changeset hiep.pham:view-employee-summary runOnChange:true splitStatements:false endDelimiter:GO labels:v2.0
--comment: Employee summary view with email
CREATE OR ALTER VIEW dbo.vw_EmployeeSummary
AS
SELECT 
    EmployeeId,
    FirstName + ' ' + LastName AS FullName,
    Email,
    Department
FROM dbo.T_Employee;
GO
Phase 4: Deployment Process
Development Environment
# Deploy all pending changes
liquibase update
# Or deploy specific release
liquibase update --label-filter="v2.0"
UAT/Staging Environment
# Preview changes (SQL only, doesn't execute)
liquibase update-sql --label-filter="v2.0" > preview.sql
# Review preview.sql, then deploy
liquibase update --label-filter="v2.0"
# Tag the release
liquibase tag v2.0-uat
Production Environment
# Generate deployment SQL for review
liquibase update-sql --label-filter="v2.0" > production-deploy-v2.0.sql
# After approval, deploy
liquibase update --label-filter="v2.0"
# Tag production release
liquibase tag v2.0-production
# Backup for rollback if needed
liquibase rollback-sql v2.0-production > rollback-v2.0.sql
Best Practices
Changeset Guidelines
Never modify executed changesets - Always create new ones
Use meaningful IDs: {type}-{version}-{sequence}-{description}
Example: ddl-v2.0-001-add-employee-email
Always add comments explaining what and why
Use labels for release versions: v2.0, v2.1, hotfix-2024-01
Use contexts for environment-specific changes: dev, uat, prod
File Organization
changelog/
├── db.changelog-master.xml          # Main changelog (includes all others)
└── releases/
    ├── v2.0/
    │   ├── changelog-v2.0.xml       # Release-specific changelog
    │   └── README.md                # Release notes
    └── v2.1/
        └── changelog-v2.1.xml
DDL/
├── v2.0/
│   ├── 001_add_employee_email.sql
│   └── 002_add_department_table.sql
└── v2.1/
    └── 001_add_employee_phone.sql
STORED-PROCEDURE/
├── v2.0/
│   └── sp_GetEmployeeDetails.sql
└── v2.1/
    └── sp_GetDepartmentSummary.sql
Rollback Strategy
For DDL Changes:

<changeSet id="..." author="...">
    <sqlFile path="..."/>
    <rollback>
        <sqlFile path="../rollback/001_rollback.sql"/>
    </rollback>
</changeSet>
For Stored Procedures with runOnChange:

Keep previous version in git history
Rollback = revert to previous git commit and redeploy
Testing Rollback:

# Preview rollback
liquibase rollback-sql v2.0-production
# Execute rollback
liquibase rollback v2.0-production
Common Scenarios
Scenario 1: Hotfix in Production
# Create hotfix changeset with label
# In db.changelog-master.xml:
<changeSet id="hotfix-2026-01-001" author="hiep.pham" labels="hotfix-2026-01">
    <sqlFile path="../DDL/hotfix/001_fix_employee_constraint.sql"/>
</changeSet>
# Deploy only the hotfix
liquibase update --label-filter="hotfix-2026-01"
Scenario 2: Environment-Specific Data
<!-- Test data for dev/uat only -->
<changeSet id="dml-test-data" author="hiep.pham" context="dev,uat">
    <sqlFile path="../DML/test-data.sql"/>
</changeSet>
# Deploy with context
liquibase update --contexts=dev
Scenario 3: Updating Stored Procedure
--liquibase formatted sql
--changeset hiep.pham:sp-get-employee-details runOnChange:true labels:v2.1
-- Just modify the SQL and redeploy - runOnChange will detect changes
CREATE OR ALTER PROCEDURE dbo.sp_GetEmployeeDetails
    @EmployeeId INT
AS
BEGIN
    -- Modified logic here
    SELECT * FROM T_Employee WHERE EmployeeId = @EmployeeId;
END
GO
Troubleshooting
Issue: "Changeset already exists"
Solution: Never modify existing changesets. Create a new one.

Issue: "Checksum mismatch"
Cause: Someone modified an already-executed changeset Solution:

# Clear checksums (use with caution!)
liquibase clear-checksums
Issue: Path collisions (case-sensitive paths)
Note: Your clone showed warnings about TABLES vs Tables Solution: Standardize on one case (e.g., all lowercase) and clean up duplicates

Quick Reference Commands
# Check pending changes
liquibase status
# Preview SQL without executing
liquibase update-sql
# Deploy all pending changes
liquibase update
# Deploy specific label
liquibase update --label-filter="v2.0"
# Deploy with context
liquibase update --contexts=dev
# Mark changes as executed (without running)
liquibase changelog-sync
# View deployment history
liquibase history
# Tag current state
liquibase tag v2.0-production
# Rollback to tag
liquibase rollback v2.0-production
# Generate rollback SQL
liquibase rollback-sql v2.0-production
# Validate changelog
liquibase validate
Next Steps for TDG HRMS Migration
✅ Review the cloned repository structure
⬜ Identify and count all existing SQL files
⬜ Generate baseline schema snapshot from production
⬜ Create master changelog with baseline changesets
⬜ Archive old SQL files with documentation
⬜ Test changelog-sync on a copy of production database
⬜ Create first post-migration changeset as a test
⬜ Document deployment process for the team
⬜ Set up CI/CD pipeline integration
⬜ Train team on new workflow
Important Warnings
CAUTION

Never run liquibase update on production without first running changelog-sync on the initial migration. This would attempt to re-run all baseline changes!

WARNING

Never modify changesets that have been executed in any environment. Always create new changesets for changes.

IMPORTANT

Always test rollback procedures in lower environments before production deployments.

