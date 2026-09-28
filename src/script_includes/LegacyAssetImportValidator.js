/**
 * LegacyAssetImportValidator
 * Cleans and validates rows from a legacy asset spreadsheet before they are
 * transformed into alm_hardware. Used from the Transform Map onBefore script
 * and runnable as a dry run against the whole file first.
 */
var LegacyAssetImportValidator = Class.create();
LegacyAssetImportValidator.prototype = {
    initialize: function (options) {
        var o = options || {};
        this.modelAliases = o.modelAliases || {};     // "LAT 5440" -> "Dell Latitude 5440"
        this.knownModels = o.knownModels || [];       // display names of cmdb_model records
        this.statusAliases = o.statusAliases || {
            'deployed': '1', 'in use': '1', 'active': '1',
            'spare': '6', 'stock': '6', 'in stock': '6',
            'repair': '3', 'in repair': '3',
            'retired': '7', 'disposed': '7', 'ewaste': '7',
            'lost': '8', 'missing': '8', 'stolen': '8',
            'ordered': '2', 'on order': '2'
        };
        this.seenSerials = {};
    },

    normalizeSerial: function (s) {
        if (!s) return '';
        return String(s).toUpperCase().replace(/[^A-Z0-9]/g, '');
    },

    parseDate: function (s) {
        if (!s) return '';
        var str = String(s).trim();
        var m;
        var y, mo, d;
        if ((m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str))) {
            y = +m[1]; mo = +m[2]; d = +m[3];
        } else if ((m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(str))) {   // US M/D/YYYY
            y = +m[3]; mo = +m[1]; d = +m[2];
        } else {
            return null; // unparseable
        }
        // Reject impossible dates such as 31/12/2022 (D/M/Y) or 2023-02-30
        var check = new Date(Date.UTC(y, mo - 1, d));
        if (check.getUTCFullYear() !== y || check.getUTCMonth() !== mo - 1 || check.getUTCDate() !== d) {
            return null;
        }
        return y + '-' + this._pad(String(mo)) + '-' + this._pad(String(d));
    },

    _pad: function (n) { return (n.length === 1 ? '0' : '') + n; },

    validateRow: function (row, rowNumber) {
        var errors = [];
        var warnings = [];
        var out = {};

        out.serial_number = this.normalizeSerial(row.serial);
        if (!out.serial_number) {
            errors.push('Serial number is blank');
        } else if (this.seenSerials[out.serial_number]) {
            errors.push('Duplicate serial ' + out.serial_number + ' (first seen on row ' + this.seenSerials[out.serial_number] + ')');
        } else {
            this.seenSerials[out.serial_number] = rowNumber;
            if (out.serial_number !== String(row.serial).trim().toUpperCase()) {
                warnings.push('Serial normalized from "' + row.serial + '"');
            }
        }

        var model = (row.model || '').trim();
        if (this.modelAliases[model.toUpperCase()]) model = this.modelAliases[model.toUpperCase()];
        if (!model) errors.push('Model is blank');
        else if (this.knownModels.length && this.knownModels.indexOf(model) === -1) {
            errors.push('Unknown model "' + model + '" - add a model alias or create the model first');
        }
        out.model = model;

        var st = this.statusAliases[(row.status || '').trim().toLowerCase()];
        if (!st) errors.push('Unknown status "' + row.status + '"');
        out.install_status = st || '';

        ['purchase_date', 'warranty_expiration'].forEach(function (f) {
            var d = this.parseDate(row[f]);
            if (d === null) errors.push('Bad date in ' + f + ': "' + row[f] + '"');
            out[f] = d || '';
        }, this);

        if (out.purchase_date && out.warranty_expiration && out.warranty_expiration < out.purchase_date) {
            errors.push('Warranty expires before purchase date');
        }
        if (st === '1' && !(row.assigned_to || '').trim()) {
            warnings.push('In use but no assigned user - will import as In stock');
            out.install_status = '6';
        }
        out.assigned_to = (row.assigned_to || '').trim();
        out.cost = row.cost ? parseFloat(String(row.cost).replace(/[$,]/g, '')) : '';
        if (row.cost && isNaN(out.cost)) errors.push('Bad cost "' + row.cost + '"');

        return { row: rowNumber, valid: errors.length === 0, errors: errors, warnings: warnings, record: out };
    },

    validateAll: function (rows) {
        this.seenSerials = {};
        var results = rows.map(function (r, i) { return this.validateRow(r, i + 2); }, this); // +2: header row
        return {
            total: results.length,
            valid: results.filter(function (r) { return r.valid; }).length,
            invalid: results.filter(function (r) { return !r.valid; }).length,
            results: results
        };
    },

    type: 'LegacyAssetImportValidator'
};
