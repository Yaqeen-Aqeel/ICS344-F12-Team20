// ============================================================
// BEFORE FIX — Lesson 5: Broken Access Control (Vulnerable)
// Lambda: DVSA-ORDER-MANAGER → order-manager.js
// ============================================================
// VULNERABILITY: The "complete" action invokes DVSA-ORDER-COMPLETE
// directly with no authorization check. Any authenticated user
// (regardless of role) can send action:"complete" and have their
// order marked as paid without going through billing.
// ============================================================

exports.handler = function(event, context, callback) {

    var req     = JSON.parse(event.body);
    var headers = event.headers;
    var user    = /* ... decoded from JWT ... */ "";
    var isAdmin = false;

    var payload      = {};
    var functionName = "";

    switch (req.action) {

        // ── VULNERABLE: no admin check before complete ────
        case "complete":
            payload      = { "orderId": req["order-id"] };
            functionName = "DVSA-ORDER-COMPLETE";
            break;
        // ── END VULNERABLE BLOCK ─────────────────────────

        case "new":
            payload      = { "userId": user, "cartId": req["cart-id"], "items": req.items };
            functionName = "DVSA-ORDER-NEW";
            break;

        case "get":
            payload      = { "userId": user, "orderId": req["order-id"] };
            functionName = "DVSA-ORDER-GET";
            break;

        // ... other cases
    }

    // Invoke the downstream Lambda
    var lambda = new AWS.Lambda();
    lambda.invoke({
        FunctionName:   functionName,
        InvocationType: "RequestResponse",
        Payload:        JSON.stringify(payload)
    }, function(err, data) {
        // ... handle response
    });
};
