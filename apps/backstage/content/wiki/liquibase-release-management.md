# Liquibase Database Release Management Guide

**Version:** 2.0
**Last Updated:** 2026-01-09
**Applies To:** TDG HRMS Database (All 7 Databases)

---

## Table of Contents

1. [Purpose of This Document](#1-purpose-of-this-document)
2. [High-Level Deployment Architecture](#2-high-level-deployment-architecture)
3. [Repository Structure](#3-repository-structure)
4. [Baseline Approach for Existing Databases](#4-baseline-approach-for-existing-databases)
5. [Liquibase Changelog Design](#5-liquibase-changelog-design)
6. [How Developers Add Database Changes](#6-how-developers-add-database-changes)
7. [Modifying Existing Database Objects](#7-modifying-existing-database-objects)
8. [Azure Pipeline – How Deployment Works](#8-azure-pipeline--how-deployment-works)
9. [Deploying Selective Changes (Using Labels)](#9-deploying-selective-changes-using-labels)
10. [Multi-Database Support](#10-multi-database-support)
11. [Promotion to Higher Environments](#11-promotion-to-higher-environments)
12. [Rollback Strategy](#12-rollback-strategy)
13. [Best Practices & Rules](#13-best-practices--rules)

---

## 1. Purpose of This Document

This document provides standard operating guidelines for developers and DevOps engineers working with the Liquibase-based Azure DevOps database deployment pipeline.

**What You'll Learn:**
- Repository structure and conventions
- How to add and manage database changes (DDL, DML, Stored Procedures)
- How the baseline inventory approach works
- How to modify existing stored procedures, views, and functions
- How deployments are executed across multiple databases
- How to deploy selectively using labels
- How to promote changes to higher environments
- How rollback works and when to use it

**This guide must be followed** to ensure safe, repeatable, and auditable database deployments.

---

## 2. High-Level Deployment Architecture

```
┌─────────────────┐
│  Git Repository │  ← Source of truth
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Liquibase     │  ← Migration tool
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Azure Pipeline  │  ← Execution engine
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  DEV → QA → PROD                    │  ← Environments
│  (DATABASECHANGELOG tracking)       │
└─────────────────────────────────────┘
```

**Key Components:**
- **Source of Truth:** Git repository (Azure DevOps)
- **Migration Tool:** Liquibase 5.0+
- **Execution:** Azure DevOps deployment pipelines
- **State Tracking:** `DATABASECHANGELOG` and `DATABASECHANGELOGLOCK` tables
- **Environments:** DEV → QA → PROD

**Liquibase Guarantees:**
- Each changeset is applied exactly once
- Changes are ordered and tracked
- Rollback is possible if defined
- Audit trail of all changes

---

## 3. Repository Structure

```
TDG HRMS DB/
├── HRMS-DATABASE/
│   ├── HRMS/
│   │   ├── changelog/
│   │   │   ├── db.changelog-master.xml       # Master changelog
│   │   │   ├── baseline-inventory.xml        # Baseline (7,354 changesets)
│   │   │   ├── BASELINE-README.md            # Baseline instructions
│   │   │   └── releases/
│   │   │       ├── v2.0/
│   │   │       │   └── changelog-v2.0.xml    # Release-specific changes
│   │   │       └── v2.1/
│   │   ├── DDL/                              # Existing DDL files
│   │   ├── DML/                              # Existing DML files
│   │   ├── STOREPROCEDURE/                   # Existing stored procedures
│   │   ├── VIEWS/                            # Existing views
│   │   ├── FUNCTIONS/                        # Existing functions
│   │   └── liquibase.properties              # Database connection config
│   ├── HRM-TIMEPORT/                         # Other databases...
│   ├── HRMS-CRBBOOKING/
│   ├── HRMS-RESOURCEALLOCATION/
│   ├── HRMS-SURVEY/
│   ├── HRMS-TRAINING/
│   └── HRMS_TRAVELNEXPENSE/
├── scripts/
│   ├── generate-baseline-changelog.py        # Baseline generator
│   └── generate-baseline-inventory.py        # Inventory generator
├── deployment-database.yml                   # Azure pipeline
└── KB.md                                     # Complete migration guide
```

### 3.1 Folder Responsibilities

| Folder | Purpose | runOnChange |
|--------|---------|-------------|
| `DDL/` | Tables, indexes, constraints, schema changes | ❌ No (one-time) |
| `DML/` | Seed/reference data (idempotent where possible) | ❌ No (one-time) |
| `STOREPROCEDURE/` | Stored procedures | ✅ Yes (modifiable) |
| `VIEWS/` | Database views | ✅ Yes (modifiable) |
| `FUNCTIONS/` | User-defined functions | ✅ Yes (modifiable) |
| `changelog/` | Liquibase XML changelogs (deployment control) | N/A |

> **Important:** Liquibase never deploys directly from DDL/DML folders. Only what is referenced in the changelog XML is deployed.

---

## 4. Baseline Approach for Existing Databases

### 4.1 The Challenge

The HRMS database has **7,355 SQL files** that were already applied to production before Liquibase was introduced. We need to:
1. Mark these as "already executed" without re-running them
2. Support future modifications to existing objects (stored procedures, views, functions)

### 4.2 The Solution: Two-Part Baseline

**Part 1: Baseline Marker**
```xml
<changeSet id="baseline-existing-db-2026-01-09" author="migration-team">
    <tagDatabase tag="baseline-v1.0"/>
    <comment>Baseline marker for all changes before 2026-01-09</comment>
</changeSet>
```

**Part 2: Baseline Inventory**
- 7,354 individual changesets (one per SQL file)
- Stored procedures, views, functions have `runOnChange="true"`
- DDL, DML, tables are one-time only

### 4.3 Deployment to Existing Databases

```bash
# Step 1: Sync ONLY to baseline tag
liquibase changelog-sync-to-tag baseline-v1.0

# Result:
# - Baseline marker: EXECUTED
# - Inventory changesets: PENDING (this is correct!)
```

**Why keep inventory pending?**
- Allows Liquibase to track modifications to existing files
- When you modify a stored procedure, Liquibase detects the change and re-runs it

### 4.4 Deployment to New Databases

For fresh installations, skip the baseline entirely:
```bash
liquibase update --label-filter="v2.0"
```

---

## 5. Liquibase Changelog Design

### 5.1 Master Changelog (`db.changelog-master.xml`)

This file is the entry point for Liquibase.

**Structure:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<databaseChangeLog
    xmlns="http://www.liquibase.org/xml/ns/dbchangelog"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://www.liquibase.org/xml/ns/dbchangelog
    http://www.liquibase.org/xml/ns/dbchangelog/dbchangelog-latest.xsd">

    <!-- Baseline marker -->
    <changeSet id="baseline-existing-db-2026-01-09" author="migration-team">
        <tagDatabase tag="baseline-v1.0"/>
    </changeSet>

    <!-- Baseline inventory (all existing files) -->
    <include file="baseline-inventory.xml" relativeToChangelogFile="true"/>

    <!-- Future releases -->
    <include file="releases/v2.0/changelog-v2.0.xml" relativeToChangelogFile="true"/>
    <include file="releases/v2.1/changelog-v2.1.xml" relativeToChangelogFile="true"/>

</databaseChangeLog>
```

### 5.2 Changeset Rules (MANDATORY)

Each changeset **must**:
1. Have a **unique ID** (never reuse)
2. Have a **stable author name**
3. **Never be modified** after deployment
4. Contain a **rollback** (where feasible)
5. Use **labels** for release tracking

**Example:**
```xml
<changeSet id="ddl-v2.0-001-add-employee-email" author="hiep.pham" labels="v2.0">
    <comment>Add Email column to Employee table</comment>
    <sqlFile path="../DDL/v2.0/001_AddEmployeeEmail.sql"
             relativeToChangelogFile="true"
             splitStatements="true"
             endDelimiter="GO"/>
    <rollback>
        ALTER TABLE dbo.T_Employee DROP COLUMN Email;
    </rollback>
</changeSet>
```

### 5.3 runOnChange for Modifiable Objects

For stored procedures, views, and functions:
```xml
<changeSet id="sp-v2.0-001-get-employee" author="hiep.pham" runOnChange="true" labels="v2.0">
    <comment>Get employee details with email</comment>
    <sqlFile path="../STOREPROCEDURE/v2.0/sp_GetEmployeeDetails.sql"/>
</changeSet>
```

**How runOnChange works:**
- Liquibase calculates file checksum
- If file changed → re-runs the SQL
- If file unchanged → skips it

---

## 6. How Developers Add Database Changes

### Step 1: Create SQL File

Add SQL to the appropriate folder with naming convention: `NNN_Description.sql`

**Examples:**
```
DDL/v2.0/001_AddInventoryTags.sql
DML/v2.0/002_InsertDefaultSettings.sql
STOREPROCEDURE/v2.0/sp_UpsertTaskAssignments.sql
```

### Step 2: Create Release Changelog

Create `changelog/releases/v2.0/changelog-v2.0.xml`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<databaseChangeLog
    xmlns="http://www.liquibase.org/xml/ns/dbchangelog"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://www.liquibase.org/xml/ns/dbchangelog
    http://www.liquibase.org/xml/ns/dbchangelog/dbchangelog-latest.xsd">

    <!-- DDL Changes -->
    <changeSet id="ddl-v2.0-001" author="alice" labels="v2.0,inventory">
        <sqlFile path="../../DDL/v2.0/001_AddInventoryTags.sql"/>
        <rollback>
            DROP TABLE InventoryTags;
        </rollback>
    </changeSet>

    <!-- Stored Procedure (runOnChange) -->
    <changeSet id="sp-v2.0-001" author="bob" runOnChange="true" labels="v2.0">
        <sqlFile path="../../STOREPROCEDURE/v2.0/sp_UpsertTaskAssignments.sql"/>
    </changeSet>

</databaseChangeLog>
```

### Step 3: Include in Master Changelog

Update `db.changelog-master.xml`:
```xml
<include file="releases/v2.0/changelog-v2.0.xml" relativeToChangelogFile="true"/>
```

### Step 4: Use Labels (Strongly Recommended)

Labels allow selective deployments:
- `v2.0` - Release version
- `hotfix` - Urgent fixes
- `inventory` - Feature-specific
- Multiple labels: `labels="v2.0,hotfix,inventory"`

### Step 5: Commit & Push

1. Commit both SQL and changelog XML
2. Create PR to main branch
3. Ensure pipeline validation passes
4. Merge after approval

---

## 7. Modifying Existing Database Objects

### 7.1 For Objects in Baseline Inventory

**Stored Procedures, Views, Functions** (with `runOnChange="true"`):

```bash
# 1. Edit the existing SQL file
vim STOREPROCEDURE/sp_GetEmployeeDetails.sql

# Make your changes to the stored procedure
# The file is already in baseline-inventory.xml with runOnChange=true

# 2. Commit and deploy
git add STOREPROCEDURE/sp_GetEmployeeDetails.sql
git commit -m "Update sp_GetEmployeeDetails to include email"
git push

# 3. Pipeline deploys automatically
# Liquibase will:
# - Find the changeset in baseline-inventory.xml
# - See runOnChange=true
# - Detect file changed (checksum different)
# - Re-run the modified stored procedure
```

**No need to create a new changeset!** Just edit the file and deploy.

### 7.2 For New Objects (Post-Baseline)

Create new changesets in release changelogs with `runOnChange="true"`:

```xml
<changeSet id="sp-v2.0-new-proc" author="hiep.pham" runOnChange="true" labels="v2.0">
    <sqlFile path="../../STOREPROCEDURE/v2.0/sp_NewProcedure.sql"/>
</changeSet>
```

---

## 8. Azure Pipeline – How Deployment Works

### 8.1 Pipeline Parameters

```yaml
parameters:
  - name: databaseName          # Select database
    values: [HRMS, HRM-TIMEPORT, ...]

  - name: liquibaseLabel        # Deploy specific label
    default: 'NONE'

  - name: deployAll             # Deploy all pending
    default: false

  - name: baselineMode          # First-time sync only
    default: false
```

### 8.2 Pipeline Stages

**Stage 1: Validate Parameters**
- Checks database selection
- Validates label/deployAll configuration
- Handles baseline mode

**Stage 2: Apply Changes**
1. Setup Java & Liquibase
2. Create `liquibase.properties` for selected database
3. Validate changelog
4. **If baseline mode:** Run `changelog-sync-to-tag baseline-v1.0`
5. **If normal mode:** Run `liquibase update` (with optional label filter)
6. Tag database with timestamp
7. Display history

### 8.3 Change Detection

Pipeline detects changes in:
```yaml
paths:
  - HRMS-DATABASE/*/DDL/*.sql
  - HRMS-DATABASE/*/DML/*.sql
  - HRMS-DATABASE/*/STOREPROCEDURE/*.sql
  - HRMS-DATABASE/*/changelog/*.xml
```

---

## 9. Deploying Selective Changes (Using Labels)

### 9.1 Pipeline Parameter

Select label in pipeline UI or use default `NONE` with `deployAll=true`

### 9.2 Example Use Cases

| Scenario | Label | Command |
|----------|-------|---------|
| Deploy only v2.0 changes | `v2.0` | `liquibase update --label-filter="v2.0"` |
| Deploy hotfix | `hotfix` | `liquibase update --label-filter="hotfix"` |
| Deploy inventory feature | `inventory` | `liquibase update --label-filter="inventory"` |
| Deploy everything | `NONE` + `deployAll=true` | `liquibase update` |

### 9.3 How Pipeline Uses Labels

```powershell
$cmd = "liquibase update --changelog-file=changelog/db.changelog-master.xml"

if ($label -ne "NONE") {
    $cmd += " --label-filter='$label'"
}

Invoke-Expression $cmd
```

> **Important:** Only changesets with that label **and not yet executed** will run.

---

## 10. Multi-Database Support

### 10.1 Supported Databases

1. HRMS (7,355 files)
2. HRM-TIMEPORT
3. HRMS-CRBBOOKING
4. HRMS-RESOURCEALLOCATION
5. HRMS-SURVEY
6. HRMS-TRAINING
7. HRMS_TRAVELNEXPENSE

### 10.2 Database Selection

Select database from dropdown in pipeline UI:
- Each database has its own `changelog/` directory
- Each database has its own `liquibase.properties`
- Each database tracks changes independently

### 10.3 Database Connection Variables

Expected environment variables:
```
DB_SERVER_DEV
DB_NAME_HRMS_DEV
DB_NAME_HRM_TIMEPORT_DEV
DB_NAME_HRMS_CRBBOOKING_DEV
...
DB_USERNAME_DEV
DB_PASSWORD_DEV
```

Pipeline automatically maps database name to connection string.

---

## 11. Promotion to Higher Environments

### 11.1 Key Rule

**The same changelog and changesets are unchanged across environments.**

❌ **NO:**
- Rewriting SQL
- Reordering changesets
- Changing IDs
- Modifying executed changesets

✅ **YES:**
- New environment-specific pipelines
- Same changelog files
- New labels if needed

### 11.2 Promotion Flow

```
DEV → QA → PROD
```

Each environment:
- Has its own DB credentials
- Has its own Liquibase tracking tables (`DATABASECHANGELOG`)
- Runs the same changesets

### 11.3 Tagging Strategy

After each successful deployment:
```
HRMS_DEV_20260109_123456
HRMS_QA_20260110_234567
HRMS_PROD_20260115_345678
```

Tags are **critical for rollback**.

### 11.4 Promotion Checklist

- [ ] Deploy to DEV
- [ ] Test in DEV
- [ ] Tag DEV deployment
- [ ] Deploy to QA (same changesets)
- [ ] Test in QA
- [ ] Tag QA deployment
- [ ] Generate rollback SQL for PROD
- [ ] Deploy to PROD
- [ ] Tag PROD deployment
- [ ] Verify PROD

---

## 12. Rollback Strategy

### 12.1 When to Rollback

- Deployment failure
- Data corruption
- Application incompatibility
- Critical bug discovered

### 12.2 Rollback Prerequisites

1. Changeset must define `<rollback>`
2. Target tag must exist
3. Rollback SQL must be tested

### 12.3 Rollback Commands

**Preview rollback:**
```bash
liquibase rollback-sql HRMS_PROD_20260115_345678 > rollback-preview.sql
# Review rollback-preview.sql carefully
```

**Execute rollback:**
```bash
liquibase rollback HRMS_PROD_20260115_345678
```

**Verify:**
```bash
liquibase history
```

### 12.4 Rollback for runOnChange Objects

For stored procedures/views/functions with `runOnChange="true"`:
1. Revert the SQL file to previous version in Git
2. Redeploy → Liquibase detects change and re-runs old version

### 12.5 Example Rollback

```xml
<changeSet id="ddl-v2.0-001" author="alice" labels="v2.0">
    <sqlFile path="../DDL/v2.0/001_AddEmployeeEmail.sql"/>
    <rollback>
        ALTER TABLE dbo.T_Employee DROP COLUMN Email;
    </rollback>
</changeSet>
```

---

## 13. Best Practices & Rules

### 13.1 Always Do

✅ **Use labels** for all changesets
✅ **Write rollback SQL** for DDL changes
✅ **Keep changesets small** and focused
✅ **Review SQL carefully** before committing
✅ **Test in DEV first** before promoting
✅ **Use runOnChange** for stored procedures, views, functions
✅ **Tag after successful deployments**
✅ **Document breaking changes** in comments
✅ **Use meaningful changeset IDs** (e.g., `ddl-v2.0-001-add-email`)
✅ **Commit SQL and changelog together**

### 13.2 Never Do

❌ **Edit executed changesets** (create new ones instead)
❌ **Deploy directly to PROD** (always DEV → QA → PROD)
❌ **Skip changelog validation**
❌ **Reuse changeset IDs**
❌ **Remove applied changesets**
❌ **Modify baseline changesets** after sync
❌ **Run `changelog-sync` on existing databases** (use `changelog-sync-to-tag` for baseline)
❌ **Deploy without labels** (except for deployAll scenarios)

### 13.3 Changeset ID Naming Convention

Format: `{type}-{version}-{sequence}-{description}`

**Examples:**
- `ddl-v2.0-001-add-employee-email`
- `dml-v2.0-002-insert-default-settings`
- `sp-v2.0-003-upsert-task-assignments`
- `hotfix-2026-01-001-fix-inventory-bug`

### 13.4 SQL File Naming Convention

Format: `NNN_Description.sql`

**Examples:**
- `001_AddEmployeeEmail.sql`
- `002_InsertDefaultSettings.sql`
- `sp_UpsertTaskAssignments.sql`

### 13.5 Baseline Mode Rules

> **CRITICAL:** Baseline mode should only be used ONCE per database for initial setup.

**When to use:**
- ✅ First-time Liquibase deployment to existing database
- ✅ Database already has all baseline SQL files applied

**When NOT to use:**
- ❌ After initial baseline sync
- ❌ For new databases
- ❌ For regular deployments

**Command:**
```bash
# Correct for existing databases
liquibase changelog-sync-to-tag baseline-v1.0

# Wrong (would mark ALL changesets as executed)
liquibase changelog-sync
```

### 13.6 Testing Checklist

Before deploying to production:
- [ ] Tested in DEV
- [ ] Tested in QA
- [ ] Rollback SQL generated and reviewed
- [ ] Breaking changes documented
- [ ] Application compatibility verified
- [ ] Performance impact assessed
- [ ] Backup taken
- [ ] Deployment window scheduled

---

## Quick Reference

### Common Commands

```bash
# Check pending changes
liquibase status

# Preview SQL without executing
liquibase update-sql

# Deploy all pending changes
liquibase update

# Deploy specific label
liquibase update --label-filter="v2.0"

# Sync baseline (first time only)
liquibase changelog-sync-to-tag baseline-v1.0

# View deployment history
liquibase history

# Tag current state
liquibase tag HRMS_PROD_20260109_123456

# Preview rollback
liquibase rollback-sql HRMS_PROD_20260109_123456

# Execute rollback
liquibase rollback HRMS_PROD_20260109_123456

# Validate changelog
liquibase validate
```

### File Locations

- **Master Changelog:** `HRMS-DATABASE/{database}/changelog/db.changelog-master.xml`
- **Baseline Inventory:** `HRMS-DATABASE/{database}/changelog/baseline-inventory.xml`
- **Release Changelogs:** `HRMS-DATABASE/{database}/changelog/releases/v2.0/changelog-v2.0.xml`
- **Liquibase Config:** `HRMS-DATABASE/{database}/liquibase.properties`
- **Pipeline:** `deployment-database.yml`

### Support

For questions or issues:
- Refer to [`KB.md`](KB.md) for complete migration guide
- Check [`BASELINE-README.md`](HRMS-DATABASE/HRMS/changelog/BASELINE-README.md) for baseline instructions
- Review [`scripts/README.md`](scripts/README.md) for automation tools
- Contact DevOps team for pipeline issues

---

**Document Version:** 2.0
**Last Updated:** 2026-01-09
**Maintained By:** DevOps Team
