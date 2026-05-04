// ============================================================
// BEFORE FIX — Lesson 10: Unhandled Exceptions (Vulnerable)
// Lambda: DVSA-ORDER-MANAGER
// ============================================================
// VULNERABILITY: The Lambda handler processes requests directly
// with no try/catch block. When malformed, empty, or unexpected
// input arrives, Node.js throws an unhandled exception that
// propagates to the Lambda runtime. The runtime logs the full
// error object — including stack trace, file paths, line
// numbers, and variable names — to CloudWatch. No auth is
// needed to trigger this. Evidence in CloudWatch:
//
//   errorType: "TypeErrors"
//   errorMessage: "Cannot read properties of undefined (reading 'split')"
//   stack: [
//     "TypeError: Cannot read properties of undefined (reading 'split')",
//     "at exports.handler (/var/task/order-manager.js:13:38)",   ← internal path exposed
//     "at Runtime.handleOnceNonStreaming (file:///var/runtime/index.mjs:1306:29)"
//   ]
// ============================================================

exports.handler = function(event, context, callback) {

    // ── VULNERABLE: no try/catch around handler logic ─────
    // If event.body is empty, null, or malformed JSON,
    // JSON.parse() throws and the runtime logs the full stack.
    var req     = JSON.parse(event.body);
    var headers = event.headers;

    var auth_header    = headers.Authorization || headers.authorization;
    var token_sections = auth_header.split('.');    // ← throws TypeError if auth_header is undefined

    // ... rest of handler
    // ── END VULNERABLE BLOCK ─────────────────────────────
};
