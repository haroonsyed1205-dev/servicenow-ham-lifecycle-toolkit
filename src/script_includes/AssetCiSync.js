/**
 * AssetCiSync
 * Compares a hardware asset with its CI and returns the updates needed on
 * the CI so that asset and CI tell the same story (the asset is the source
 * of truth for ownership/location/financials; Discovery is the source of
 * truth for technical attributes, so those are never overwritten here).
 */
var AssetCiSync = Class.create();
AssetCiSync.prototype = {
    initialize: function (fieldMap) {
        // asset field -> CI field
        this.fieldMap = fieldMap || {
            assigned_to: 'assigned_to',
            location: 'location',
            department: 'department',
            cost_center: 'cost_center',
            company: 'company',
            serial_number: 'serial_number'
        };
        // asset install_status -> CI install_status / operational_status
        this.statusMap = {
            '1': { install_status: '1', operational_status: '1' },   // In use -> Installed / Operational
            '6': { install_status: '6', operational_status: '2' },   // In stock -> In stock / Non-operational
            '3': { install_status: '3', operational_status: '3' },   // In maintenance -> In maintenance / Repair in progress
            '7': { install_status: '7', operational_status: '6' },   // Retired -> Retired / Retired
            '8': { install_status: '100', operational_status: '2' }  // Missing -> Absent / Non-operational
        };
    },

    diff: function (asset, ci) {
        var updates = {};
        var drift = [];
        var self = this;
        if (!ci) return { updates: {}, drift: [{ field: 'ci', message: 'Asset has no CI' }], inSync: false };

        Object.keys(this.fieldMap).forEach(function (af) {
            var cf = self.fieldMap[af];
            var av = self._norm(asset[af]);
            var cv = self._norm(ci[cf]);
            if (af === 'serial_number') {
                // Discovery owns serials: report mismatch but do not overwrite
                if (av && cv && av !== cv) {
                    drift.push({ field: cf, asset: asset[af], ci: ci[cf], message: 'Serial mismatch - review, not auto-fixed' });
                }
                return;
            }
            if (av !== cv) {
                updates[cf] = asset[af] || '';
                drift.push({ field: cf, asset: asset[af] || '', ci: ci[cf] || '' });
            }
        });

        var st = this.statusMap[asset.install_status];
        if (st) {
            Object.keys(st).forEach(function (k) {
                if (String(ci[k] || '') !== st[k]) {
                    updates[k] = st[k];
                    drift.push({ field: k, asset: asset.install_status, ci: ci[k] || '' });
                }
            });
        }
        return { updates: updates, drift: drift, inSync: drift.length === 0 };
    },

    _norm: function (v) {
        return v === undefined || v === null ? '' : String(v).trim().toUpperCase();
    },

    type: 'AssetCiSync'
};
