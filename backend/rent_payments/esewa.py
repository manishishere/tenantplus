import base64
import hashlib
import hmac

from django.conf import settings


def generate_esewa_signature(total_amount, transaction_uuid, product_code):
    """
    Generate HMAC-SHA256 signature for eSewa v2 API.
    message = "total_amount=<amount>,transaction_uuid=<uuid>,
               product_code=<merchant_id>"
    signature = base64(hmac_sha256(secret_key, message))
    """
    secret_key = settings.ESEWA_SECRET_KEY
    message = (
        f"total_amount={total_amount},"
        f"transaction_uuid={transaction_uuid},"
        f"product_code={product_code}"
    )
    signature = base64.b64encode(
        hmac.new(
            secret_key.encode('utf-8'),
            message.encode('utf-8'),
            hashlib.sha256,
        ).digest()
    ).decode('utf-8')
    return signature


def verify_esewa_signature(data, received_signature):
    """
    Verify the signature returned by eSewa after payment.
    data must be a dict with total_amount, transaction_uuid,
    product_code.
    """
    expected = generate_esewa_signature(
        data['total_amount'],
        data['transaction_uuid'],
        data['product_code'],
    )
    return expected == received_signature
