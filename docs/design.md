# Design notes

## Lifecycle
```
On order --receive--> In stock --deploy--> In use --repair--> In maintenance
                         ^  |                 |  \                |
                         |  +--> Retired <----+   +--> Missing ---+
                         +-------- return --------------+
```
| Transition | Required fields |
|---|---|
| On order -> In stock | serial_number, stockroom, po_number |
| In stock -> In use | assigned_to, location |
| In use -> In maintenance | maintenance_vendor |
| any -> Retired | retirement_reason, substatus (disposed/sold/donated/vendor_credit); disposal_certificate if disposed |
| -> In stock / Retired | assigned_to is cleared |

Retired is terminal: a retired asset that turns up again is a data-quality
problem to investigate, not a normal transition.

## Asset vs CI ownership of fields
| Field | Source of truth | Behaviour |
|---|---|---|
| assigned_to, location, department, cost_center, company | Asset | Pushed to CI |
| install_status / operational_status | Asset | Mapped and pushed |
| serial_number | Discovery (CI) | Mismatch is logged for review, never overwritten |

## Legacy data migration
1. Load the spreadsheet into an Import Set table.
2. Run `LegacyAssetImportValidator.validateAll()` as a background script dry
   run and fix the source file until the error count is acceptable.
3. Run the Transform Map; rows that still fail are skipped with the reason in
   the import log, so nothing half-valid reaches `alm_hardware`.

## License renewals
Reminders at 90, 60, 30 and 14 days, then daily until renewal is started;
at 14 days or less the owner's manager is also notified. Lapsed entitlements
are reported every day until marked as started.
