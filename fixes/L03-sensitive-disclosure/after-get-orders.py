# ============================================================
# AFTER FIX — Lesson 3: Sensitive Information Disclosure (Fixed)
# Lambda: DVSA-ORDER-ORDERS → get-orders.py
# ============================================================
# FIX: Removed the "token": i["confirmationToken"] field from
# BOTH loops in the response builder. The internal receipt
# token is no longer returned to the client. The orders API
# now returns only: order-id, date, total, and status.
# Receipt access must go through a separate authorized endpoint
# that verifies the requesting user owns the order.
# ============================================================

import json
import boto3
from boto3.dynamodb.conditions import Attr
from decimal import Decimal

def lambda_handler(event, context):

    userId = event.get("userId")
    table  = boto3.resource('dynamodb').Table('DVSA-ORDERS-DB')

    human_status = {
        "100": "processed",
        "110": "shipped",
        "120": "delivered",
    }

    orders = []

    response = table.scan(
        FilterExpression=Attr("userId").eq(userId)
    )

    # ── FIXED: confirmationToken removed from response ────
    for i in response['Items']:
        status = json.dumps(i['orderStatus'], cls=DecimalEncoder)
        item = {
            "order-id": i['orderId'],
            "date":     i['paymentTS'],
            "total":    i['totalAmount'],
            "status":   human_status[status]
            # "token": i["confirmationToken"]  ← REMOVED
        }
        orders.append(item)

    while 'LastEvaluatedKey' in response:
        response = table.scan(
            FilterExpression=Attr("userId").eq(userId)
        )
        for i in response['Items']:
            status = json.dumps(i['orderStatus'], cls=DecimalEncoder)
            item = {
                "order-id": i['orderId'],
                "date":     i['paymentTS'],
                "total":    i['totalAmount'],
                "status":   human_status[status]
                # "token": i["confirmationToken"]  ← REMOVED
            }
            orders.append(item)
    # ── END FIXED BLOCK ───────────────────────────────────

    return { "status": "ok", "orders": orders }


class DecimalEncoder(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, Decimal):
            return str(o)
        return super().default(o)
