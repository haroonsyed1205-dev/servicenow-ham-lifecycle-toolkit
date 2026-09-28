/**
 * Business Rule: Sync asset to CI
 * Table: alm_hardware   When: after (async)   Insert/Update: true
 * Condition: current.ci != '' && (current.assigned_to.changes() || current.location.changes() ||
 *            current.install_status.changes() || current.cost_center.changes() || current.department.changes())
 */
(function executeRule(current, previous) {
    var ci = new GlideRecord('cmdb_ci_hardware');
    if (!ci.get(current.getValue('ci'))) return;

    var assetObj = {}, ciObj = {};
    ['assigned_to', 'location', 'department', 'cost_center', 'company', 'serial_number', 'install_status']
        .forEach(function (f) { assetObj[f] = current.getValue(f); });
    ['assigned_to', 'location', 'department', 'cost_center', 'company', 'serial_number', 'install_status', 'operational_status']
        .forEach(function (f) { ciObj[f] = ci.getValue(f); });

    var result = new AssetCiSync().diff(assetObj, ciObj);
    if (result.inSync) return;

    Object.keys(result.updates).forEach(function (f) { ci.setValue(f, result.updates[f]); });
    ci.update();
    result.drift.filter(function (d) { return d.message; })
        .forEach(function (d) { gs.warn('[HAM sync] ' + current.getDisplayValue() + ': ' + d.message); });
})(current, previous);
