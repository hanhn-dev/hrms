# HRMS-TranslationService Database - Liquibase Baseline

**Baseline Date**: 2026-05-28
**Total SQL Files**: 4 files
**Status**: All files already applied to production

## What is This Baseline?

This baseline represents the state of the HRMS-TranslationService database as of **2026-05-28**. All 4 SQL files in the following directories have already been applied to production:

| Directory | File Count |
|-----------|------------|
| STOREPROCEDURE | 1 |
| TABLES | 3 |
| **TOTAL** | **4** |

## Deployment Instructions

### For EXISTING Databases (Production, UAT, Staging)

> [!CAUTION]
> **CRITICAL**: Do NOT run `liquibase update` on existing databases! This would attempt to re-run all baseline changes.

> [!WARNING]
> **IMPORTANT**: Use `changelog-sync` to mark all existing changesets as executed. This preserves runOnChange functionality for future modifications.

**Step 1: Verify Connection**
```bash
cd HRMS-DATABASE/HRMS-TranslationService
liquibase status
```

**Step 2: Sync All Baseline Changesets**
```bash
# This marks ALL changesets as executed WITHOUT running any SQL
# Checksums are recorded for runOnChange detection
liquibase changelog-sync
```

**Step 3: Verify Sync**
```bash
liquibase status
# Should show no pending changesets (all marked as executed)

liquibase history
# Should show all changesets marked as EXECUTED
```

**Step 4: Check Database Tables**
```sql
-- Verify DATABASECHANGELOG table was created
SELECT * FROM DATABASECHANGELOG;

-- Should see one row:
-- ID: baseline-existing-db-2026-05-28
-- TAG: baseline-v1.0
```

### For NEW/Fresh Databases

> [!NOTE]
> For fresh database installations, skip the baseline entirely and start from the next release (v2.0+).

```bash
# Deploy only changes after baseline
liquibase update --label-filter="v2.0"
```

## Future Development Workflow

After baseline sync, all new database changes should:

1. **Create SQL files** in appropriate directories
2. **Add changesets** to release-specific changelogs in `changelog/releases/`
3. **Include in master** changelog via `<include>` tags
4. **Use labels** for version control (e.g., `labels="v2.0"`)

**Example:**
```xml
<!-- In db.changelog-master.xml -->
<include file="releases/v2.0/changelog-v2.0.xml"
         relativeToChangelogFile="true"/>
```

## Important Warnings

> [!WARNING]
> **Never modify the baseline changeset**. Once synced to any environment, it is immutable.

> [!WARNING]
> **Never add old SQL files to new changesets**. The baseline already covers all pre-existing files.

> [!IMPORTANT]
> **Always test on lower environments first**. Run `changelog-sync` on DEV/UAT before production.

## Rollback Strategy

The baseline changeset **cannot be rolled back** because it represents the starting point. Rollback is only applicable to changes made after the baseline.

## File Reference

- `db.changelog-master.xml` - Master changelog with baseline marker
- `liquibase.properties` - Database connection configuration

## Questions?

Refer to the main KB.md for detailed Liquibase migration guide and best practices.
