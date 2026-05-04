// ============================================================
// AFTER FIX — Lesson 2: Broken Authentication (Fixed)
// Lambda: DVSA-ORDER-MANAGER → order-manager.js
// ============================================================
// FIX: Added full JWT signature verification using Cognito
// JWKS public keys. The token is now cryptographically
// verified before any identity claim is trusted. Forged
// tokens are rejected with a 401 Unauthorized response.
// ============================================================

const jose  = require('node-jose');
const https = require('https');

// ── JWKS cache (refresh every 6 hours) ────────────────────
let _jwksCache = { keystore: null, fetchedAt: 0 };

function resp(statusCode, bodyObj) {
    return {
        statusCode,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify(bodyObj)
    };
}

function fetchJson(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = "";
            res.on("data", (c) => data += c);
            res.on("end", () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
                } else {
                    reject(new Error(`HTTP ${res.statusCode}: ${data.slice(0, 200)}`));
                }
            });
        }).on("error", reject);
    });
}

async function getCognitoKeystore() {
    const now = Date.now();
    if (_jwksCache.keystore && (now - _jwksCache.fetchedAt) < 6 * 60 * 60 * 1000) {
        return _jwksCache.keystore;
    }
    const region     = process.env.AWS_REGION;
    const userPoolId = process.env.userpoolid;
    const jwksUrl    = `https://cognito-idp.${region}.amazonaws.com/${userPoolId}/.well-known/jwks.json`;
    const jwks       = await fetchJson(jwksUrl);
    const keystore   = await jose.JWK.asKeyStore(jwks);
    _jwksCache = { keystore, fetchedAt: now };
    return keystore;
}

// ── JWT verification helper ────────────────────────────────
async function verifyCognitoJwt(jwt) {
    const region     = process.env.AWS_REGION;
    const userPoolId = process.env.userpoolid;
    const issuer     = `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`;

    const keystore = await getCognitoKeystore();
    const result   = await jose.JWS.createVerify(keystore).verify(jwt); // cryptographic check
    const claims   = JSON.parse(result.payload.toString("utf8"));

    if (claims.iss !== issuer)                                               throw new Error("bad issuer");
    if (typeof claims.exp === "number" && (Date.now() / 1000) > claims.exp) throw new Error("expired");
    if (claims.token_use && !["access","id"].includes(claims.token_use))     throw new Error("bad token_use");

    return claims;
}

// ── Handler ────────────────────────────────────────────────
exports.handler = function(event, context, callback) {

    var req     = JSON.parse(event.body);
    var headers = event.headers;

    var auth_header = (headers.Authorization || headers.authorization || "");
    var jwt         = auth_header.replace(/^Bearer\s+/i, "").trim();

    if (!jwt) {
        return callback(null, resp(401, { status: "err", msg: "missing authorization" }));
    }

    verifyCognitoJwt(jwt).then((claims) => {

        // Identity is now cryptographically verified before use
        var user    = claims.username || claims["cognito:username"] || claims.sub;
        var isAdmin = (claims["cognito:groups"] || []).includes("admin") ? "true" : "false";

        if (!user) {
            return callback(null, resp(401, { status: "err", msg: "missing subject" }));
        }

        switch (req.action) {
            case 'orders':
                // user is verified — safe for access control
                break;
            // ... rest of handler
        }

    }).catch((e) => {
        console.log("JWT verify failed:", e.message);
        return callback(null, resp(401, { status: "err", msg: "invalid token" }));
    });
};
