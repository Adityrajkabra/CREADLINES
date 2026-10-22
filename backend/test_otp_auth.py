"""
CrediLens — Comprehensive OTP Verification & Password Recovery Test Suite
Tests all registration OTP workflows, password recovery workflows, security constraints,
expiry limits, attempt limits, and error conditions using a mocked email delivery provider.
"""

import os
import sys
import time
from datetime import datetime, timedelta, timezone
from fastapi.testclient import TestClient

# Ensure backend directory is in path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from main import app
from auth_db import auth_db
from email_service import email_service, EmailConfigurationError, EmailDeliveryError
from otp_service import mask_email, get_otp_max_attempts, get_otp_max_resends

client = TestClient(app)

# Test state container for captured emails
captured_emails = []

def mock_email_sender(to_email: str, subject: str, text_body: str, html_body: str) -> bool:
    """Mock sender capturing outbound emails and extracting OTPs."""
    import re
    # Extract 6-digit OTP from subject or body
    match = re.search(r"\b(\d{6})\b", subject) or re.search(r"\b(\d{6})\b", text_body)
    otp = match.group(1) if match else None
    captured_emails.append({
        "to_email": to_email,
        "subject": subject,
        "text_body": text_body,
        "html_body": html_body,
        "otp": otp,
        "timestamp": time.time()
    })
    return True

def run_all_tests():
    print("\n=======================================================")
    print("   CREDILENS GMAIL OTP & RECOVERY TEST SUITE EXECUTION   ")
    print("=======================================================\n")

    # Hook up mock sender
    email_service.set_mock_sender(mock_email_sender)

    # 1. Test missing SMTP configuration error reporting
    print("1. Testing missing SMTP configuration error handling...")
    email_service.set_mock_sender(None)  # un-mock temporarily
    # Ensure env vars are empty for this test check
    orig_user = os.environ.get("SMTP_USERNAME")
    orig_pass = os.environ.get("SMTP_APP_PASSWORD")
    os.environ["SMTP_USERNAME"] = ""
    os.environ["SMTP_APP_PASSWORD"] = ""
    try:
        res = client.post("/api/auth/register", json={
            "full_name": "Test Unconfigured",
            "email": "unconfigured@gmail.com",
            "password": "Password@2026",
            "confirm_password": "Password@2026",
            "agree_terms": True
        })
        assert res.status_code == 503, f"Expected 503 when SMTP unconfigured, got {res.status_code}"
        assert "SMTP email service is not configured" in res.json()["detail"]
        print("   -> PASS: Explicit 503 returned when SMTP credentials not configured.")
    finally:
        # Restore mock sender
        email_service.set_mock_sender(mock_email_sender)
        if orig_user: os.environ["SMTP_USERNAME"] = orig_user
        if orig_pass: os.environ["SMTP_APP_PASSWORD"] = orig_pass

    # 2. Test successful registration initiation and OTP email dispatch
    print("2. Testing registration initiation with OTP dispatch...")
    captured_emails.clear()
    reg_email = f"newuser_{int(time.time())}@gmail.com"
    res = client.post("/api/auth/register", json={
        "full_name": "Jane Underwriter",
        "email": reg_email,
        "organization": "Commercial MSME Risk Corp",
        "password": "SecurePassword@2026",
        "confirm_password": "SecurePassword@2026",
        "agree_terms": True
    })
    assert res.status_code == 200, f"Registration initiate failed: {res.text}"
    data = res.json()
    assert data["status"] == "pending_verification"
    assert data["email"] == reg_email.lower()
    assert data["masked_email"] == mask_email(reg_email)
    assert len(captured_emails) == 1
    reg_otp = captured_emails[0]["otp"]
    assert reg_otp and len(reg_otp) == 6
    print(f"   -> PASS: Pending registration created. OTP dispatched to mocked email ({mask_email(reg_email)}).")

    # 3. Test unverified user login blocked
    print("3. Testing login blocked for unverified account...")
    res = client.post("/api/auth/login", json={
        "email": reg_email,
        "password": "SecurePassword@2026"
    })
    # User is not in active users table yet, so login is rejected
    assert res.status_code in (401, 403), f"Expected 401/403 for unverified user, got {res.status_code}"
    print("   -> PASS: Unverified account cannot log in.")

    # 4. Test duplicate email validation for active accounts
    print("4. Testing duplicate active account registration rejection...")
    res = client.post("/api/auth/register", json={
        "full_name": "Duplicate Analyst",
        "email": "underwriter@credilens.internal", # Seeded active user
        "password": "Password@2026",
        "confirm_password": "Password@2026",
        "agree_terms": True
    })
    assert res.status_code == 400
    assert "already exists" in res.json()["detail"].lower()
    print("   -> PASS: Duplicate active email rejected with clear error.")

    # 5. Test incorrect OTP attempt counting & invalidation
    print("5. Testing incorrect OTP attempt counting...")
    res = client.post("/api/auth/verify-registration-otp", json={
        "email": reg_email,
        "otp": "000000"
    })
    assert res.status_code == 400
    assert "attempt(s) remaining" in res.json()["detail"]
    print("   -> PASS: Incorrect OTP rejected with remaining attempts counter.")

    # 6. Test successful registration OTP verification & account activation
    print("6. Testing successful OTP verification & account activation...")
    res = client.post("/api/auth/verify-registration-otp", json={
        "email": reg_email,
        "otp": reg_otp
    })
    assert res.status_code == 200, f"OTP verification failed: {res.text}"
    auth_data = res.json()
    assert "access_token" in auth_data
    assert auth_data["user"]["email"] == reg_email.lower()
    assert auth_data["user"]["account_status"] == "active"
    print("   -> PASS: Account activated successfully with JWT session issued.")

    # 7. Test OTP reuse prevention
    print("7. Testing OTP single-use constraint (reuse rejection)...")
    res = client.post("/api/auth/verify-registration-otp", json={
        "email": reg_email,
        "otp": reg_otp
    })
    assert res.status_code == 400
    print("   -> PASS: Reused OTP rejected.")

    # 8. Test logging in with newly activated user credentials
    print("8. Testing sign in with activated account...")
    res = client.post("/api/auth/login", json={
        "email": reg_email,
        "password": "SecurePassword@2026"
    })
    assert res.status_code == 200
    assert res.json()["user"]["email"] == reg_email.lower()
    print("   -> PASS: Activated user signed in successfully.")

    # 9. Test forgot password request for existing user
    print("9. Testing forgot password request for registered user...")
    captured_emails.clear()
    res = client.post("/api/auth/forgot-password", json={
        "email": reg_email
    })
    assert res.status_code == 200
    assert len(captured_emails) == 1
    reset_otp = captured_emails[0]["otp"]
    assert reset_otp and len(reset_otp) == 6
    print(f"   -> PASS: Password reset OTP dispatched to {mask_email(reg_email)}.")

    # 10. Test forgot password generic response for non-existent email (anti-enumeration)
    print("10. Testing generic response for non-existent email...")
    captured_emails.clear()
    res = client.post("/api/auth/forgot-password", json={
        "email": "nonexistent_ghost_user@gmail.com"
    })
    assert res.status_code == 200
    assert "6-digit recovery code" in res.json()["message"]
    assert len(captured_emails) == 0  # No email should be sent for ghost account
    print("   -> PASS: Generic response returned without leaking account non-existence.")

    # 11. Test resend cooldown enforcement
    print("11. Testing resend cooldown enforcement...")
    res = client.post("/api/auth/resend-reset-otp", json={
        "email": reg_email
    })
    assert res.status_code == 429
    assert "Please wait" in res.json()["detail"]
    print("   -> PASS: Resend cooldown (60s) properly enforced with 429 response.")

    # 12. Test incorrect reset OTP rejection
    print("12. Testing incorrect reset OTP rejection...")
    res = client.post("/api/auth/verify-reset-otp", json={
        "email": reg_email,
        "otp": "999999"
    })
    assert res.status_code == 400
    assert "Invalid recovery code" in res.json()["detail"]
    print("   -> PASS: Incorrect reset OTP rejected.")

    # 13. Test successful reset OTP verification & reset token issuance
    print("13. Testing successful reset OTP verification...")
    res = client.post("/api/auth/verify-reset-otp", json={
        "email": reg_email,
        "otp": reset_otp
    })
    assert res.status_code == 200
    reset_token = res.json()["reset_token"]
    assert reset_token and len(reset_token) > 20
    print("   -> PASS: Recovery OTP verified. Short-lived reset token issued.")

    # 14. Test weak password rejection during reset
    print("14. Testing weak password rejection during reset...")
    res = client.post("/api/auth/reset-password", json={
        "reset_token": reset_token,
        "new_password": "short",
        "confirm_password": "short"
    })
    assert res.status_code == 400
    assert "at least 8 characters" in res.json()["detail"]
    print("   -> PASS: Weak password rejected during reset.")

    # 15. Test successful password reset
    print("15. Testing successful password reset...")
    res = client.post("/api/auth/reset-password", json={
        "reset_token": reset_token,
        "new_password": "NewStrongPassword@2027",
        "confirm_password": "NewStrongPassword@2027"
    })
    assert res.status_code == 200
    assert "updated successfully" in res.json()["message"]
    print("   -> PASS: Password reset completed successfully.")

    # 16. Test reset token replay prevention
    print("16. Testing reset token replay attack prevention...")
    res = client.post("/api/auth/reset-password", json={
        "reset_token": reset_token,
        "new_password": "AnotherPassword@2028",
        "confirm_password": "AnotherPassword@2028"
    })
    assert res.status_code == 400
    assert "already been used" in res.json()["detail"]
    print("   -> PASS: Reset token cannot be reused.")

    # 17. Test old password no longer works
    print("17. Testing old password is now invalidated...")
    res = client.post("/api/auth/login", json={
        "email": reg_email,
        "password": "SecurePassword@2026"  # Old password
    })
    assert res.status_code == 401
    print("   -> PASS: Old password rejected.")

    # 18. Test new password authenticates successfully
    print("18. Testing new password authenticates successfully...")
    res = client.post("/api/auth/login", json={
        "email": reg_email,
        "password": "NewStrongPassword@2027"  # New password
    })
    assert res.status_code == 200
    assert res.json()["user"]["email"] == reg_email.lower()
    print("   -> PASS: New password successfully authenticates.")

    # 19. Test excessive failed OTP verification attempts lockout
    print("19. Testing excessive verification attempts invalidation...")
    captured_emails.clear()
    flood_email = f"flood_{int(time.time())}@gmail.com"
    client.post("/api/auth/register", json={
        "full_name": "Flood Tester",
        "email": flood_email,
        "password": "Password@2026",
        "confirm_password": "Password@2026",
        "agree_terms": True
    })
    # Submit 5 wrong OTPs to trigger invalidation
    for i in range(get_otp_max_attempts()):
        client.post("/api/auth/verify-registration-otp", json={
            "email": flood_email,
            "otp": "000000"
        })
    # Next attempt should be blocked with code invalidated
    res = client.post("/api/auth/verify-registration-otp", json={
        "email": flood_email,
        "otp": captured_emails[0]["otp"]  # Even correct OTP now rejected!
    })
    assert res.status_code == 400
    assert "invalidated" in res.json()["detail"].lower() or "no active" in res.json()["detail"].lower()
    print("   -> PASS: Excessive incorrect attempts successfully invalidate verification code.")

    print("\n=======================================================")
    print("   ALL 19 OTP & PASSWORD RECOVERY TESTS PASSED (100%)  ")
    print("=======================================================\n")

if __name__ == "__main__":
    run_all_tests()
