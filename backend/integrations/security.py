"""
CrediLens Financial Data Integration Hub — Security & Masking
Handles secret redaction, credential masking, and HMAC signature verification.
"""

import hmac
import hashlib
import uuid
from datetime import datetime, timezone
from typing import Dict, Any

SENSITIVE_KEY_PATTERNS = {
    "key_secret", "secret", "password", "token", "access_token",
    "refresh_token", "api_key", "app_password", "private_key",
    "authorization", "x-razorpay-signature", "credential"
}

def mask_credential(val: str, show_prefix: int = 4, show_suffix: int = 4) -> str:
    """Masks a secret string leaving a small prefix and suffix visible."""
    if not val:
        return ""
    val_clean = str(val).strip()
    prefix_len = show_prefix
    if val_clean.startswith("rzp_test_") or val_clean.startswith("rzp_live_"):
        prefix_len = 9
    if len(val_clean) <= (prefix_len + show_suffix):
        return "•" * len(val_clean)
    return f"{val_clean[:prefix_len]}{'•' * 8}{val_clean[-show_suffix:]}"

def redact_sensitive_dict(data: Any) -> Any:
    """Recursively redacts values for keys matching sensitive patterns."""
    if isinstance(data, dict):
        redacted = {}
        for k, v in data.items():
            k_lower = str(k).lower()
            if any(pattern in k_lower for pattern in SENSITIVE_KEY_PATTERNS):
                redacted[k] = "[REDACTED]"
            elif isinstance(v, (dict, list)):
                redacted[k] = redact_sensitive_dict(v)
            else:
                redacted[k] = v
        return redacted
    elif isinstance(data, list):
        return [redact_sensitive_dict(item) for item in data]
    return data

def verify_razorpay_webhook_signature(
    payload_body: bytes,
    signature: str,
    secret: str
) -> bool:
    """
    Verifies Razorpay webhook HMAC SHA-256 signature in timing-safe manner.
    """
    if not payload_body or not signature or not secret:
        return False
    try:
        expected_sig = hmac.new(
            key=secret.encode("utf-8"),
            msg=payload_body,
            digestmod=hashlib.sha256
        ).hexdigest()
        return hmac.compare_digest(expected_sig, signature.strip())
    except Exception:
        return False

def generate_batch_id(prefix: str = "batch") -> str:
    """Generates an ISO timestamped correlation batch ID."""
    ts = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    rand = uuid.uuid4().hex[:6]
    return f"{prefix}_{ts}_{rand}"
