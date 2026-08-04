# Liquibase Baseline Scripts

Automation scripts to generate baseline Liquibase changelogs for databases with existing SQL files that have already been applied to production.

## Overview

Two scripts work together to create the complete baseline:

1. **`generate-baseline-changelog.py`** - Creates master changelog structure (baseline marker + inventory reference), properties, and README
2. **`generate-baseline-inventory.py`** - Creates detailed inventory file with all SQL files as individual changesets

> [!IMPORTANT]
> **Both scripts must be run** to create a complete baseline. Script #1 creates the master changelog that **references** the inventory file, and script #2 creates the actual inventory file with all SQL changesets.

**Workflow**: Run script #1 first to create the structure, then run script #2 to generate the inventory file that script #1 references.

## Complete Workflow

To set up Liquibase baseline for a database:

1. **Generate baseline structure** (master changelog, properties, README)
   ```bash
   python scripts/generate-baseline-changelog.py --database HRMS
   ```

2. **Generate baseline inventory** (all SQL files as changesets)
   ```bash
   python scripts/generate-baseline-inventory.py --database HRMS
   ```

3. **Deploy to existing databases**
   ```bash
   cd HRMS-DATABASE/HRMS
   liquibase changelog-sync-to-tag baseline-v1.0
   ```

This creates a complete baseline where:
- The baseline marker is synced (marked as executed)
- The inventory changesets remain "pending" (enables `runOnChange` functionality)
- Future modifications to existing files will be detected and re-run automatically


## Prerequisites

- Python 3.7 or higher
- Access to the TDG HRMS DB repository

---

## Script 1: generate-baseline-changelog.py

Generates the baseline structure (master changelog, properties, README).

### Usage

#### Generate Baseline for Single Database

```bash
# Generate baseline for HRMS database
python scripts/generate-baseline-changelog.py --database HRMS

# Generate for another database
python scripts/generate-baseline-changelog.py --database HRM-TIMEPORT
```

#### Generate Baselines for All Databases

```bash
# Generate for all 7 databases
python scripts/generate-baseline-changelog.py --all
```

#### Dry Run (Preview Only)

```bash
# Preview what would be created without actually creating files
python scripts/generate-baseline-changelog.py --database HRMS --dry-run
python scripts/generate-baseline-changelog.py --all --dry-run
```

#### Custom Baseline Date

```bash
# Use a specific baseline date
python scripts/generate-baseline-changelog.py --all --date 2026-01-15
```

---

## Script 2: generate-baseline-inventory.py

Generates the baseline inventory with all existing SQL files as individual changesets.

### Usage

#### Default Configuration

```bash
# Default: runOnChange for STOREPROCEDURE, VIEWS, FUNCTIONS
python scripts/generate-baseline-inventory.py --database HRMS
```

#### Custom runOnChange Directories

```bash
# Specify which directories should use runOnChange
python scripts/generate-baseline-inventory.py --database HRMS --run-on-change DDL,DML,FUNCTIONS

# Only stored procedures and views
python scripts/generate-baseline-inventory.py --database HRMS --run-on-change STOREPROCEDURE,VIEWS

# No runOnChange (all one-time changes)
python scripts/generate-baseline-inventory.py --database HRMS --run-on-change ""
```

#### Custom Author

```bash
# Set custom author for changesets
python scripts/generate-baseline-inventory.py --database HRM-TIMEPORT --author hiep.pham --run-on-change STOREPROCEDURE,VIEWS,FUNCTIONS
```

#### Combined Options

```bash
# Custom author + custom runOnChange + custom date
python scripts/generate-baseline-inventory.py \
  --database HRMS \
  --author hiep.pham \
  --run-on-change STOREPROCEDURE,VIEWS,FUNCTIONS \
  --date 2026-01-09
```

### Command-Line Options

| Option | Description | Default | Example |
|--------|-------------|---------|---------|
| `--database` | Database name (required) | - | `--database HRMS` |
| `--author` | Author name for changesets | `baseline` | `--author hiep.pham` |
| `--run-on-change` | Comma-separated directories for runOnChange | `STOREPROCEDURE,VIEWS,FUNCTIONS` | `--run-on-change DDL,DML` |
| `--date` | Baseline date (YYYY-MM-DD) | Today | `--date 2026-01-15` |
| `--base-path` | Repository base path | Current directory | `--base-path /path/to/repo` |

### Output Example

```
======================================================================
Generating Baseline Inventory for HRMS
======================================================================
Author: hiep.pham
Date: 2026-01-09
runOnChange enabled for: FUNCTIONS, STOREPROCEDURE, VIEWS
======================================================================

✅ Created: /path/to/HRMS-DATABASE/HRMS/changelog/baseline-inventory.xml
   Total changesets: 7354
   - With runOnChange: 4521
   - One-time changes: 2833
```

---

## Supported Databases

The script supports all 7 databases in the repository:

1. `HRMS` (7,355 SQL files)
2. `HRM-TIMEPORT`
3. `HRMS-CRBBOOKING`
4. `HRMS-RESOURCEALLOCATION`
5. `HRMS-SURVEY`
6. `HRMS-TRAINING`
7. `HRMS_TRAVELNEXPENSE`

## What Gets Created

### Script 1 (generate-baseline-changelog.py) creates:

```
HRMS-DATABASE/{database_name}/
├── changelog/
│   ├── db.changelog-master.xml      # Master changelog with baseline marker + inventory include
│   ├── BASELINE-README.md           # Deployment instructions
│   └── releases/                    # Directory for future releases
│       └── .gitkeep
└── liquibase.properties             # Database connection config template
```

### Script 2 (generate-baseline-inventory.py) creates:

```
HRMS-DATABASE/{database_name}/
└── changelog/
    └── baseline-inventory.xml       # All SQL files as individual changesets (referenced by master)
```

## Generated Files

### db.changelog-master.xml

Master Liquibase changelog containing:
- Baseline marker changeset (does NOT execute SQL)
- Tag: `baseline-v1.0`
- File count summary
- **Include reference to baseline-inventory.xml**
- Placeholder for future releases

### baseline-inventory.xml

Detailed inventory file containing:
- All SQL files as individual changesets
- `runOnChange=true` for stored procedures, views, and functions (configurable)
- Enables future modifications to be detected and re-run
- Generated by `generate-baseline-inventory.py`

### BASELINE-README.md

Comprehensive documentation including:
- File count breakdown by directory
- Deployment instructions for existing databases
- Deployment instructions for new databases
- Warnings and best practices

### liquibase.properties

Configuration template with:
- SQL Server connection settings (placeholders)
- Changelog file path
- Default schema settings
- Logging configuration

## After Generation

1. **Review Generated Files**
   ```bash
   # Check what was created
   ls -la HRMS-DATABASE/HRMS/changelog/
   cat HRMS-DATABASE/HRMS/changelog/BASELINE-README.md
   ```

2. **Update Connection Settings**
   ```bash
   # Edit liquibase.properties with your database credentials
   vim HRMS-DATABASE/HRMS/liquibase.properties
   ```

3. **Generate Baseline Inventory**
   ```bash
   # Generate the inventory file that master changelog references
   python scripts/generate-baseline-inventory.py --database HRMS
   ```

4. **Deploy to Existing Databases**
   ```bash
   cd HRMS-DATABASE/HRMS

   # Verify connection
   liquibase status

   # Sync ONLY baseline marker (NOT the inventory)
   liquibase changelog-sync-to-tag baseline-v1.0

   # Verify - inventory should show as pending (this is correct!)
   liquibase status
   liquibase history
   ```

## Command-Line Options

| Option | Description | Example |
|--------|-------------|---------|
| `--database` | Specific database to process | `--database HRMS` |
| `--all` | Process all databases | `--all` |
| `--date` | Baseline date (YYYY-MM-DD) | `--date 2026-01-15` |
| `--dry-run` | Preview without creating files | `--dry-run` |
| `--base-path` | Repository base path | `--base-path /path/to/repo` |

## Examples

### Example 1: Complete HRMS Baseline Setup

```bash
# Step 1: Generate baseline structure
python scripts/generate-baseline-changelog.py --database HRMS

# Step 2: Generate baseline inventory
python scripts/generate-baseline-inventory.py --database HRMS

# Step 3: Deploy to existing database
cd HRMS-DATABASE/HRMS
liquibase changelog-sync-to-tag baseline-v1.0
```

Output from Step 1:
```
======================================================================
Liquibase Baseline Changelog Generator
======================================================================
Baseline Date: 2026-01-09
Base Path: /Users/phamh/code/code/TDG HRMS DB
Mode: LIVE
Databases: HRMS
======================================================================

Processing HRMS...
   Found 7,355 SQL files across 9 directories
   ✅ Created baseline changelog for HRMS
      - changelog/db.changelog-master.xml
      - changelog/BASELINE-README.md
      - liquibase.properties

======================================================================
Summary: 1/1 databases processed successfully
======================================================================
```

Output from Step 2:
```
======================================================================
Generating Baseline Inventory for HRMS
======================================================================
Author: baseline
Date: 2026-01-09
runOnChange enabled for: FUNCTIONS, STOREPROCEDURE, VIEWS
======================================================================

✅ Created: /path/to/HRMS-DATABASE/HRMS/changelog/baseline-inventory.xml
   Total changesets: 7354
   - With runOnChange: 4521
   - One-time changes: 2833
```

### Example 2: Dry Run for All Databases

```bash
python scripts/generate-baseline-changelog.py --all --dry-run
```

This previews what would be created for all 7 databases without actually creating any files.

### Example 3: Generate All with Custom Date

```bash
python scripts/generate-baseline-changelog.py --all --date 2026-01-15
```

## Troubleshooting

### No SQL Files Found

If the script reports no SQL files found:
- Verify the database directory exists
- Check that SQL files have `.sql` extension
- Ensure files are in recognized directories (DDL, DML, FUNCTIONS, etc.)

### Permission Errors

Make the script executable:
```bash
chmod +x scripts/generate-baseline-changelog.py
```

### Import Errors

Ensure you're using Python 3.7+:
```bash
python3 --version
python3 scripts/generate-baseline-changelog.py --all
```

## Related Documentation

- [KB.md](file:///Users/phamh/code/code/TDG%20HRMS%20DB/KB.md) - Complete Liquibase migration guide
- [BASELINE-README.md](file:///Users/phamh/code/code/TDG%20HRMS%20DB/HRMS-DATABASE/HRMS/changelog/BASELINE-README.md) - HRMS baseline deployment instructions

## Support

For questions or issues, refer to the main KB.md documentation or contact the migration team.
