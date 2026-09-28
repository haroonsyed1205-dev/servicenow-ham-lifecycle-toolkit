# ServiceNow HAM Lifecycle Toolkit

> Portfolio project: original code with synthetic data. See [DISCLAIMER.md](DISCLAIMER.md).

Hardware Asset Management building blocks for ServiceNow: lifecycle
enforcement from procurement to disposal, asset-to-CI synchronisation,
validation for legacy asset data migration, and software license renewal
reminders.

## What's inside
| Path | ServiceNow artifact | What it does |
|---|---|---|
| `src/script_includes/AssetLifecycle.js` | Script Include | Allowed state transitions and required fields per transition |
| `src/script_includes/AssetCiSync.js` | Script Include | Diff asset vs CI; asset owns ownership/location/status, Discovery owns serials |
| `src/script_includes/LegacyAssetImportValidator.js` | Script Include | Normalise serials, map model aliases and statuses, parse dates, catch duplicates |
| `src/script_includes/LicenseRenewalScheduler.js` | Script Include | 90/60/30/14-day reminders, escalation and lapse detection |
| `src/business_rules/alm_hardware_lifecycle_guard.js` | Business Rule (before update) | Blocks invalid lifecycle moves |
| `src/business_rules/alm_hardware_sync_ci.js` | Business Rule (async after) | Keeps the CI in step with the asset |
| `src/transform_scripts/legacy_asset_onBefore.js` | Transform Map script | Validates each import row, skips bad rows with a reason |
| `src/scheduled_jobs/license_renewal_reminders.js` | Scheduled Job | Fires reminder / escalation events |
| `sample_data/` | — | Synthetic legacy CSV with deliberate problems; sample entitlements |
| `docs/design.md` | — | Lifecycle diagram, field ownership, migration approach |

## Dry run on the sample legacy file
```
7 rows: 3 valid, 4 rejected
row 2  "LAT 5440" mapped to Dell Latitude 5440, date 3/14/2023 -> 2023-03-14, "$1,249.00" -> 1249
row 3  serial "5cg-1234-abd" normalized to 5CG1234ABD
row 4  rejected: duplicate serial 5CG1234ABC (first seen on row 2)
row 5  warning: in use with no user -> imported as In stock
row 6  rejected: serial blank
row 7  rejected: warranty expires before purchase date
row 8  rejected: bad date "31/12/2022", bad cost "abc"
```

## Run the tests
```
node --test
```

## Status
Logic is unit tested; platform scripts are being validated on a Personal
Developer Instance.
