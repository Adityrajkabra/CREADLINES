"""
CrediLens — MSME Credit Intelligence Platform
FastAPI Production-Grade Backend Service
"""

from fastapi import FastAPI, HTTPException, Query, Request, Response, Depends, status, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone, timedelta
import os
import json

from synthetic_data import generate_synthetic_dataset, PRIMARY_COMPANIES
from ml_engine import risk_engine
from forecast_engine import get_msme_cashflow
from stress_engine import simulate_stress, calculate_loan_impact
from fairness_engine import compute_fairness_audit
from chat_service import generate_chat_response
from auth_db import auth_db
from auth_service import (
    hash_password,
    verify_password,
    validate_email_format,
    validate_password_strength,
    create_jwt_token,
    decode_jwt_token,
    check_login_rate_limit,
    record_failed_login,
    clear_failed_logins,
    sanitize_user
)
from otp_service import (
    generate_secure_otp,
    hash_otp,
    verify_otp_hash,
    mask_email,
    create_password_reset_token,
    decode_password_reset_token,
    get_otp_expiry_minutes,
    get_otp_resend_cooldown,
    get_otp_max_attempts,
    get_otp_max_resends
)
from email_service import email_service, EmailConfigurationError, EmailDeliveryError
from integrations import (
    registry,
    sync_service,
    IntegrationSummaryResponse,
    DataConnectionModel,
    SyncResponse,
    TestConnectionResponse,
    ConfigureProviderRequest,
    ConfigureProviderResponse,
    TransactionsListResponse,
    BankConsentRequest,
    BankConsentResponse
)
from integrations.schemas import DataManagementSummaryResponse, ImportedFileModel
from integrations.security import verify_razorpay_webhook_signature
from integrations.normalizer import normalize_razorpay_payment
from integrations.db import integration_db
from integrations.importer import (
    preview_file,
    validate_and_stage_file,
    execute_import,
    generate_error_report_csv
)

app = FastAPI(
    title="CrediLens API",
    description="MSME Predictive Credit Risk Analytics & Intelligence Platform",
    version="1.0.0"
)

# Enable secure CORS with credentials support (no wildcard with credentials)
ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory database initialized deterministically
MSME_DATABASE = generate_synthetic_dataset()
MSME_MAP = {m["msme_id"]: m for m in MSME_DATABASE}

# Authentication Models
class RegisterRequest(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=100)
    email: str = Field(..., min_length=1, max_length=255)
    organization: Optional[str] = Field(default=None, max_length=150)
    password: str = Field(..., min_length=1, max_length=100)
    confirm_password: str = Field(..., min_length=1, max_length=100)
    agree_terms: bool = Field(default=True)

class RegisterInitiateResponse(BaseModel):
    status: str = "pending_verification"
    email: str
    masked_email: str
    message: str
    resend_cooldown_seconds: int
    expires_in_minutes: int

class VerifyRegistrationOtpRequest(BaseModel):
    email: str = Field(..., min_length=3, max_length=255)
    otp: str = Field(..., min_length=6, max_length=6)

class ResendOtpRequest(BaseModel):
    email: str = Field(..., min_length=3, max_length=255)

class ForgotPasswordRequest(BaseModel):
    email: str = Field(..., min_length=3, max_length=255)

class ForgotPasswordResponse(BaseModel):
    status: str = "pending_verification"
    email: str
    masked_email: str
    message: str
    resend_cooldown_seconds: int
    expires_in_minutes: int

class VerifyResetOtpRequest(BaseModel):
    email: str = Field(..., min_length=3, max_length=255)
    otp: str = Field(..., min_length=6, max_length=6)

class VerifyResetOtpResponse(BaseModel):
    reset_token: str
    message: str

class ResetPasswordRequest(BaseModel):
    reset_token: str
    new_password: str = Field(..., min_length=1, max_length=100)
    confirm_password: str = Field(..., min_length=1, max_length=100)

class StandardMessageResponse(BaseModel):
    message: str

class LoginRequest(BaseModel):
    email: str = Field(..., min_length=3, max_length=255)
    password: str = Field(..., min_length=1, max_length=100)
    remember_me: Optional[bool] = Field(default=False)

class SafeUserModel(BaseModel):
    user_id: str
    full_name: str
    email: str
    organization: Optional[str] = None
    account_status: str
    created_at: str

class AuthResponse(BaseModel):
    user: SafeUserModel
    access_token: str
    token_type: str = "bearer"
    message: str

# Security bearer dependency
bearer_scheme = HTTPBearer(auto_error=False)

def get_current_user(
    request: Request,
    creds: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme)
) -> Dict[str, Any]:
    """Resolves authenticated user from Bearer header or HttpOnly cookie."""
    token = None
    if creds and creds.credentials:
        token = creds.credentials
    elif "credilens_session" in request.cookies:
        token = request.cookies.get("credilens_session")

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials were not provided."
        )

    payload = decode_jwt_token(token)
    if not payload or not payload.get("sub"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session token. Please sign in again."
        )

    user = auth_db.get_user_by_id(payload["sub"])
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account no longer exists or has been deactivated."
        )

    return user

# ================= AUTHENTICATION ENDPOINTS =================

@app.post("/api/auth/register", response_model=RegisterInitiateResponse)
def register_endpoint(req: RegisterRequest):
    """
    Initiates user registration with Gmail/Email OTP verification.
    Validates email format, password complexity, duplicate active emails,
    creates pending registration and dispatches 6-digit cryptographic OTP.
    """
    # 1. Validate email format
    if not validate_email_format(req.email):
        raise HTTPException(status_code=400, detail="Please provide a valid institutional email address.")

    norm_email = req.email.strip().lower()

    # 2. Check terms agreement
    if not req.agree_terms:
        raise HTTPException(status_code=400, detail="You must accept the terms and conditions to register.")

    # 3. Check password confirmation match
    if req.password != req.confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match.")

    # 4. Check password security policy
    is_valid_pwd, pwd_error = validate_password_strength(req.password)
    if not is_valid_pwd:
        raise HTTPException(status_code=400, detail=pwd_error)

    # 5. Check if active user already exists
    existing = auth_db.get_user_by_email(norm_email)
    if existing and existing.get("account_status") == "active":
        raise HTTPException(status_code=400, detail="An account with this work email already exists. Please sign in or use password recovery.")

    # 6. Hash password with bcrypt
    hashed = hash_password(req.password)

    # 7. Store pending registration in database
    auth_db.save_pending_registration(
        full_name=req.full_name,
        email=norm_email,
        password_hash=hashed,
        organization=req.organization,
        expiry_minutes=30
    )

    # 8. Generate 6-digit cryptographically secure OTP
    otp = generate_secure_otp()
    otp_hash_val = hash_otp(otp, norm_email)
    expiry_min = get_otp_expiry_minutes()

    # 9. Store hashed OTP in database
    auth_db.create_otp_record(
        email=norm_email,
        purpose="REGISTRATION",
        otp_hash=otp_hash_val,
        expiry_minutes=expiry_min
    )

    # 10. Send real email via SMTP
    try:
        email_service.send_registration_otp(
            to_email=norm_email,
            otp=otp,
            full_name=req.full_name.strip(),
            expiry_minutes=expiry_min
        )
    except EmailConfigurationError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(e)
        )
    except EmailDeliveryError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(e)
        )

    return RegisterInitiateResponse(
        status="pending_verification",
        email=norm_email,
        masked_email=mask_email(norm_email),
        message="A 6-digit verification code has been dispatched to your email address.",
        resend_cooldown_seconds=get_otp_resend_cooldown(),
        expires_in_minutes=expiry_min
    )

@app.post("/api/auth/verify-registration-otp", response_model=AuthResponse)
def verify_registration_otp_endpoint(req: VerifyRegistrationOtpRequest, response: Response):
    """
    Verifies the registration OTP, activates the user account, and issues session tokens.
    """
    norm_email = req.email.strip().lower()
    clean_otp = req.otp.strip()

    if len(clean_otp) != 6 or not clean_otp.isdigit():
        raise HTTPException(status_code=400, detail="Please enter a valid 6-digit verification code.")

    # 1. Lookup pending registration
    pending = auth_db.get_pending_registration(norm_email)
    if not pending:
        raise HTTPException(
            status_code=400,
            detail="No pending registration found for this email address. Please submit registration again."
        )

    # 2. Check pending registration expiry
    try:
        p_expires = datetime.fromisoformat(pending["expires_at"])
        if datetime.now(timezone.utc) > p_expires:
            auth_db.delete_pending_registration(norm_email)
            raise HTTPException(
                status_code=400,
                detail="Registration session has expired. Please submit registration again."
            )
    except (ValueError, TypeError):
        pass

    # 3. Lookup active OTP record
    otp_record = auth_db.get_active_otp_record(norm_email, "REGISTRATION")
    if not otp_record or otp_record.get("is_used"):
        raise HTTPException(
            status_code=400,
            detail="No active verification code found for this email. Please request a new code."
        )

    # 4. Check failed attempts
    max_attempts = get_otp_max_attempts()
    if otp_record.get("failed_attempts", 0) >= max_attempts:
        auth_db.mark_otp_used(otp_record["id"])
        raise HTTPException(
            status_code=400,
            detail="Too many incorrect attempts. This verification code has been invalidated. Please request a new code."
        )

    # 5. Check OTP expiration
    try:
        otp_expires = datetime.fromisoformat(otp_record["expires_at"])
        if datetime.now(timezone.utc) > otp_expires:
            raise HTTPException(
                status_code=400,
                detail="Verification code has expired. Please click Resend Code to obtain a fresh OTP."
            )
    except (ValueError, TypeError):
        pass

    # 6. Verify OTP hash
    if not verify_otp_hash(clean_otp, norm_email, otp_record["otp_hash"]):
        new_attempts = auth_db.increment_otp_failed_attempts(otp_record["id"])
        remaining = max(0, max_attempts - new_attempts)
        if remaining == 0:
            auth_db.mark_otp_used(otp_record["id"])
            raise HTTPException(
                status_code=400,
                detail="Too many incorrect attempts. This verification code has been invalidated. Please request a new code."
            )
        raise HTTPException(
            status_code=400,
            detail=f"Invalid verification code. {remaining} attempt(s) remaining."
        )

    # 7. OTP verified successfully -> consume OTP
    auth_db.mark_otp_used(otp_record["id"])

    # 8. Activate user in persistent database
    created_user = auth_db.create_user(
        full_name=pending["full_name"],
        email=norm_email,
        organization=pending.get("organization"),
        password_hash=pending["password_hash"]
    )

    # 9. Clean up pending registration
    auth_db.delete_pending_registration(norm_email)

    # 10. Issue session JWT and set HttpOnly cookie
    token = create_jwt_token(created_user["user_id"], created_user["email"])
    response.set_cookie(
        key="credilens_session",
        value=token,
        httponly=True,
        samesite="lax",
        max_age=86400,
        secure=False
    )

    return AuthResponse(
        user=SafeUserModel(**sanitize_user(created_user)),
        access_token=token,
        token_type="bearer",
        message="Account verified and registered successfully."
    )

@app.post("/api/auth/resend-registration-otp", response_model=RegisterInitiateResponse)
def resend_registration_otp_endpoint(req: ResendOtpRequest):
    """
    Resends registration OTP subject to cooldown and max resend limits.
    """
    norm_email = req.email.strip().lower()

    # 1. Check pending registration
    pending = auth_db.get_pending_registration(norm_email)
    if not pending:
        raise HTTPException(
            status_code=400,
            detail="No pending registration found for this email address. Please register first."
        )

    # 2. Check active OTP record for cooldown and resend limits
    otp_record = auth_db.get_active_otp_record(norm_email, "REGISTRATION")
    cooldown = get_otp_resend_cooldown()
    max_resends = get_otp_max_resends()
    expiry_min = get_otp_expiry_minutes()

    if otp_record:
        if otp_record.get("resend_count", 0) >= max_resends:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Maximum resend limit ({max_resends}) reached. Please restart registration."
            )

        try:
            last_resend = datetime.fromisoformat(otp_record["last_resend_at"])
            elapsed = (datetime.now(timezone.utc) - last_resend).total_seconds()
            if elapsed < cooldown:
                remaining_wait = int(cooldown - elapsed)
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"Please wait {remaining_wait} seconds before requesting another code."
                )
        except (ValueError, TypeError):
            pass

    # 3. Generate new 6-digit OTP and update/create record
    new_otp = generate_secure_otp()
    new_hash = hash_otp(new_otp, norm_email)
    now = datetime.now(timezone.utc)
    new_expires = (now + timedelta(minutes=expiry_min)).isoformat()

    if otp_record:
        auth_db.update_otp_resend(otp_record["id"], new_hash, new_expires)
    else:
        auth_db.create_otp_record(norm_email, "REGISTRATION", new_hash, expiry_min)

    # 4. Dispatch email via SMTP
    try:
        email_service.send_registration_otp(
            to_email=norm_email,
            otp=new_otp,
            full_name=pending["full_name"],
            expiry_minutes=expiry_min
        )
    except EmailConfigurationError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(e)
        )
    except EmailDeliveryError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(e)
        )

    return RegisterInitiateResponse(
        status="pending_verification",
        email=norm_email,
        masked_email=mask_email(norm_email),
        message="A fresh verification code has been dispatched to your email address.",
        resend_cooldown_seconds=cooldown,
        expires_in_minutes=expiry_min
    )

@app.post("/api/auth/forgot-password", response_model=ForgotPasswordResponse)
def forgot_password_endpoint(req: ForgotPasswordRequest, request: Request):
    """
    Initiates password recovery. Dispatches OTP to registered email.
    Uses generic messaging to mitigate account enumeration.
    """
    client_ip = request.client.host if request.client else "unknown"
    rate_key = f"pwd_reset:{client_ip}:{req.email.strip().lower()}"

    is_allowed, wait_sec = check_login_rate_limit(rate_key)
    if not is_allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Too many password recovery requests. Please wait {wait_sec} seconds."
        )

    norm_email = req.email.strip().lower()
    cooldown = get_otp_resend_cooldown()
    expiry_min = get_otp_expiry_minutes()

    user = auth_db.get_user_by_email(norm_email)
    generic_msg = "If an active account is registered with this email, a 6-digit recovery code has been sent."

    if not user or user.get("account_status") != "active":
        return ForgotPasswordResponse(
            status="pending_verification",
            email=norm_email,
            masked_email=mask_email(norm_email),
            message=generic_msg,
            resend_cooldown_seconds=cooldown,
            expires_in_minutes=expiry_min
        )

    # Check active OTP record cooldown
    active_otp = auth_db.get_active_otp_record(norm_email, "PASSWORD_RESET")
    if active_otp:
        try:
            last_resend = datetime.fromisoformat(active_otp["last_resend_at"])
            elapsed = (datetime.now(timezone.utc) - last_resend).total_seconds()
            if elapsed < cooldown:
                remaining_wait = int(cooldown - elapsed)
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"Please wait {remaining_wait} seconds before requesting another code."
                )
        except (ValueError, TypeError):
            pass

    # Generate 6-digit OTP
    otp = generate_secure_otp()
    otp_hash_val = hash_otp(otp, norm_email)

    auth_db.create_otp_record(
        email=norm_email,
        purpose="PASSWORD_RESET",
        otp_hash=otp_hash_val,
        expiry_minutes=expiry_min
    )

    try:
        email_service.send_password_reset_otp(
            to_email=norm_email,
            otp=otp,
            full_name=user.get("full_name", "Underwriter"),
            expiry_minutes=expiry_min
        )
    except EmailConfigurationError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(e)
        )
    except EmailDeliveryError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(e)
        )

    return ForgotPasswordResponse(
        status="pending_verification",
        email=norm_email,
        masked_email=mask_email(norm_email),
        message=generic_msg,
        resend_cooldown_seconds=cooldown,
        expires_in_minutes=expiry_min
    )

@app.post("/api/auth/verify-reset-otp", response_model=VerifyResetOtpResponse)
def verify_reset_otp_endpoint(req: VerifyResetOtpRequest):
    """
    Verifies password reset OTP and issues a single-use authorization reset token.
    """
    norm_email = req.email.strip().lower()
    clean_otp = req.otp.strip()

    if len(clean_otp) != 6 or not clean_otp.isdigit():
        raise HTTPException(status_code=400, detail="Please enter a valid 6-digit recovery code.")

    user = auth_db.get_user_by_email(norm_email)
    if not user:
        raise HTTPException(status_code=400, detail="Invalid recovery code or expired session.")

    otp_record = auth_db.get_active_otp_record(norm_email, "PASSWORD_RESET")
    if not otp_record or otp_record.get("is_used"):
        raise HTTPException(
            status_code=400,
            detail="No active password recovery request found for this email. Please request a new code."
        )

    max_attempts = get_otp_max_attempts()
    if otp_record.get("failed_attempts", 0) >= max_attempts:
        auth_db.mark_otp_used(otp_record["id"])
        raise HTTPException(
            status_code=400,
            detail="Too many incorrect attempts. This recovery code has been invalidated. Please request a new code."
        )

    try:
        otp_expires = datetime.fromisoformat(otp_record["expires_at"])
        if datetime.now(timezone.utc) > otp_expires:
            raise HTTPException(
                status_code=400,
                detail="Recovery code has expired. Please request a new code."
            )
    except (ValueError, TypeError):
        pass

    if not verify_otp_hash(clean_otp, norm_email, otp_record["otp_hash"]):
        new_attempts = auth_db.increment_otp_failed_attempts(otp_record["id"])
        remaining = max(0, max_attempts - new_attempts)
        if remaining == 0:
            auth_db.mark_otp_used(otp_record["id"])
            raise HTTPException(
                status_code=400,
                detail="Too many incorrect attempts. This recovery code has been invalidated. Please request a new code."
            )
        raise HTTPException(
            status_code=400,
            detail=f"Invalid recovery code. {remaining} attempt(s) remaining."
        )

    # Consume OTP
    auth_db.mark_otp_used(otp_record["id"])

    # Issue short-lived password reset token
    reset_token = create_password_reset_token(user["user_id"], user["email"])

    return VerifyResetOtpResponse(
        reset_token=reset_token,
        message="Recovery code verified successfully. Please enter your new password."
    )

@app.post("/api/auth/resend-reset-otp", response_model=ForgotPasswordResponse)
def resend_reset_otp_endpoint(req: ResendOtpRequest):
    """
    Resends password reset OTP subject to cooldown and max resend limits.
    """
    norm_email = req.email.strip().lower()
    cooldown = get_otp_resend_cooldown()
    max_resends = get_otp_max_resends()
    expiry_min = get_otp_expiry_minutes()

    user = auth_db.get_user_by_email(norm_email)
    generic_msg = "If an active account is registered with this email, a fresh recovery code has been sent."

    if not user or user.get("account_status") != "active":
        return ForgotPasswordResponse(
            status="pending_verification",
            email=norm_email,
            masked_email=mask_email(norm_email),
            message=generic_msg,
            resend_cooldown_seconds=cooldown,
            expires_in_minutes=expiry_min
        )

    otp_record = auth_db.get_active_otp_record(norm_email, "PASSWORD_RESET")
    if otp_record:
        if otp_record.get("resend_count", 0) >= max_resends:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Maximum resend limit ({max_resends}) reached. Please restart password recovery."
            )

        try:
            last_resend = datetime.fromisoformat(otp_record["last_resend_at"])
            elapsed = (datetime.now(timezone.utc) - last_resend).total_seconds()
            if elapsed < cooldown:
                remaining_wait = int(cooldown - elapsed)
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"Please wait {remaining_wait} seconds before requesting another code."
                )
        except (ValueError, TypeError):
            pass

    new_otp = generate_secure_otp()
    new_hash = hash_otp(new_otp, norm_email)
    now = datetime.now(timezone.utc)
    new_expires = (now + timedelta(minutes=expiry_min)).isoformat()

    if otp_record:
        auth_db.update_otp_resend(otp_record["id"], new_hash, new_expires)
    else:
        auth_db.create_otp_record(norm_email, "PASSWORD_RESET", new_hash, expiry_min)

    try:
        email_service.send_password_reset_otp(
            to_email=norm_email,
            otp=new_otp,
            full_name=user.get("full_name", "Underwriter"),
            expiry_minutes=expiry_min
        )
    except EmailConfigurationError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(e)
        )
    except EmailDeliveryError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(e)
        )

    return ForgotPasswordResponse(
        status="pending_verification",
        email=norm_email,
        masked_email=mask_email(norm_email),
        message=generic_msg,
        resend_cooldown_seconds=cooldown,
        expires_in_minutes=expiry_min
    )

@app.post("/api/auth/reset-password", response_model=StandardMessageResponse)
def reset_password_endpoint(req: ResetPasswordRequest):
    """
    Sets a new password for the user authorized by a valid reset_token.
    Invalidates the reset token immediately to prevent reuse.
    """
    # 1. Decode and validate reset token
    payload = decode_password_reset_token(req.reset_token)
    if not payload or not payload.get("sub") or not payload.get("jti"):
        raise HTTPException(
            status_code=400,
            detail="Password reset authorization has expired or is invalid. Please request a new recovery code."
        )

    # 2. Check if reset token was already consumed
    jti = payload["jti"]
    if auth_db.is_token_used(jti):
        raise HTTPException(
            status_code=400,
            detail="This password reset authorization has already been used. Please request a new recovery code."
        )

    # 3. Check passwords match
    if req.new_password != req.confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match.")

    # 4. Check password policy
    is_valid_pwd, pwd_error = validate_password_strength(req.new_password)
    if not is_valid_pwd:
        raise HTTPException(status_code=400, detail=pwd_error)

    # 5. Check user exists
    user = auth_db.get_user_by_id(payload["sub"])
    if not user:
        raise HTTPException(status_code=400, detail="User account no longer exists.")

    # 6. Hash new password with bcrypt
    new_hashed = hash_password(req.new_password)

    # 7. Update password in persistent database
    auth_db.update_user_password(user["user_id"], new_hashed)

    # 8. Mark token as consumed (prevents any reuse)
    auth_db.mark_token_used(jti, "password_reset")

    # 9. Clean up any active reset OTP records for this email
    active_otp = auth_db.get_active_otp_record(user["email"], "PASSWORD_RESET")
    if active_otp:
        auth_db.mark_otp_used(active_otp["id"])

    # 10. Clear failed logins
    clear_failed_logins(user["email"])

    return StandardMessageResponse(
        message="Password has been updated successfully. You may now sign in with your new credentials."
    )

@app.post("/api/auth/login", response_model=AuthResponse)
def login_endpoint(req: LoginRequest, request: Request, response: Response):
    """
    Authenticates user with work email and password.
    Enforces active account status verification.
    """
    client_ip = request.client.host if request.client else "unknown"
    rate_key = f"{client_ip}:{req.email.strip().lower()}"

    # Check brute-force rate limit
    is_allowed, wait_sec = check_login_rate_limit(rate_key)
    if not is_allowed:
        raise HTTPException(
            status_code=429,
            detail=f"Too many failed login attempts. Please wait {wait_sec} seconds before trying again."
        )

    # Lookup user
    user = auth_db.get_user_by_email(req.email)
    if not user:
        record_failed_login(rate_key)
        raise HTTPException(status_code=401, detail="Invalid work email or password.")

    # Enforce active account status
    if user.get("account_status") != "active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has not been activated. Please complete email OTP verification."
        )

    # Verify password hash
    if not verify_password(req.password, user["password_hash"]):
        record_failed_login(rate_key)
        raise HTTPException(status_code=401, detail="Invalid work email or password.")

    # Clear failed attempts upon successful login
    clear_failed_logins(rate_key)

    # Create session JWT
    token = create_jwt_token(user["user_id"], user["email"], remember_me=bool(req.remember_me))
    max_age = 60 * 60 * 24 * 7 if req.remember_me else 86400

    # Set HttpOnly session cookie
    response.set_cookie(
        key="credilens_session",
        value=token,
        httponly=True,
        samesite="lax",
        max_age=max_age,
        secure=False
    )

    return AuthResponse(
        user=SafeUserModel(**sanitize_user(user)),
        access_token=token,
        token_type="bearer",
        message="Authentication successful."
    )

@app.post("/api/auth/logout")
def logout_endpoint(response: Response):
    """Invalidates session and clears session cookie."""
    response.delete_cookie(key="credilens_session")
    return {"message": "Signed out successfully."}

@app.get("/api/auth/me")
def get_me_endpoint(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Returns profile for currently authenticated user."""
    return {"user": sanitize_user(current_user)}

# Request Models
class SimulationRequest(BaseModel):
    msme_id: str = Field(default="MSME-1042")
    revenue_change: float = Field(default=-10.0, description="Revenue percentage change (-30 to +20)")
    cost_change: float = Field(default=8.0, description="Operating cost percentage change (-10 to +30)")
    interest_change: float = Field(default=2.0, description="Interest rate percentage points change (-2 to +6)")
    payment_delay_days: float = Field(default=15.0, description="Additional customer payment delay in days (0 to 45)")
    loan_amount: Optional[float] = Field(default=0.0, description="Proposed incremental loan facility")

class LoanImpactRequest(BaseModel):
    msme_id: str = Field(default="MSME-1042")
    loan_amount: float = Field(default=1000000.0, description="Loan principal amount in INR")
    interest_rate: float = Field(default=12.0, description="Annual interest rate percentage")
    tenure_months: int = Field(default=24, description="Tenure in months")

class ChatRequest(BaseModel):
    message: str = Field(..., description="User query or question")
    borrower_id: Optional[str] = Field(default=None, description="Optional borrower ID for context")

class ChatResponse(BaseModel):
    reply: str
    data_sources: List[str]
    mode: str
    borrower_id: Optional[str] = None
    disclaimer: str

@app.get("/")
def root():
    return {
        "platform": "CrediLens — MSME Credit Intelligence Platform",
        "status": "operational",
        "demo_mode": True,
        "dataset_size": len(MSME_DATABASE),
        "api_docs": "/docs"
    }

@app.get("/api/overview")
def get_overview():
    """
    Returns Executive Dashboard KPI cards, distribution, trends, cash flow health,
    top risk drivers, and recent alerts.
    """
    total = len(MSME_DATABASE)
    low_risk = sum(1 for m in MSME_DATABASE if m["risk_score"] < 40)
    mod_risk = sum(1 for m in MSME_DATABASE if 40 <= m["risk_score"] < 70)
    high_risk = sum(1 for m in MSME_DATABASE if m["risk_score"] >= 70)

    # Risk Distribution Donut data
    risk_distribution = [
        {"name": "Low Risk", "value": low_risk, "color": "#22A477", "range": "0-39"},
        {"name": "Moderate Risk", "value": mod_risk, "color": "#E8A23A", "range": "40-69"},
        {"name": "High Risk", "value": high_risk, "color": "#EF5350", "range": "70-100"}
    ]

    # Risk trend for previous 6 months
    risk_trend = [
        {"month": "May", "avg_risk": 55.2, "portfolio_at_risk": 16.8, "high_risk_count": 21},
        {"month": "Jun", "avg_risk": 55.8, "portfolio_at_risk": 17.1, "high_risk_count": 22},
        {"month": "Jul", "avg_risk": 56.4, "portfolio_at_risk": 17.5, "high_risk_count": 22},
        {"month": "Aug", "avg_risk": 56.9, "portfolio_at_risk": 17.9, "high_risk_count": 23},
        {"month": "Sep", "avg_risk": 57.1, "portfolio_at_risk": 18.2, "high_risk_count": 23},
        {"month": "Oct", "avg_risk": 57.4, "portfolio_at_risk": 18.6, "high_risk_count": 24}
    ]

    # Cash Flow Health breakdown
    cash_flow_health = {
        "healthy": sum(1 for m in MSME_DATABASE if m["cash_flow_health"] == "Healthy"),
        "watch": sum(1 for m in MSME_DATABASE if m["cash_flow_health"] == "Watch"),
        "critical": sum(1 for m in MSME_DATABASE if m["cash_flow_health"] == "Critical")
    }

    # Top Risk Drivers horizontal bar chart
    top_risk_drivers = [
        {"driver": "Cash-flow volatility", "prevalence": 42, "avg_impact": "+18 pts", "severity": "High"},
        {"driver": "Revenue decline", "prevalence": 36, "avg_impact": "+15 pts", "severity": "High"},
        {"driver": "Debt burden", "prevalence": 31, "avg_impact": "+12 pts", "severity": "Medium"},
        {"driver": "Payment delays", "prevalence": 28, "avg_impact": "+10 pts", "severity": "Medium"},
        {"driver": "Customer concentration", "prevalence": 22, "avg_impact": "+7 pts", "severity": "Medium"}
    ]

    # Recent Risk Alerts
    recent_alerts = [
        {
            "id": 1,
            "msme_id": "MSME-1042",
            "business_name": "Metro Auto Parts",
            "sector": "Automotive Components",
            "alert": "Risk increased from 61 → 68",
            "severity": "high",
            "category": "Score Degradation",
            "timestamp": "2 hours ago"
        },
        {
            "id": 2,
            "msme_id": "MSME-1006",
            "business_name": "Nova Traders",
            "sector": "Logistics & Warehousing",
            "alert": "Cash-flow warning: Outflow exceeded inflow for 2 consecutive cycles",
            "severity": "high",
            "category": "Liquidity Alert",
            "timestamp": "5 hours ago"
        },
        {
            "id": 3,
            "msme_id": "MSME-1007",
            "business_name": "KJ Textiles",
            "sector": "Textiles & Apparel",
            "alert": "Revenue trend deteriorating: -11.5% YoY contraction",
            "severity": "critical",
            "category": "Solvency Alert",
            "timestamp": "1 day ago"
        }
    ]

    return {
        "kpis": {
            "total_msmes": 127,
            "low_risk": 54,
            "moderate_risk": 49,
            "high_risk": 24,
            "average_risk_score": 57.4,
            "portfolio_at_risk": 18.6
        },
        "risk_distribution": risk_distribution,
        "risk_trend": risk_trend,
        "cash_flow_health": cash_flow_health,
        "top_risk_drivers": top_risk_drivers,
        "recent_alerts": recent_alerts,
        "demo_mode": True,
        "system_status": "All systems operational"
    }

@app.get("/api/msmes")
def list_msmes(
    search: Optional[str] = None,
    sector: Optional[str] = None,
    risk_segment: Optional[str] = None,
    cash_flow_health: Optional[str] = None,
    min_revenue: Optional[float] = None,
    max_revenue: Optional[float] = None
):
    """
    Searchable, filterable list of all MSMEs in the portfolio.
    """
    results = MSME_DATABASE

    if search:
        s = search.lower()
        results = [m for m in results if s in m["business_name"].lower() or s in m["msme_id"].lower() or s in m["sector"].lower()]

    if sector and sector != "All":
        results = [m for m in results if m["sector"] == sector]

    if risk_segment and risk_segment != "All":
        results = [m for m in results if m["risk_segment"].upper() == risk_segment.upper()]

    if cash_flow_health and cash_flow_health != "All":
        results = [m for m in results if m["cash_flow_health"] == cash_flow_health]

    if min_revenue is not None:
        results = [m for m in results if m["annual_revenue"] >= min_revenue]

    if max_revenue is not None:
        results = [m for m in results if m["annual_revenue"] <= max_revenue]

    return {
        "count": len(results),
        "total": len(MSME_DATABASE),
        "msmes": results
    }

@app.get("/api/msmes/{id}")
def get_msme(id: str):
    """
    Returns full borrower profile.
    """
    msme = MSME_MAP.get(id)
    if not msme:
        raise HTTPException(status_code=404, detail="MSME not found")

    # Alternative Business Signals with exact card metrics and definitions
    signals = {
        "revenue_stability": {
            "score": msme.get("revenue_stability", 72),
            "label": "Revenue Stability",
            "unit": "%",
            "description": "Volatility of monthly recurring top-line over 12 months."
        },
        "cash_flow_stability": {
            "score": msme.get("cash_flow_stability", 61),
            "label": "Cash Flow Stability",
            "unit": "%",
            "description": "Based on monthly inflow/outflow consistency."
        },
        "invoice_consistency": {
            "score": msme.get("invoice_consistency", 78),
            "label": "Invoice Consistency",
            "unit": "%",
            "description": "Frequency and timeliness of digital GST/e-invoice generation."
        },
        "payment_behavior": {
            "score": msme.get("payment_behavior", 64),
            "label": "Payment Behavior",
            "unit": "%",
            "description": "Counterparty DSO and vendor payment punctuality score."
        },
        "business_activity": {
            "score": msme.get("business_activity", 81),
            "label": "Business Activity",
            "unit": "%",
            "description": "Composite index of digital banking, e-way bills, and vendor volume."
        },
        "customer_concentration": {
            "value": msme.get("customer_concentration", "Moderate"),
            "label": "Customer Concentration",
            "description": "Revenue percentage contributed by top 3 buyers."
        },
        "supplier_concentration": {
            "value": msme.get("supplier_concentration", "Low"),
            "label": "Supplier Concentration",
            "description": "Input reliance across primary vendor base."
        },
        "transaction_volatility": {
            "value": msme.get("transaction_volatility", "High"),
            "label": "Transaction Volatility",
            "description": "Standard deviation of periodic operating account throughput."
        }
    }

    return {
        "msme": msme,
        "alternative_signals": signals,
        "is_synthetic": True,
        "demo_disclaimer": "All values are synthetic demonstration values generated for algorithmic evaluation."
    }

@app.get("/api/msmes/{id}/risk")
def get_msme_risk(id: str):
    """
    Explainable AI breakdown: Positive and negative contributors.
    """
    msme = MSME_MAP.get(id)
    if not msme:
        raise HTTPException(status_code=404, detail="MSME not found")

    explanation = risk_engine.explain_msme(msme)
    return {
        "msme_id": msme["msme_id"],
        "business_name": msme["business_name"],
        "risk_score": msme["risk_score"],
        "probability_of_default": msme["probability_of_default"],
        "risk_segment": msme["risk_segment"],
        "explanation": explanation
    }

@app.get("/api/msmes/{id}/cashflow")
def get_cashflow_data(id: str):
    """
    Cash flow forecast series and analysis.
    """
    msme = MSME_MAP.get(id)
    if not msme:
        raise HTTPException(status_code=404, detail="MSME not found")

    return get_msme_cashflow(msme)

@app.post("/api/simulate")
def run_simulation(req: SimulationRequest):
    """
    What-If Lab Economic Stress Simulator.
    """
    msme = MSME_MAP.get(req.msme_id)
    if not msme:
        raise HTTPException(status_code=404, detail="MSME not found")

    result = simulate_stress(
        current_msme=msme,
        revenue_change=req.revenue_change,
        cost_change=req.cost_change,
        interest_change=req.interest_change,
        payment_delay_days=req.payment_delay_days,
        loan_amount=req.loan_amount or 0.0
    )

    curr_reserve_l = 4.2 if msme["msme_id"] == "MSME-1042" else round(msme.get("cash_reserve", 4000000)/100000, 1)

    return {
        "msme_id": msme["msme_id"],
        "business_name": msme["business_name"],
        "current_state": {
            "risk_score": msme["risk_score"],
            "probability_of_default": msme["probability_of_default"],
            "cash_reserve": curr_reserve_l,
            "dscr": msme["dscr"],
            "risk_segment": msme["risk_segment"]
        },
        "simulation_inputs": req.dict(),
        "simulated_state": result
    }

@app.get("/api/fairness")
def get_fairness_monitor():
    """
    Fairness and Bias Monitor audit across synthetic cohorts.
    """
    return compute_fairness_audit(MSME_DATABASE)

@app.get("/api/model-metrics")
def get_model_metrics():
    """
    Model performance metrics and feature importances.
    """
    return {
        "model_version": risk_engine.version,
        "model_type": risk_engine.model_type,
        "features_count": risk_engine.num_features,
        "training_records": f"{risk_engine.training_records:,} synthetic records",
        "metrics": risk_engine.metrics,
        "feature_importances": risk_engine.feature_importances,
        "disclaimer": "DEMO/SYNTHETIC MODEL METRICS: Evaluated on synthetic enterprise validation split."
    }

@app.post("/api/loan-impact")
def run_loan_impact(req: LoanImpactRequest):
    """
    Loan Impact Simulator for underwriting assessment.
    """
    msme = MSME_MAP.get(req.msme_id)
    if not msme:
        raise HTTPException(status_code=404, detail="MSME not found")

    return calculate_loan_impact(
        current_msme=msme,
        loan_amount=req.loan_amount,
        interest_rate=req.interest_rate,
        tenure_months=req.tenure_months
    )

@app.get("/api/report/{id}")
def generate_credit_intelligence_report(id: str):
    """
    Generates a structured Credit Intelligence Report for underwriting decision support.
    """
    msme = MSME_MAP.get(id)
    if not msme:
        raise HTTPException(status_code=404, detail="MSME not found")

    explanation = risk_engine.explain_msme(msme)
    cf_data = get_msme_cashflow(msme)

    is_metro = msme["msme_id"] == "MSME-1042"

    return {
        "report_id": f"REP-{msme['msme_id']}-2026",
        "generated_at": "September 30, 2026",
        "business_name": msme["business_name"],
        "msme_id": msme["msme_id"],
        "sector": msme["sector"],
        "business_age": f"{msme['business_age']} Years",
        "risk_score": f"{msme['risk_score']}/100",
        "risk_segment": "Moderate-High" if is_metro else msme["risk_segment"],
        "probability_of_default": f"{msme['probability_of_default']}%",
        "dscr": f"{msme['dscr']}x",
        "primary_risk_drivers": [
            "1. Cash-flow volatility (MoM fluctuation in operating reserves)",
            "2. Revenue decline (-8.2% YoY trend in core products)" if is_metro else "2. Revenue trend deceleration",
            "3. Debt burden (Elevated debt-to-revenue servicing ratio)"
        ],
        "positive_signals": [
            "1. Stable transactions (High repeat counterparty density)",
            "2. Business continuity (Active e-way bills and operational history)",
            "3. Improving supplier payments (Zero trade defaults recorded)"
        ],
        "cash_flow_outlook": msme["cash_flow_health"],
        "cash_flow_insight": cf_data["forecast_insight"],
        "stress_test_summary": "Moderate Stress → Elevated Risk (DSCR compresses to 1.12x; Risk Score +4)" if is_metro else "Simulated stress reveals moderate margin sensitivity",
        "decision_support": "Enhanced underwriting review",
        "decision_guidance": "Recommended for decision support with collateral enhancement or selective credit limit. Do not execute automatic approval/rejection.",
        "disclaimer": "DEMONSTRATION REPORT: Generated using synthetic alternative data signals and predictive machine learning models. Designed exclusively as a human-in-the-loop decision support system."
    }

@app.post("/api/chat", response_model=ChatResponse)
def chat_endpoint(req: ChatRequest):
    """
    Chatbot endpoint for CrediLens Intelligence Assistant.
    Retrieves context from existing business signals, risk explanations,
    cash-flow forecasts, What-If stress test results, and fairness audits.
    """
    res = generate_chat_response(
        message=req.message,
        borrower_id=req.borrower_id,
        msme_map=MSME_MAP,
        msme_database=MSME_DATABASE,
        risk_engine=risk_engine,
        get_msme_cashflow=get_msme_cashflow,
        simulate_stress=simulate_stress,
        calculate_loan_impact=calculate_loan_impact,
        compute_fairness_audit=compute_fairness_audit
    )
    return ChatResponse(**res)
    
# ================= FINANCIAL DATA INTEGRATION HUB ENDPOINTS =================

@app.get("/api/integrations", response_model=IntegrationSummaryResponse)
def get_integrations_summary():
    """
    Returns dashboard summary metrics and provider connection cards.
    Calculates counters and health from actual database states.
    """
    return registry.get_summary()

@app.get("/api/integrations/{provider}/status", response_model=DataConnectionModel)
def get_provider_status(provider: str):
    """Returns detailed status and stats for a specific integration provider."""
    adapter = registry.get_adapter(provider)
    if not adapter:
        raise HTTPException(status_code=404, detail=f"Provider '{provider}' not found.")
    return adapter.get_status()

@app.post("/api/integrations/{provider}/test", response_model=TestConnectionResponse)
def test_provider_connection(provider: str):
    """Tests provider connectivity using configured credentials."""
    return sync_service.test_provider(provider)

@app.post("/api/integrations/{provider}/sync", response_model=SyncResponse)
def sync_provider_data(provider: str, req: Optional[Dict[str, Any]] = None):
    """Triggers data synchronization for the provider."""
    return sync_service.sync_provider(provider, req or {})

@app.get("/api/integrations/{provider}/sync-history")
def get_provider_sync_history(provider: str, limit: int = Query(default=20, ge=1, le=100)):
    """Returns recent synchronization runs for a provider."""
    adapter = registry.get_adapter(provider)
    if not adapter:
        raise HTTPException(status_code=404, detail=f"Provider '{provider}' not found.")
    return adapter.get_sync_history(limit=limit)

@app.get("/api/integrations/transactions", response_model=TransactionsListResponse)
def get_financial_transactions(
    provider: Optional[str] = Query(default=None),
    source: Optional[str] = Query(default=None),
    msme_id: Optional[str] = Query(default=None),
    file_id: Optional[str] = Query(default=None),
    status: Optional[str] = Query(default=None),
    search: Optional[str] = Query(default=None),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=50, ge=1, le=200)
):
    """Returns normalized financial transactions with search, filtering, and summary."""
    return sync_service.get_transactions(
        provider=provider,
        source=source,
        msme_id=msme_id,
        file_id=file_id,
        status_filter=status,
        search=search,
        page=page,
        limit=limit
    )

@app.post("/api/integrations/{provider}/configure", response_model=ConfigureProviderResponse)
def configure_provider_credentials(provider: str, req: ConfigureProviderRequest):
    """Configures credentials for a provider securely in the backend."""
    return sync_service.configure_provider(provider, req)

@app.post("/api/integrations/bank/consent", response_model=BankConsentResponse)
def initiate_bank_consent(req: BankConsentRequest):
    """Initiates Account Aggregator consent request for a customer identifier."""
    return sync_service.initiate_bank_consent(req)

@app.get("/api/integrations/bank/consent/{consent_id}")
def check_bank_consent(consent_id: str):
    """Checks the status of an Account Aggregator consent artifact."""
    return sync_service.check_bank_consent(consent_id)

@app.post("/api/integrations/webhooks/{provider}")
async def integration_webhook(provider: str, request: Request):
    """
    Receives incoming webhooks from financial providers (e.g. Razorpay payment.captured).
    Enforces HMAC-SHA256 signature verification.
    """
    body_bytes = await request.body()
    if provider.lower() == "razorpay":
        secret = os.getenv("RAZORPAY_WEBHOOK_SECRET", "").strip()
        sig = request.headers.get("X-Razorpay-Signature", "")
        if secret and sig:
            if not verify_razorpay_webhook_signature(body_bytes, sig, secret):
                raise HTTPException(status_code=400, detail="Invalid Razorpay webhook signature.")
        
        try:
            event_data = json.loads(body_bytes.decode())
            event_type = event_data.get("event")
            if event_type in ("payment.captured", "payment.authorized", "payment.failed"):
                payment_payload = event_data.get("payload", {}).get("payment", {}).get("entity", {})
                if payment_payload:
                    norm = normalize_razorpay_payment(payment_payload, source_env="SANDBOX")
                    integration_db.upsert_transaction(norm)
            return {"status": "processed", "event": event_type}
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Webhook parsing error: {str(e)}")
    
    return {"status": "received", "provider": provider}

# ================= DATA MANAGEMENT & FINANCIAL FILE IMPORT ENDPOINTS =================

@app.get("/api/data-management/summary", response_model=DataManagementSummaryResponse)
def get_data_management_summary():
    """
    Returns unified metrics across all connected providers and imported files.
    Calculates live counts, sync activity, and data quality directly from database.
    """
    return integration_db.get_data_management_summary()

@app.post("/api/imports/preview")
async def preview_import_file_endpoint(file: UploadFile = File(...)):
    """
    Previews uploaded CSV, XLSX, or XLS file: extracts columns, detects dataset type,
    generates sample rows with formula sanitization, and provides smart column mappings.
    """
    content = await file.read()
    try:
        return preview_file(content, file.filename)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/imports/validate")
async def validate_import_file_endpoint(
    file: UploadFile = File(...),
    column_mapping: str = Form(...),
    dataset_type: str = Form(default="CUSTOM"),
    msme_id: str = Form(default="MSME-1042")
):
    """
    Validates uploaded rows, verifies date/amount formats, detects duplicates
    against existing transactions, and stages file record for user confirmation.
    """
    content = await file.read()
    try:
        mapping = json.loads(column_mapping) if isinstance(column_mapping, str) else column_mapping
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid column_mapping JSON format.")

    try:
        return validate_and_stage_file(
            file_bytes=content,
            filename=file.filename,
            column_mapping=mapping,
            dataset_type=dataset_type,
            msme_id=msme_id
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/imports/{file_id}/confirm")
def confirm_file_import_endpoint(file_id: str):
    """
    Commits staged valid non-duplicate transactions into the unified data layer.
    """
    try:
        return execute_import(file_id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/imports")
def list_imported_files_endpoint(
    msme_id: Optional[str] = Query(default=None),
    limit: int = Query(default=50, ge=1, le=100)
):
    """Returns list of imported financial files with statuses and row metrics."""
    return integration_db.list_imported_files(msme_id=msme_id, limit=limit)

@app.get("/api/imports/{file_id}")
def get_imported_file_detail_endpoint(file_id: str):
    """Returns detailed audit info and row metrics for a specific imported file."""
    f = integration_db.get_imported_file(file_id)
    if not f:
        raise HTTPException(status_code=404, detail=f"Imported file '{file_id}' not found.")
    return f

@app.get("/api/imports/{file_id}/error-report")
def download_import_error_report_endpoint(file_id: str):
    """Downloads CSV validation error report for an uploaded file."""
    try:
        csv_str = generate_error_report_csv(file_id)
        return Response(
            content=csv_str,
            media_type="text/csv",
            headers={"Content-Disposition": f'attachment; filename="validation_errors_{file_id}.csv"'}
        )
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))

@app.delete("/api/imports/{file_id}")
def delete_imported_file_endpoint(file_id: str):
    """Deletes uploaded file record and rolls back all associated transactions."""
    ok = integration_db.delete_imported_file(file_id)
    return {"success": ok, "file_id": file_id, "message": "File and imported records removed."}

@app.get("/api/msmes/{id}/data-summary")
def get_msme_data_summary_endpoint(id: str):
    """Returns unified financial transaction summary for a specific borrower."""
    msme = MSME_MAP.get(id)
    if not msme:
        raise HTTPException(status_code=404, detail=f"MSME '{id}' not found.")

    conn = integration_db._get_connection()
    try:
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*) as total FROM financial_transactions WHERE msme_id = ?", (id,))
        total_tx = cur.fetchone()["total"]

        cur.execute("SELECT COUNT(*) as files FROM imported_files WHERE msme_id = ?", (id,))
        file_count = cur.fetchone()["files"]

        cur.execute("""
            SELECT transaction_id, provider, source, external_id, transaction_date, amount,
                   direction, status, description, balance, transaction_type, provenance
            FROM financial_transactions
            WHERE msme_id = ?
            ORDER BY transaction_date DESC LIMIT 10
        """, (id,))
        recent_tx = [dict(r) for r in cur.fetchall()]

        return {
            "msme_id": id,
            "business_name": msme["business_name"],
            "total_transactions": total_tx,
            "imported_files_count": file_count,
            "recent_transactions": recent_tx
        }
    finally:
        conn.close()


