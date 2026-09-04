// Seed data lives in client/src/lib/demoData.json — single source of truth shared
// by the demo API shim and the Express server, so demo and server mode always match.
const data = require('../client/src/lib/demoData.json');

module.exports = { seed: data };
