/**
 * Business Rule: Enforce hardware lifecycle
 * Table: alm_hardware   When: before   Update: true
 * Condition: current.install_status.changes()
 */
(function executeRule(current, previous) {
    var asset = {};
    ['serial_number', 'stockroom', 'po_number', 'assigned_to', 'location', 'substatus',
     'retirement_reason', 'maintenance_vendor', 'disposal_certificate'].forEach(function (f) {
        if (current.isValidField(f)) asset[f] = current.getValue(f);
    });
    var r = new AssetLifecycle().validate(previous.getValue('install_status'),
        current.getValue('install_status'), asset);
    if (!r.allowed) {
        gs.addErrorMessage(r.message);
        current.setAbortAction(true);
        return;
    }
    r.clear.forEach(function (f) { if (current.isValidField(f)) current.setValue(f, ''); });
})(current, previous);
