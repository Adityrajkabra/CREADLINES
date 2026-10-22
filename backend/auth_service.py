"""
CrediLens — Authentication Service
Handles password hashing (bcrypt), JWT tokens (python-jose), email validation,
and session validation.
"""

import os
import re
import time
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any, Tuple
import bcrypt
from jose import jwt, JWTError

# Configuration
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "credilens-institutional-fintech-jwt-secret-2026")
JWT_ALGORITHM = "HS256"
DEFAULT_ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours
REMEMBER_ME_EXPIRE_MINUTES = 60 * 24 * 7       # 7 days

# In-memory abuse protection (rate limiting failed logins)
# { ip_or_email: [(timestamp), ...] }
_FAILED_ATTEMPTS: Dict[str, list] = {}
MAX_FAILED_ATTEMPTS = 5
LOCKOUT_SECONDS = 300  # 5 minutes

def hash_password(password: str) -> str:
    """Hashes a plaintext password using bcrypt with 12 rounds of salt."""
    salt = bcrypt.gensalt(rounds=12)
    # Truncate to 72 bytes if needed per bcrypt specification
    encoded = password.encode("utf-8")[:72]
    return bcrypt.hashpw(encoded, salt).decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a plaintext password against a bcrypt hash."""
    try:
        encoded = plain_password.encode("utf-8")[:72]
        return bcrypt.checkpw(encoded, hashed_password.encode("utf-8"))
    except Exception:
        return False

def validate_email_format(email: str) -> bool:
    """Validates that email follows institutional format."""
    if not email or len(email) < 5 or len(email) > 255:
        return False
    # Standard RFC-compliant email regex
    pattern = r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$"
    return bool(re.match(pattern, email.strip()))

def validate_password_strength(password: str) -> Tuple[bool, Optional[str]]:
    """
    Validates institutional password policy:
    - Minimum 8 characters
    - At least 1 letter
    - At least 1 number or special character
    """
    if len(password) < 8:
        return False, "Password must be at least 8 characters long."
    if not re.search(r"[A-Za-z]", password):
        return False, "Password must contain at least one letter."
    if not re.search(r"[\d\W_]", password):
        return False, "Password must contain at least one number or special character."
    return True, None

def create_jwt_token(user_id: str, email: str, remember_me: bool = False) -> str:
    """Generates a signed JWT session token with expiration and user claims."""
    expire_minutes = REMEMBER_ME_EXPIRE_MINUTES if remember_me else DEFAULT_ACCESS_TOKEN_EXPIRE_MINUTES
    now = datetime.now(timezone.utc)
    expire = now + timedelta(minutes=expire_minutes)

    payload = {
        "sub": user_id,
        "email": email.strip().lower(),
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp()),
        "iss": "credilens.internal",
        "aud": "credilens-underwriters"
    }
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)

def decode_jwt_token(token: str) -> Optional[Dict[str, Any]]:
    """Decodes and validates JWT signature, expiration, and claims."""
    try:
        payload = jwt.decode(
            token,
            JWT_SECRET_KEY,
            algorithms=[JWT_ALGORITHM],
            issuer="credilens.internal",
            audience="credilens-underwriters"
        )
        return payload
    except JWTError:
        return None

def check_login_rate_limit(key: str) -> Tuple[bool, int]:
    """
    Checks if an IP or email is temporarily locked out due to excessive failed attempts.
    Returns (is_allowed, remaining_seconds).
    """
    now = time.time()
    attempts = _FAILED_ATTEMPTS.get(key, [])
    # Filter attempts within lockout window
    recent = [t for t in attempts if now - t < LOCKOUT_SECONDS]
    _FAILED_ATTEMPTS[key] = recent

    if len(recent) >= MAX_FAILED_ATTEMPTS:
        oldest = recent[0]
        remaining = int(LOCKOUT_SECONDS - (now - oldest))
        return False, max(1, remaining)
    return True, 0

def record_failed_login(key: str):
    """Records a failed login attempt for brute-force tracking."""
    now = time.time()
    if key not in _FAILED_ATTEMPTS:
        _FAILED_ATTEMPTS[key] = []
    _FAILED_ATTEMPTS[key].append(now)

def clear_failed_logins(key: str):
    """Clears failed login attempts after successful authentication."""
    if key in _FAILED_ATTEMPTS:
        del _FAILED_ATTEMPTS[key]

def sanitize_user(user: Dict[str, Any]) -> Dict[str, Any]:
    """Removes sensitive password hashes before returning user info."""
    return {
        "user_id": user.get("user_id"),
        "email": user.get("email"),
        "full_name": user.get("full_name"),
        "organization": user.get("organization"),
        "account_status": user.get("account_status", "active"),
        "created_at": user.get("created_at")
    }
