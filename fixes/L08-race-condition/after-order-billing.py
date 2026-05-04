# ============================================================
# AFTER FIX — Lesson 8: Race Condition (Fixed)
# Lambda: DVSA-ORDER-BILLING → order_billing.py  +  update_order.py
# ============================================================
# FIX (two coordinated changes):
#
# 1. order_billing.py: DynamoDB conditional write sets
#    orderStatus = 115 ("billing in progress") BEFORE reading
#    the item list. ConditionExpression ensures only one billing
#    request can lock the order at a time. If the lock fails,
#    the request is rejected as already in progress.
#
# 2. update_order.py: The shipping update handler now rejects
#    any modification request when orderStatus >= 115,
#    preventing concurrent updates while billing is active.
# ============================================================

# ── File 1: order_billing.py ─────────────────────────────────

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

        # ── FIXED: lock order status before reading item list ──
        try:
            table.update_item(
                Key={"orderId": orderId, "userId": userId},
                UpdateExpression='SET orderStatus = :locking',
                ConditionExpression='orderStatus < :locked',
                ExpressionAttributeValues={
                    ':locking': Decimal(115),   # billing-in-progress sentinel
                    ':locked':  Decimal(120)    # already paid — reject
                }
            )
        except Exception as e:
            # Another billing request already holds the lock
            return {"status": "err", "msg": "order is already being processed"}
        # ── END FIXED BLOCK ───────────────────────────────────

        # Now safe to read item list — order is locked at 115
        item_list = order.get("itemList", {})
        total     = calculate_total(item_list)

        # Process payment
        process_payment(data.get("ccn"), data.get("exp"), data.get("cvv"), total)

        # Finalize: move status from 115 to 120 (paid)
        table.update_item(
            Key={"orderId": orderId, "userId": userId},
            UpdateExpression='SET orderStatus = :paid, totalAmount = :total',
            ExpressionAttributeValues={':paid': Decimal(120), ':total': Decimal(total)}
        )

        return {"status": "ok", "amount": total}

    return {"status": "err", "msg": "order already processed"}


def calculate_total(item_list):
    total = 0
    for item_id, qty in item_list.items():
        price = get_price(item_id)
        total += price * qty
    return total


# ── File 2: update_order.py ──────────────────────────────────
# Location: Lambda → DVSA-ORDER-BILLING → update_order.py
#
# Change the orderStatus threshold from > 110 to >= 115
# so that updates are rejected while billing is in progress.

def update_order(event, context):

    orderId = event.get("orderId")
    userId  = event.get("userId")

    table    = boto3.resource('dynamodb').Table('DVSA-ORDERS-DB')
    response = table.get_item(Key={"orderId": orderId, "userId": userId})

    # ── BEFORE (vulnerable) ───────────────────────────────
    # if response["Item"]["orderStatus"] > 110:
    #     return {"status": "err", "msg": "order cannot be modified"}

    # ── AFTER (fixed) ─────────────────────────────────────
    if response["Item"]["orderStatus"] >= 115:
        return {"status": "err", "msg": "order cannot be modified during or after billing"}
    # ── END FIX ───────────────────────────────────────────

    # Apply update ...
    return {"status": "ok", "msg": "address updated"}
