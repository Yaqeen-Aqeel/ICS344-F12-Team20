// ============================================================
// BEFORE FIX — Lesson 1: Event Injection (Vulnerable)
// Lambda: DVSA-ORDER-MANAGER
// ============================================================
// VULNERABILITY: node-serialize is used to deserialize the
// request body. It recognizes the _$$ND_FUNC$$_ marker and
// EXECUTES embedded JavaScript functions during deserialization.
// An attacker can inject arbitrary code through the API with
// no authentication required.
// ============================================================

var serialize = require('node-serialize');  // ← UNSAFE LIBRARY

exports.handler = function(event, context, callback) {

    // Deserializes attacker-controlled input — EXECUTES functions
    var req = serialize.unserialize(event.body);       // ← VULNERABLE
    var headers = serialize.unserialize(event.headers); // ← VULNERABLE

    var auth_header = headers.Authorization || headers.authorization;
    var token_sections = auth_header.split('.');
    // ... rest of handler logic
};
