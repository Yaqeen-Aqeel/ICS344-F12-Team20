// ============================================================
// AFTER FIX — Lesson 1: Event Injection (Fixed)
// Lambda: DVSA-ORDER-MANAGER
// ============================================================
// FIX: Removed node-serialize entirely. Replaced with
// JSON.parse() which treats all input as plain data and never
// evaluates functions. Added allowlist validation on action
// field to reject unexpected values before processing.
// ============================================================

// REMOVED: var serialize = require('node-serialize');
// Also removed from package.json

exports.handler = function(event, context, callback) {

    // Safe deserialization — treats input as pure data only
    var req     = JSON.parse(event.body);   // ← SAFE
    var headers = event.headers;            // ← SAFE

    // Allowlist validation — reject unrecognised actions early
    var allowedActions = ['new', 'get', 'orders', 'shipping', 'billing', 'complete', 'cancel'];
    if (!req.action || !allowedActions.includes(req.action)) {
        return callback(null, {
            statusCode: 400,
            headers: { "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify({ status: 'err', message: 'Invalid action' })
        });
    }

    var auth_header = headers.Authorization || headers.authorization;
    var token_sections = auth_header.split('.');
    // ... rest of handler logic
};
