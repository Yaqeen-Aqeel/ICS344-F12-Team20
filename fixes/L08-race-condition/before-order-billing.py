# ============================================================
# BEFORE FIX — Lesson 8: Race Condition (Vulnerable)
# Lambda: DVSA-ORDER-BILLING → order_billing.py
# ============================================================
# VULNERABILITY: The billing handler reads the order item list
# and calculates the total WITHOUT first locking the order
# record. A concurrent shipping update request can modify the
# item quantity AFTER billing has already read qty=1 and
# calculated the charge, but BEFORE the order is finalized.
# This allows an attacker to pay for 1 item while the order
# is updated to contain 5 items.
# ============================================================

import boto3
import json
from decimal import Decimal

def lambda_handler(event, context):

    orderId = event.get("orderId")
    userId  = event.get("userId")
    data    = event.get("data", {})

    table    = boto3.resource('dynamodb').Table('DVSA-ORDERS-DB')
    response = table.get_item(Key={"orderId": orderId, "userId": userId})
    order    = response.get("Item", {})
    status   = int(order.get("orderStatus", 0))

    if status < 120:

        # ── VULNERABLE: no lock before reading item list ──
        # A concurrent shipping update can change itemList
        # between this read and the payment finalization below
        item_list = order.get("itemList", {})   # ← read without lock
        total     = calculate_total(item_list)   # ← calculated on unprotected data
        # ── END VULNERABLE BLOCK ─────────────────────────

        # Process payment with calculated total
        process_payment(data.get("ccn"), data.get("exp"), data.get("cvv"), total)

        # Update order status to paid (120)
        table.update_item(
            Key={"orderId": orderId, "userId": userId},
            UpdateExpression='SET orderStatus = :paid, totalAmount = :total',
            ExpressionAttributeValues={':paid': Decimal(120), ':total': Decimal(total)}
        )

        return {"status": "ok", "amount": total}

    return {"status": "err", "msg": "order already processed"}


def calculate_total(item_list):
    # Fetch prices from inventory and sum up
    total = 0
    for item_id, qty in item_list.items():
        price = get_price(item_id)
        total += price * qty
    return total
