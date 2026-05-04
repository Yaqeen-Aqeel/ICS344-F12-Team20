// ============================================================
// AFTER FIX — Lesson 5: Broken Access Control (Fixed)
// Lambda: DVSA-ORDER-MANAGER → order-manager.js
// ============================================================
// FIX: Added an isAdmin check at the start of the "complete"
// case. Non-admin users receive a 403 Forbidden response.
// Admin group membership is verified from the cryptographically
// validated JWT claims (after the L2 fix is also applied).
// ============================================================

exports.handler = function(event, context, callback) {

    var req     = JSON.parse(event.body);
    var headers = event.headers;
    var user    = /* ... verified from JWT claims ... */ "";
    var isAdmin = /* ... from cognito:groups claim ... */ "false";

    var payload      = {};
    var functionName = "";

    switch (req.action) {

        // ── FIXED: admin check before complete ───────────
        case "complete":
            if (isAdmin !== "true") {
                return callback(null, {
                    statusCode: 403,
                    headers: { "Access-Control-Allow-Origin": "*" },
                    body: JSON.stringify({ status: "err", message: "Unauthorized" })
                });
            }
            payload      = { "orderId": req["order-id"] };
            functionName = "DVSA-ORDER-COMPLETE";
            break;
        // ── END FIXED BLOCK ──────────────────────────────

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
