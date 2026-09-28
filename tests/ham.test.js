'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { load, plain } = require('./harness');

const ctx = load(['AssetLifecycle.js', 'AssetCiSync.js', 'LegacyAssetImportValidator.js', 'LicenseRenewalScheduler.js']);
const S = ctx.AssetLifecycle.STATES;

function parseCsv(text) {
  const lines = text.trim().split('\n');
  const header = lines.shift().split(',');
  return lines.map((line) => {
    const cells = [];
    let cur = '', q = false;
    for (const ch of line) {
      if (ch === '"') q = !q;
      else if (ch === ',' && !q) { cells.push(cur); cur = ''; }
      else cur += ch;
    }
    cells.push(cur);
    return Object.fromEntries(header.map((h, i) => [h, cells[i] || '']));
  });
}

test('lifecycle: receive order requires serial, stockroom, PO', () => {
  const lc = new ctx.AssetLifecycle();
  const r = lc.validate(S.ON_ORDER, S.IN_STOCK, { serial_number: 'X1' });
  assert.strictEqual(r.allowed, false);
  assert.deepStrictEqual(plain(r.missing), ['stockroom', 'po_number']);
});

test('lifecycle: cannot skip from On order to In use', () => {
  const r = new ctx.AssetLifecycle().validate(S.ON_ORDER, S.IN_USE, {});
  assert.strictEqual(r.allowed, false);
  assert.match(r.message, /On order -> In use is not allowed/);
});

test('lifecycle: retiring needs substatus and certificate when disposed', () => {
  const lc = new ctx.AssetLifecycle();
  let r = lc.validate(S.IN_USE, S.RETIRED, { retirement_reason: 'End of life', substatus: 'disposed' });
  assert.deepStrictEqual(plain(r.missing), ['disposal_certificate']);
  r = lc.validate(S.IN_USE, S.RETIRED, { retirement_reason: 'End of life', substatus: 'sold' });
  assert.strictEqual(r.allowed, true);
  assert.deepStrictEqual(plain(r.clear), ['assigned_to', 'assigned']);
});

test('lifecycle: retired is terminal', () => {
  assert.strictEqual(new ctx.AssetLifecycle().validate(S.RETIRED, S.IN_STOCK, { stockroom: 'A' }).allowed, false);
});

test('asset-to-CI sync: updates ownership and status, reports serial drift only', () => {
  const sync = new ctx.AssetCiSync();
  const r = sync.diff(
    { assigned_to: 'u1', location: 'NYC', department: 'IT', cost_center: 'CC1', company: 'Acme', serial_number: 'ABC', install_status: '1' },
    { assigned_to: 'u2', location: 'nyc ', department: 'IT', cost_center: 'CC1', company: 'Acme', serial_number: 'ABD', install_status: '6', operational_status: '2' });
  assert.deepStrictEqual(plain(r.updates), { assigned_to: 'u1', install_status: '1', operational_status: '1' });
  assert.ok(r.drift.some((d) => /Serial mismatch/.test(d.message)));
  assert.strictEqual(r.inSync, false);
});

test('asset-to-CI sync: in sync record needs no updates', () => {
  const a = { assigned_to: 'u1', location: 'L', install_status: '6' };
  const r = new ctx.AssetCiSync().diff(a, { assigned_to: 'u1', location: 'L', install_status: '6', operational_status: '2' });
  assert.strictEqual(r.inSync, true);
});

test('legacy import: sample file dry run', () => {
  const rows = parseCsv(fs.readFileSync(path.join(__dirname, '..', 'sample_data', 'legacy_assets.csv'), 'utf8'));
  const v = new ctx.LegacyAssetImportValidator({
    modelAliases: { 'LAT 5440': 'Dell Latitude 5440' },
    knownModels: ['Dell Latitude 5440', 'MacBook Pro 14', 'Mac Mini M2', 'ThinkPad X1']
  });
  const res = v.validateAll(rows);
  assert.strictEqual(res.total, 7);
  assert.strictEqual(res.valid, 3);
  const byRow = Object.fromEntries(res.results.map((r) => [r.row, r]));
  assert.strictEqual(byRow[2].record.model, 'Dell Latitude 5440');
  assert.strictEqual(byRow[2].record.purchase_date, '2023-03-14');
  assert.strictEqual(byRow[2].record.cost, 1249);
  assert.strictEqual(byRow[3].record.serial_number, '5CG1234ABD');
  assert.match(byRow[4].errors[0], /Duplicate serial 5CG1234ABC \(first seen on row 2\)/);
  assert.strictEqual(byRow[5].record.install_status, '6'); // in use without user -> stock
  assert.match(byRow[6].errors[0], /blank/);
  assert.match(byRow[7].errors.join(), /Warranty expires before purchase/);
  assert.strictEqual(byRow[8].errors.length, 2); // bad date + bad cost
});

test('license renewals: thresholds, escalation, lapsed, skip started', () => {
  const ents = require('../sample_data/entitlements.json');
  const out = plain(new ctx.LicenseRenewalScheduler().run(ents, '2026-09-28'));
  assert.deepStrictEqual(out.map((r) => [r.id, r.days, r.action]), [
    ['ENT003', -8, 'lapsed'],
    ['ENT002', 10, 'escalate'],
    ['ENT001', 90, 'remind']
  ]);
});

test('license renewals: day count is timezone safe across DST', () => {
  const s = new ctx.LicenseRenewalScheduler();
  assert.strictEqual(s.daysBetween('2026-03-01', '2026-03-31'), 30);
  assert.strictEqual(s.daysBetween('2026-10-31', '2026-11-02'), 2);
});

test('legacy import: date parser rejects impossible dates', () => {
  const v = new ctx.LegacyAssetImportValidator();
  assert.strictEqual(v.parseDate('2/29/2024'), '2024-02-29');
  assert.strictEqual(v.parseDate('2023-02-30'), null);
  assert.strictEqual(v.parseDate('13/01/2023'), null);
  assert.strictEqual(v.parseDate(''), '');
});
