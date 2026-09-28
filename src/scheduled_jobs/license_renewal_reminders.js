/**
 * Scheduled Script Execution: License renewal reminders (daily 06:00)
 * Reads active software entitlements and contracts and fires events that
 * drive notifications:
 *   x_ham.license.renewal_reminder   (parm1 = days, parm2 = owner)
 *   x_ham.license.renewal_escalation (parm1 = days, parm2 = owner's manager)
 */
(function () {
    var today = new GlideDate().getValue(); // yyyy-MM-dd
    var list = [];
    var gr = new GlideRecord('alm_license');
    gr.addQuery('end_date', '!=', '');
    gr.addQuery('u_renewal_started', false);
    gr.addQuery('end_date', '<=', gs.daysAgoEnd(-91));
    gr.query();
    while (gr.next()) {
        list.push({ id: gr.getUniqueValue(), name: gr.getDisplayValue(), end_date: gr.getValue('end_date'),
            owner: gr.getValue('assigned_to'), renewal_started: false });
    }
    var byId = {};
    list.forEach(function (e) { byId[e.id] = e; });

    new LicenseRenewalScheduler().run(list, today).forEach(function (r) {
        var ent = new GlideRecord('alm_license');
        ent.get(r.id);
        var owner = ent.assigned_to.getRefRecord();
        if (r.escalate) {
            gs.eventQueue('x_ham.license.renewal_escalation', ent, String(r.days), owner.getValue('manager'));
        }
        gs.eventQueue('x_ham.license.renewal_reminder', ent, String(r.days), byId[r.id].owner);
    });
})();
