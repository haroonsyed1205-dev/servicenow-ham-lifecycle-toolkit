/**
 * LicenseRenewalScheduler
 * Works out which software entitlements / contracts need a renewal reminder
 * today, so renewals are started before they lapse. Reminders go out at
 * 90/60/30/14 days; inside 14 days the reminder escalates to the manager.
 */
var LicenseRenewalScheduler = Class.create();
LicenseRenewalScheduler.prototype = {
    initialize: function (thresholds) {
        this.thresholds = thresholds || [90, 60, 30, 14];
        this.escalateAt = 14;
    },

    daysBetween: function (fromIso, toIso) {
        var a = Date.UTC.apply(null, this._parts(fromIso));
        var b = Date.UTC.apply(null, this._parts(toIso));
        return Math.round((b - a) / 86400000);
    },

    _parts: function (iso) {
        var p = iso.split('-');
        return [parseInt(p[0], 10), parseInt(p[1], 10) - 1, parseInt(p[2], 10)];
    },

    evaluate: function (entitlement, todayIso) {
        if (entitlement.renewal_started) return null;
        var days = this.daysBetween(todayIso, entitlement.end_date);
        if (days < 0) {
            return { id: entitlement.id, days: days, action: 'lapsed', escalate: true,
                message: entitlement.name + ' lapsed ' + (-days) + ' day(s) ago' };
        }
        var hit = this.thresholds.indexOf(days) > -1;
        var dailyInside = days < this.escalateAt; // remind every day in the last 2 weeks
        if (!hit && !dailyInside) return null;
        return {
            id: entitlement.id, days: days,
            action: days <= this.escalateAt ? 'escalate' : 'remind',
            escalate: days <= this.escalateAt,
            message: entitlement.name + ' expires in ' + days + ' day(s) on ' + entitlement.end_date
        };
    },

    run: function (entitlements, todayIso) {
        var out = [];
        entitlements.forEach(function (e) {
            var r = this.evaluate(e, todayIso);
            if (r) out.push(r);
        }, this);
        return out.sort(function (a, b) { return a.days - b.days; });
    },

    type: 'LicenseRenewalScheduler'
};
