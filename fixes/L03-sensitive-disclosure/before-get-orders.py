# ============================================================
# BEFORE FIX — Lesson 3: Sensitive Information Disclosure (Vulnerable)
# Lambda: DVSA-ORDER-ORDERS → get-orders.py
# ============================================================
# VULNERABILITY: The orders API response includes the internal
# confirmationToken field in every order object. This token is
# used as part of the S3 receipt file path. Any authenticated
# user who calls the orders endpoint can extract the token and
# construct the exact S3 path to download any other user's
# private receipt file without authorization.
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

    # ── VULNERABLE: confirmationToken exposed to client ───
    for i in response['Items']:
        status = json.dumps(i['orderStatus'], cls=DecimalEncoder)
        item = {
            "order-id": i['orderId'],
            "date":     i['paymentTS'],
            "total":    i['totalAmount'],
            "status":   human_status[status],
            "token":    i["confirmationToken"]   # ← SHOULD NEVER BE RETURNED
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
                "status":   human_status[status],
                "token":    i["confirmationToken"]   # ← SHOULD NEVER BE RETURNED
            }
            orders.append(item)
    # ── END VULNERABLE BLOCK ──────────────────────────────

    return { "status": "ok", "orders": orders }


class DecimalEncoder(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, Decimal):
            return str(o)
        return super().default(o)
