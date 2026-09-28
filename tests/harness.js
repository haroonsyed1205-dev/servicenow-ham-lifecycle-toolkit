'use strict';
// Loads ServiceNow Script Includes into a sandbox so their logic can be unit
// tested with Node. Provides minimal stand-ins for Class.create() and gs.*.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function load(files, globals) {
  const logs = [];
  const ctx = Object.assign({
    Class: {
      create: function () {
        return function () {
          if (typeof this.initialize === 'function') {
            this.initialize.apply(this, arguments);
          }
        };
      }
    },
    gs: {
      info: (m) => logs.push(['info', m]),
      warn: (m) => logs.push(['warn', m]),
      error: (m) => logs.push(['error', m]),
      debug: () => {}
    },
    JSON: JSON,
    Math: Math,
    Date: Date
  }, globals || {});
  ctx.__logs = logs;
  vm.createContext(ctx);
  files.forEach((f) => {
    const full = path.join(__dirname, '..', 'src', 'script_includes', f);
    vm.runInContext(fs.readFileSync(full, 'utf8'), ctx, { filename: f });
  });
  return ctx;
}

// Values created inside the sandbox have that realm's prototypes; convert them
// to plain values before deepStrictEqual comparisons.
function plain(v) {
  return JSON.parse(JSON.stringify(v));
}

module.exports = { load, plain };
