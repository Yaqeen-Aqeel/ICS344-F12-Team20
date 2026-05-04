// ============================================================
// AFTER FIX — Lesson 10: Unhandled Exceptions (Fixed)
// Lambda: DVSA-ORDER-MANAGER
// ============================================================
// FIX: Wrapped the entire handler logic in a try/catch block.
// The catch block logs full error details internally to
// CloudWatch (for debugging) but returns only a safe, generic
// message to the client. Added input validation at the handler
// entry point to reject malformed or missing fields before
// any processing begins.
// ============================================================

exports.handler = function(event, context, callback) {

    // ── FIXED: try/catch wraps all handler logic ──────────
    try {

        // Input validation before any processing
        if (!event.body) {
            return callback(null, {
                statusCode: 400,
                headers: { "Access-Control-Allow-Origin": "*" },
                body: JSON.stringify({ status: "err", message: "An error occurred" })
            });
        }

        var req;
        try {
            req = JSON.parse(event.body);
        } catch (parseErr) {
            return callback(null, {
                statusCode: 400,
                headers: { "Access-Control-Allow-Origin": "*" },
                body: JSON.stringify({ status: "err", message: "An error occurred" })
            });
        }

        var allowedActions = ['new', 'get', 'orders', 'shipping', 'billing', 'complete', 'cancel'];
        if (!req.action || !allowedActions.includes(req.action)) {
            return callback(null, {
                statusCode: 400,
                headers: { "Access-Control-Allow-Origin": "*" },
                body: JSON.stringify({ status: "err", message: "An error occurred" })
            });
        }

        var headers        = event.headers;
        var auth_header    = headers.Authorization || headers.authorization;
        var token_sections = auth_header.split('.');

        // ... rest of handler logic

    } catch (err) {
        // Log full details internally — never returned to client
        console.log("Handled error:", err.message);
        return callback(null, {
            statusCode: 500,
            headers: { "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify({ status: "err", message: "An error occurred" })
        });
    }
    // ── END FIXED BLOCK ──────────────────────────────────
};
