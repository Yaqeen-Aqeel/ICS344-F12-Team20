# 🛡️ DVSA Vulnerability Discovery and Remediation

**ICS-344: Information Security — Course Project**  
**King Fahd University of Petroleum and Minerals (KFUPM) — Term 252**

| | |
|---|---|
| **Students** | Shorooq Abuzaid (202257840) · Yaqin Shawkan (202255400) |
| **Section & Team#** | F12 - Team 20 |
| **Date** | April 27, 2026 |
| **AWS Region** | `us-east-1` |
| **DVSA URL** | http://dvsa-website-446988880983-us-east-1.s3-website.us-east-1.amazonaws.com |

---

## 📋 Table of Contents

- [About DVSA](#about-dvsa)
- [Architecture Overview](#architecture-overview)
- [Vulnerabilities Covered](#vulnerabilities-covered)
- [Repository Structure](#repository-structure)
- [Setup & Deployment](#setup--deployment)
- [Vulnerability Details](#vulnerability-details)
- [Key Security Principles](#key-security-principles)
- [Disclaimer](#disclaimer)

---

## About DVSA

[OWASP DVSA](https://github.com/OWASP/DVSA) (Damn Vulnerable Serverless Application) is an intentionally vulnerable cloud application designed for security education. This repository documents the discovery, exploitation, and remediation of all **10 official vulnerabilities** in a live AWS deployment.

> ⚠️ **Warning:** DVSA is intentionally vulnerable. Never deploy to a production AWS account. All work here is for educational purposes only within the ICS-344 course.

---

## Architecture Overview

```
Browser → Amazon CloudFront → S3 (Static Frontend)
                                    ↓
                           Amazon API Gateway
                                    ↓
                            AWS Lambda Functions
                           ↙        ↓        ↘
                      DynamoDB    Amazon S3   Amazon SES
                                  (Receipts)
                           ↑
                    Amazon Cognito (Auth / JWT)
```

**Key AWS Services:**
- **Frontend:** S3 static website
- **API Layer:** Amazon API Gateway
- **Compute:** AWS Lambda (Node.js + Python)
- **Database:** Amazon DynamoDB
- **Storage:** Amazon S3 (receipts bucket)
- **Auth:** Amazon Cognito + JWT
- **Monitoring:** Amazon CloudWatch + AWS CloudTrail

---

## Vulnerabilities Covered

| # | Lesson | Vulnerability | Severity | Status |
|---|--------|---------------|----------|--------|
| 1 | L10 | [Unhandled Exceptions](#l10-unhandled-exceptions) | 🔴 Critical | ✅ Fixed |
| 2 | L7  | [Over-Privileged Function](#l7-over-privileged-function) | 🟠 High | ✅ Fixed |
| 3 | L9  | [Vulnerable Dependencies](#l9-vulnerable-dependencies) | 🔴 Critical | ✅ Fixed |
| 4 | L3  | [Sensitive Information Disclosure](#l3-sensitive-information-disclosure) | 🟠 High | ✅ Fixed |
| 5 | L1  | [Event Injection](#l1-event-injection) | 🔴 Critical | ✅ Fixed |
| 6 | L2  | [Broken Authentication](#l2-broken-authentication) | 🔴 Critical | ✅ Fixed |
| 7 | L4  | [Insecure Cloud Configuration](#l4-insecure-cloud-configuration) | 🟠 High | ✅ Fixed |
| 8 | L5  | [Broken Access Control](#l5-broken-access-control) | 🔴 Critical | ✅ Fixed |
| 9 | L8  | [Logic Vulnerability / Race Condition](#l8-logic-vulnerability--race-condition) | 🟠 High | ✅ Fixed |
| 10 | L6 | [Denial of Service (DoS)](#l6-denial-of-service) | 🟠 High | ✅ Fixed |

---

## Repository Structure

```
dvsa-vulnerability-report/
│
├── README.md                          ← This file
│
├── fixes/
│   ├── L01-event-injection/
│   │   ├── before-order-manager.js
│   │   └── after-order-manager.js
│   ├── L02-broken-auth/
│   │   ├── before-order-manager.js
│   │   └── after-order-manager.js
│   ├── L03-sensitive-disclosure/
│   │   ├── before-get-orders.py
│   │   └── after-get-orders.py
│   ├── L04-insecure-cloud-config/
│   │   └── bucket-policy.json
│   ├── L05-broken-access-control/
│   │   ├── before-order-manager.js
│   │   └── after-order-manager.js
│   ├── L06-dos/
│   │   └── usage-plan-config.md
│   ├── L07-over-privileged/
│   │   └── least-privilege-policy.json
│   ├── L08-race-condition/
│   │   ├── before-order-billing.py
│   │   └── after-order-billing.py
│   ├── L09-vulnerable-deps/
│   │   └── after-order-manager.js
│   └── L10-unhandled-exceptions/
│       ├── before-handler.js
│       └── after-handler.js
│
└── scripts/
    ├── exploit-L01-injection.sh
    ├── exploit-L02-auth.py
    ├── exploit-L06-dos.sh
    └── exploit-L08-race.sh
```

---

## Setup & Deployment

### Prerequisites

```bash
sudo apt update && sudo apt install -y unzip curl jq python3

curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o /tmp/awscliv2.zip
unzip -q /tmp/awscliv2.zip -d /tmp && sudo /tmp/aws/install
aws configure
```

### Deploy DVSA

1. Open AWS Console → Serverless Application Repository
2. Search: **OWASP DVSA**
3. Enable: *Show apps that create custom IAM roles or resource policies*
4. Fill in `AdminEmail` and `WebsiteBucketPrefix`, then click **Deploy**
5. Copy `WebsiteURL` from CloudFormation Outputs

### Environment Variables

```bash
export API="https://8y2ebv81la.execute-api.us-east-1.amazonaws.com/Stage/order"
export RECEIPTS_BUCKET="dvsa-receipts-bucket-446988880983-us-east-1"
```

---

## Vulnerability Details

---

### L10: Unhandled Exceptions

**Affected:** `DVSA-ORDER-MANAGER` Lambda  
**Impact:** Internal stack traces, file paths, and error types exposed via CloudWatch

```bash
curl -s -X POST "$API" -H "Content-Type: application/json" -d '{}' | jq
curl -s -X POST "$API" -H "Content-Type: application/json" -d '{"action":"INVALID_XYZ"}' | jq
```

**Fix:**
```javascript
exports.handler = function(event, context, callback) {
  try {
    // all existing handler logic
  } catch (err) {
    console.log('Internal error:', err);
    return callback(null, { statusCode: 500,
      body: JSON.stringify({ message: 'An error occurred' }) });
  }
};
```

---

### L7: Over-Privileged Function

**Affected:** `DVSA-SEND-RECEIPT-EMAIL` IAM Role  
**Impact:** Account-wide S3 and DynamoDB access if function is compromised

IAM Policy Simulator confirmed: `s3:GetObject`, `s3:PutObject`, `dynamodb:Scan`, `dynamodb:GetItem`, `dynamodb:PutItem`, `dynamodb:DeleteItem` — all **Allowed** on any resource.

**Fix:** Replace wildcard policies with least-privilege custom policies scoped to specific bucket and table ARNs only.

---

### L9: Vulnerable Dependencies

**Affected:** `node-serialize` library in `DVSA-ORDER-MANAGER`  
**Impact:** Remote Code Execution without authentication

```bash
curl -s -X POST "$API" -H "Content-Type: application/json" \
  -d '{"action":"_$$ND_FUNC$$_function(){return 42;}()","cart-id":""}' | jq
```

**Fix:** Remove `node-serialize`. Replace `serialize.unserialize()` with `JSON.parse()`.

---

### L3: Sensitive Information Disclosure

**Affected:** `DVSA-ORDER-ORDERS` Lambda (get-orders.py)  
**Impact:** Any authenticated user can download any other user's S3 receipt

**Fix:** Remove `"token": i["confirmationToken"]` from both loops in get-orders.py.

---

### L1: Event Injection

**Affected:** `DVSA-ORDER-MANAGER` + `node-serialize`  
**Impact:** Arbitrary code execution on Lambda runtime — no auth required

CloudWatch evidence: `FILE READ SUCCESS: You are reading my hacked file!`

**Fix:** Same as L9 — remove `node-serialize`, use `JSON.parse()`, add allowlist validation.

---

### L2: Broken Authentication

**Affected:** JWT handling in `order-manager.js`  
**Impact:** Complete account impersonation — access any user's orders

Backend decodes JWT payload but never verifies the signature. Forged token (modified payload + original signature) accepted as valid.

**Fix:** Fetch Cognito JWKS public keys and use `jose.JWS.createVerify()` to validate signature before trusting any claims.

---

### L4: Insecure Cloud Configuration

**Affected:** S3 Receipts Bucket  
**Impact:** Unauthorized uploads trigger backend Lambda pipeline

```bash
aws s3 cp /tmp/malicious.txt s3://$RECEIPTS_BUCKET/2020/20/20/malicious.txt
# Succeeds — no authorization required
```

**Fix:** Enable Block Public Access (all 4 settings). Add bucket policy denying `s3:PutObject` for all principals except the specific Lambda role ARN.

---

### L5: Broken Access Control

**Affected:** `complete` action in `DVSA-ORDER-MANAGER`  
**Impact:** Regular users can finalize orders without payment (financial bypass)

```bash
curl -s -X POST "$API" -H "Authorization: $TOKEN" \
  -d "{\"action\":\"complete\",\"order-id\":\"$ORDER_ID\"}" | jq
# Regular user receives: { "msg": "order completed successfully" }
```

**Fix:** Add `isAdmin` check before invoking `DVSA-ORDER-COMPLETE`. Return 403 for non-admin users.

---

### L8: Logic Vulnerability / Race Condition

**Affected:** `DVSA-ORDER-BILLING`  
**Impact:** Pay for 1 item while order is updated to contain 5 items

Billing and shipping update sent simultaneously. Billing reads qty=1 and charges $68. Concurrent update changes qty to 5.

**Fix:** DynamoDB conditional write sets `orderStatus = 115` before reading item list. Update handler rejects modifications when `orderStatus >= 115`.

---

### L6: Denial of Service

**Affected:** API Gateway + `DVSA-ORDER-MANAGER`  
**Impact:** 50 concurrent requests exhaust Lambda concurrency — legitimate users throttled

CloudWatch Throttles metric peaked at 35 events during the attack window.

**Fix:** API Gateway Usage Plan — throttle: 10 req/sec, burst: 20. Attach to DVSA Stage.

---

## Key Security Principles

| Principle | Applied In |
|-----------|-----------|
| **Least Privilege** | L7 — restrict IAM roles to minimum required permissions |
| **Input Validation** | L1, L9 — validate before parsing; never eval user input |
| **Signature Verification** | L2 — cryptographically verify JWT before trusting claims |
| **Defense in Depth** | L4, L5 — security at every layer (API, Lambda, IAM, S3) |
| **Atomic Operations** | L8 — DynamoDB conditional writes prevent race conditions |
| **Least Information** | L3, L10 — never expose internal details to external callers |

---

## Disclaimer

> This project and its materials are the intellectual property of KFUPM/Course Instructors (ICS-344, Term 252). All vulnerability demonstrations were performed exclusively in a non-production AWS account for educational purposes only.
