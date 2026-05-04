// ============================================================
// BEFORE FIX — Lesson 2: Broken Authentication (Vulnerable)
// Lambda: DVSA-ORDER-MANAGER → order-manager.js
// ============================================================
// VULNERABILITY: The backend splits the JWT into sections,
// base64-decodes the payload, and extracts the username field
// DIRECTLY — without ever verifying the cryptographic
// signature. An attacker can modify username/sub in the
// payload and reuse the original signature. The backend
// accepts the forged token as valid.
// ============================================================

exports.handler = function(event, context, callback) {

    var req     = JSON.parse(event.body);
    var headers = event.headers;

    // ── VULNERABLE JWT PARSING BLOCK ──────────────────────
    var auth_header    = headers.Authorization || headers.authorization;
    var token_sections = auth_header.split('.');                          // splits header.payload.signature
    var auth_data      = jose.util.base64url.decode(token_sections[1]);   // decodes payload only
    var token          = JSON.parse(auth_data);
    var user           = token.username;                                   // trusts unverified claim
    var isAdmin        = false;
    // ── END VULNERABLE BLOCK ──────────────────────────────

    // user is now trusted and used for all downstream access control
    // Any attacker who edits the payload and keeps the original signature
    // will have their modified username trusted here.

    switch (req.action) {
        case 'orders':
            // returns orders filtered by `user` — but user was never verified!
            break;
        // ...
    }
};
