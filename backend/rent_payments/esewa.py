import base64
import hashlib
import hmac


def generate_esewa_signature(secret_key, message):
    digest = hmac.new(
        secret_key.encode('utf-8'),
        message.encode('utf-8'),
        hashlib.sha256,
    ).digest()
    return base64.b64encode(digest).decode('utf-8')


def _build_signed_message(data_dict):
    signed_field_names = data_dict.get('signed_field_names', '')
    field_names = [field.strip() for field in signed_field_names.split(',') if field.strip()]
    message_parts = []
    for field_name in field_names:
        if field_name == 'signature':
            continue
        if field_name in data_dict:
            message_parts.append(f"{field_name}={data_dict[field_name]}")
    return ','.join(message_parts)


def verify_esewa_signature(secret_key, data_dict):
    expected_signature = generate_esewa_signature(secret_key, _build_signed_message(data_dict))
    return expected_signature == data_dict.get('signature', '')
