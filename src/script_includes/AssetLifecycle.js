/**
 * AssetLifecycle
 * Enforces the hardware asset lifecycle (alm_hardware install_status /
 * substatus) from procurement to disposal. Each transition lists the fields
 * that must be filled before it is allowed.
 *
 * States use the out-of-box install_status values:
 *   2 On order, 6 In stock, 1 In use, 3 In maintenance, 7 Retired, 8 Missing
 * Retired substatus: disposed, sold, donated, vendor_credit
 */
var AssetLifecycle = Class.create();
AssetLifecycle.STATES = {
    ON_ORDER: '2', IN_STOCK: '6', IN_USE: '1', IN_MAINTENANCE: '3', RETIRED: '7', MISSING: '8'
};
AssetLifecycle.prototype = {
    initialize: function () {
        var S = AssetLifecycle.STATES;
        // from -> { to: [required fields] }
        this.transitions = {};
        this.transitions[S.ON_ORDER] = {};
        this.transitions[S.ON_ORDER][S.IN_STOCK] = ['serial_number', 'stockroom', 'po_number'];
        this.transitions[S.IN_STOCK] = {};
        this.transitions[S.IN_STOCK][S.IN_USE] = ['assigned_to', 'location'];
        this.transitions[S.IN_STOCK][S.RETIRED] = ['retirement_reason'];
        this.transitions[S.IN_STOCK][S.MISSING] = [];
        this.transitions[S.IN_USE] = {};
        this.transitions[S.IN_USE][S.IN_STOCK] = ['stockroom'];
        this.transitions[S.IN_USE][S.IN_MAINTENANCE] = ['maintenance_vendor'];
        this.transitions[S.IN_USE][S.MISSING] = [];
        this.transitions[S.IN_USE][S.RETIRED] = ['retirement_reason'];
        this.transitions[S.IN_MAINTENANCE] = {};
        this.transitions[S.IN_MAINTENANCE][S.IN_USE] = ['assigned_to'];
        this.transitions[S.IN_MAINTENANCE][S.IN_STOCK] = ['stockroom'];
        this.transitions[S.IN_MAINTENANCE][S.RETIRED] = ['retirement_reason'];
        this.transitions[S.MISSING] = {};
        this.transitions[S.MISSING][S.IN_STOCK] = ['stockroom'];
        this.transitions[S.MISSING][S.RETIRED] = ['retirement_reason'];
        this.transitions[S.RETIRED] = {}; // terminal
        this.disposalSubstatus = ['disposed', 'sold', 'donated', 'vendor_credit'];
    },

    /**
     * @param from  current install_status
     * @param to    requested install_status
     * @param asset plain object of field values
     * @returns { allowed: boolean, missing: [], message: string, clear: [] }
     */
    validate: function (from, to, asset) {
        var S = AssetLifecycle.STATES;
        var a = asset || {};
        if (from === to) return { allowed: true, missing: [], clear: [], message: '' };
        var allowedTo = this.transitions[from];
        if (!allowedTo || allowedTo[to] === undefined) {
            return { allowed: false, missing: [], clear: [],
                message: 'Transition ' + this.label(from) + ' -> ' + this.label(to) + ' is not allowed' };
        }
        var missing = allowedTo[to].filter(function (f) { return !a[f]; });

        if (to === S.RETIRED) {
            if (this.disposalSubstatus.indexOf(a.substatus) === -1) missing.push('substatus');
            if (a.substatus === 'disposed' && !a.disposal_certificate) missing.push('disposal_certificate');
        }

        // Fields that should be cleared when an asset goes back to stock or retires
        var clear = [];
        if (to === S.IN_STOCK || to === S.RETIRED) clear = ['assigned_to', 'assigned'];

        return {
            allowed: missing.length === 0,
            missing: missing,
            clear: clear,
            message: missing.length ? 'Missing required fields: ' + missing.join(', ') : ''
        };
    },

    label: function (state) {
        var names = { '2': 'On order', '6': 'In stock', '1': 'In use', '3': 'In maintenance', '7': 'Retired', '8': 'Missing' };
        return names[state] || ('state ' + state);
    },

    type: 'AssetLifecycle'
};
