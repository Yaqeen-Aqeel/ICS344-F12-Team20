// ============================================================
// AFTER FIX — Lesson 9: Vulnerable Dependencies (Fixed)
// Lambda: DVSA-ORDER-MANAGER → order-manager.js
// ============================================================
// FIX: Removed the node-serialize library entirely.
// All deserialization now uses the safe built-in JSON.parse()
// which treats input as pure data and never evaluates code.
// Also removed node-serialize from package.json.
//
// BEFORE (vulnerable):
//   var serialize = require('node-serialize');
//   var req     = serialize.unserialize(event.body);
//   var headers = serialize.unserialize(event.headers);
//
// AFTER (fixed):
//   var req     = JSON.parse(event.body);
//   var headers = event.headers;
// ============================================================

// REMOVED: var serialize = require('node-serialize');

exports.handler = function(event, context, callback) {

    // ── FIXED: safe deserialization ───────────────────────
    var req     = JSON.parse(event.body);   // ← pure data, no code execution
    var headers = event.headers;            // ← native object, no deserialization needed
    // ── END FIXED BLOCK ──────────────────────────────────

    // Allowlist validation — added as additional hardening
    var allowedActions = ['new', 'get', 'orders', 'shipping', 'billing', 'complete', 'cancel'];
    if (!req || !req.action || !allowedActions.includes(req.action)) {
        return callback(null, {
            statusCode: 400,
            headers: { "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify({ status: 'err', message: 'Invalid or missing action' })
        });
    }

    // ... rest of handler logic unchanged
};

// ── package.json change ───────────────────────────────────
// Remove the node-serialize dependency:
//
// BEFORE:
// {
//   "dependencies": {
//     "node-serialize": "0.0.4",   ← REMOVE THIS LINE
//     "node-jose": "..."
//   }
// }
//
// AFTER:
// {
//   "dependencies": {
//     "node-jose": "..."
//   }
// }
