"""
CrediLens — OTP & Security Token Service
Generates cryptographically secure 6-digit OTPs, hashes them using HMAC-SHA256,
verifies attempts, manages rate limits, and issues short-lived password reset tokens.
"""

import os
import hmac
import hashlib
import secrets
import time
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any, Tuple
from jose import jwt, JWTError
from dotenv import load_dotenv

load_dotenv()

SECRET_KEY = os.getenv("JWT_SECRET_KEY", "credilens-institutional-fintech-jwt-secret-2026")
RESET_TOKEN_EXPIRE_MINUTES = 15

def get_otp_expiry_minutes() -> int:
    try:
        return int(os.getenv("OTP_EXPIRY_MINUTES", "5").strip())
    except ValueError:
        return 5

def get_otp_resend_cooldown() -> int:
    try:
        return int(os.getenv("OTP_RESEND_COOLDOWN_SECONDS", "60").strip())
    except ValueError:
        return 60

def get_otp_max_attempts() -> int:
    try:
        return int(os.getenv("OTP_MAX_ATTEMPTS", "5").strip())
    except ValueError:
        return 5

def get_otp_max_resends() -> int:
    try:
        return int(os.getenv("OTP_MAX_RESENDS", "3").strip())
    except ValueError:
        return 3

def generate_secure_otp() -> str:
    """Generates a 6-digit cryptographically secure numeric OTP."""
    digits = "0123456789"
    return "".join(secrets.choice(digits) for _ in range(6))

def hash_otp(otp: str, email: str) -> str:
    """
    Hashes an OTP using HMAC-SHA256 with server SECRET_KEY and normalized email salt.
    Prevents plain-text OTP exposure in database.
    """
    salt = email.strip().lower()
    message = f"{salt}:{otp}".encode("utf-8")
    return hmac.new(SECRET_KEY.encode("utf-8"), message, hashlib.sha256).hexdigest()

def verify_otp_hash(input_otp: str, email: str, stored_hash: str) -> bool:
    """Verifies an OTP against a stored HMAC-SHA256 hash using constant-time comparison."""
    if not input_otp or len(input_otp.strip()) != 6:
        return False
    computed = hash_otp(input_otp.strip(), email)
    return hmac.compare_digest(computed, stored_hash)

def mask_email(email: str) -> str:
    """
    Partially masks an email address for safe frontend presentation.
    Example: 'adityrajkabra@gmail.com' -> 'a***a@gmail.com'
    """
    norm = email.strip().lower()
    if "@" not in norm:
        return norm
    parts = norm.split("@", 1)
    user = parts[0]
    domain = parts[1]
    if len(user) <= 1:
        masked_user = user + "*"
    elif len(user) == 2:
        masked_user = user[0] + "*"
    elif len(user) <= 4:
        masked_user = user[0] + "**" + user[-1]
    else:
        masked_user = user[0] + "***" + user[-1]
    return f"{masked_user}@{domain}"

def create_password_reset_token(user_id: str, email: str) -> str:
    """
    Generates a single-use, short-lived signed JWT authorization token for setting a new password.
    Valid for 15 minutes.
    """
    now = datetime.now(timezone.utc)
    expire = now + timedelta(minutes=RESET_TOKEN_EXPIRE_MINUTES)
    jti = secrets.token_hex(16)

    payload = {
        "sub": user_id,
        "email": email.strip().lower(),
        "purpose": "password_reset",
        "jti": jti,
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp()),
        "iss": "credilens.internal",
        "aud": "credilens-reset"
    }
    return jwt.encode(payload, SECRET_KEY, algorithm="HS256")

def decode_password_reset_token(token: str) -> Optional[Dict[str, Any]]:
    """Decodes and validates a password reset authorization token."""
    try:
        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=["HS256"],
            issuer="credilens.internal",
            audience="credilens-reset"
        )
        if payload.get("purpose") != "password_reset":
            return None
        return payload
    except JWTError:
        return None
