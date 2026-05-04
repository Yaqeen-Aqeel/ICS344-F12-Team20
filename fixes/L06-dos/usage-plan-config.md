# Lesson 6: DoS Fix — API Gateway Usage Plan Configuration

## Steps Applied in AWS Console

### Location
AWS Console → API Gateway → your DVSA API → Usage Plans

---

### Step 1: Create Usage Plan

| Setting | Value |
|---------|-------|
| **Plan Name** | `dvsa-rate-limit` |
| **Throttling — Rate** | `10` requests/second |
| **Throttling — Burst** | `20` requests |
| **Quota** | `10,000` requests/month |

---

### Step 2: Attach to Stage

1. Open the newly created usage plan
2. Click **Add API Stage**
3. Select your DVSA API
4. Select stage: **Stage**
5. Click the checkmark to save

---

### Step 3: Reserved Concurrency (Recommended for production)

**Location:** Lambda → DVSA-ORDER-MANAGER → Configuration → Concurrency

| Setting | Value |
|---------|-------|
| **Reserved concurrency** | `10` (or appropriate limit) |

> ⚠️ **Note:** Reserved concurrency requires at least 100 unreserved concurrency to remain in the account.
> This account had a total limit of 10, which is below the AWS minimum threshold.
> The fix is documented here as the intended remediation for standard production accounts.

---

### Verification

After applying the Usage Plan:

```bash
# Run the DoS flood script
/tmp/dos.sh "$TOKEN" "$API_BASE" "$ORDER_ID"

# Verify a legitimate request still works
curl -s -X POST "$API_BASE/order" \
  -H "Content-Type: application/json" \
  -H "Authorization: $TOKEN" \
  -d '{"action":"orders"}' | jq
```

**Expected result:** Flood requests are throttled at the gateway (429 Too Many Requests).
Legitimate single requests still return `{"status":"ok"}`.

---

### Why This Works

Without a usage plan, API Gateway passes every concurrent request directly to Lambda.
Lambda scales automatically but is bounded by the account's regional concurrency limit.
A flood can consume all available concurrency, blocking all other users.

With the Usage Plan, API Gateway enforces the rate limit **before** requests reach Lambda,
so a single client can never saturate the backend for everyone else.
