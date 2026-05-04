# ============================================================
# LESSON 8 FIX: Race Condition / Logic Vulnerability
# ============================================================

# ── File 1: order_billing.py ─────────────────────────────────
# Location: Lambda → DVSA-ORDER-BILLING → order_billing.py
# Add this BEFORE reading the item list:

if status < 120:
    # LOCK ORDER STATUS TO PREVENT RACE CONDITION
    try:
        table.update_item(
            Key={"orderId": orderId, "userId": userId},
            UpdateExpression='SET orderStatus = :locking',
            ConditionExpression='orderStatus < :locked',
            ExpressionAttributeValues={
                ':locking': Decimal(115),
                ':locked': Decimal(120)
            }
        )
    except Exception as e:
        return {"status": "err", "msg": "order is already being processed"}

# ── File 2: update_order.py ──────────────────────────────────
# Location: Lambda → DVSA-ORDER-BILLING → update_order.py
# Change the orderStatus check from > 110 to >= 115:

# BEFORE (vulnerable):
# if response["Item"]["orderStatus"] > 110:

# AFTER (fixed):
if response["Item"]["orderStatus"] >= 115:
    return {"status": "err", "msg": "order cannot be modified during or after billing"}
