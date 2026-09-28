/**
 * Transform Map onBefore script: Legacy hardware -> alm_hardware
 * Source: u_legacy_hardware_import (Import Set from the legacy spreadsheet)
 * Coalesce on serial_number.
 */
(function runTransformScript(source, map, log, target /*undefined onStart*/) {

    // One validator per transform run so duplicate detection spans the file
    if (typeof LEGACY_VALIDATOR === 'undefined') {
        LEGACY_VALIDATOR = new LegacyAssetImportValidator({
            modelAliases: JSON.parse(gs.getProperty('x_ham.legacy_model_aliases', '{}')),
            knownModels: []
        });
    }
    var r = LEGACY_VALIDATOR.validateRow({
        serial: source.getValue('u_serial'),
        model: source.getValue('u_model'),
        status: source.getValue('u_status'),
        assigned_to: source.getValue('u_assigned_to'),
        purchase_date: source.getValue('u_purchase_date'),
        warranty_expiration: source.getValue('u_warranty_end'),
        cost: source.getValue('u_cost')
    }, source.getValue('sys_import_row'));

    r.warnings.forEach(function (w) { log.warn('Row ' + r.row + ': ' + w); });
    if (!r.valid) {
        ignore = true;
        error_message = r.errors.join('; ');
        return;
    }
    target.serial_number = r.record.serial_number;
    target.install_status = r.record.install_status;
    target.purchase_date = r.record.purchase_date;
    target.warranty_expiration = r.record.warranty_expiration;
    if (r.record.cost !== '') target.cost = r.record.cost;

})(source, map, log, target);
