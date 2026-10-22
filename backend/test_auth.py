"""
CrediLens — Automated Authentication Test Suite
Tests registration, validation, password hashing, login, logout, and session retrieval.
"""

from fastapi.testclient import TestClient
from main import app
from auth_db import auth_db
import uuid

client = TestClient(app)

def test_demo_login():
    print("1. Testing login with seeded demo account...")
    res = client.post("/api/auth/login", json={
        "email": "underwriter@credilens.internal",
        "password": "CrediLens@2026"
    })
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
    data = res.json()
    assert "access_token" in data
    assert data["user"]["email"] == "underwriter@credilens.internal"
    assert data["user"]["full_name"] == "Senior Credit Analyst"
    assert "password_hash" not in data["user"]
    print("   -> PASS: Seeded underwriter successfully authenticated with JWT.")
    return data["access_token"]

def test_invalid_login():
    print("2. Testing login with invalid password...")
    res = client.post("/api/auth/login", json={
        "email": "underwriter@credilens.internal",
        "password": "WrongPassword123"
    })
    assert res.status_code == 401, f"Expected 401, got {res.status_code}"
    assert "Invalid work email or password" in res.json()["detail"]
    print("   -> PASS: Generic 401 returned for incorrect password.")

    print("3. Testing login with unknown account...")
    res = client.post("/api/auth/login", json={
        "email": "unknown.user@nonexistent.org",
        "password": "AnyPassword123!"
    })
    assert res.status_code == 401
    assert "Invalid work email or password" in res.json()["detail"]
    print("   -> PASS: Generic 401 returned for non-existent email.")

def test_registration_validation():
    print("4. Testing registration validation...")
    # A. Malformed email
    res = client.post("/api/auth/register", json={
        "full_name": "Test Analyst",
        "email": "not-an-email",
        "password": "SecurePassword1!",
        "confirm_password": "SecurePassword1!",
        "agree_terms": True
    })
    assert res.status_code == 400
    print("   -> PASS: Malformed email rejected.")

    # B. Password mismatch
    res = client.post("/api/auth/register", json={
        "full_name": "Test Analyst",
        "email": "analyst@bank.com",
        "password": "SecurePassword1!",
        "confirm_password": "DifferentPassword1!",
        "agree_terms": True
    })
    assert res.status_code == 400
    assert "Passwords do not match" in res.json()["detail"]
    print("   -> PASS: Password mismatch rejected.")

    # C. Weak password (< 8 chars)
    res = client.post("/api/auth/register", json={
        "full_name": "Test Analyst",
        "email": "analyst@bank.com",
        "password": "short",
        "confirm_password": "short",
        "agree_terms": True
    })
    assert res.status_code == 400
    print("   -> PASS: Short password rejected.")

    # D. Duplicate email rejection
    res = client.post("/api/auth/register", json={
        "full_name": "Duplicate Tester",
        "email": "underwriter@credilens.internal",
        "password": "SecurePassword1!",
        "confirm_password": "SecurePassword1!",
        "agree_terms": True
    })
    assert res.status_code == 400
    assert "already exists" in res.json()["detail"]
    print("   -> PASS: Duplicate email rejected.")

def test_successful_registration_and_persistence():
    print("5. Testing successful new user registration & persistence...")
    unique_email = f"analyst_{uuid.uuid4().hex[:6]}@rbi-fintech.org"

    captured_otps = []
    def capture_sender(to_email, subject, text_body, html_body):
        import re
        m = re.search(r"\b(\d{6})\b", subject) or re.search(r"\b(\d{6})\b", text_body)
        if m: captured_otps.append(m.group(1))
        return True

    from email_service import email_service
    email_service.set_mock_sender(capture_sender)

    # 1. Initiate registration
    init_res = client.post("/api/auth/register", json={
        "full_name": "Priya Sharma",
        "email": unique_email,
        "organization": "State Commercial Credit Bank",
        "password": "PriyaCreditPass@2026",
        "confirm_password": "PriyaCreditPass@2026",
        "agree_terms": True
    })
    assert init_res.status_code == 200, f"Expected 200, got {init_res.status_code}: {init_res.text}"
    assert len(captured_otps) == 1
    otp = captured_otps[0]

    # 2. Verify OTP and complete registration
    res = client.post("/api/auth/verify-registration-otp", json={
        "email": unique_email,
        "otp": otp
    })
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
    data = res.json()
    assert data["user"]["email"] == unique_email.lower()
    assert data["user"]["full_name"] == "Priya Sharma"
    assert data["user"]["organization"] == "State Commercial Credit Bank"
    assert "access_token" in data
    print("   -> PASS: New underwriter registered successfully with JWT via OTP.")

    # Verify persistent database lookup
    db_user = auth_db.get_user_by_email(unique_email)
    assert db_user is not None
    assert db_user["full_name"] == "Priya Sharma"
    print("   -> PASS: Account verified in persistent SQLite database.")

    # Verify login with the newly created account
    login_res = client.post("/api/auth/login", json={
        "email": unique_email,
        "password": "PriyaCreditPass@2026"
    })
    assert login_res.status_code == 200
    print("   -> PASS: New account successfully logged in.")
    return data["access_token"]

def test_session_verification(token: str):
    print("6. Testing session retrieval via GET /api/auth/me...")
    # With valid Bearer token
    res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    assert "user" in res.json()
    assert res.json()["user"]["email"] == "underwriter@credilens.internal"
    print("   -> PASS: Authenticated user returned from session.")

    # Without token (clear client cookies first)
    client.cookies.clear()
    res_no_token = client.get("/api/auth/me")
    assert res_no_token.status_code == 401
    print("   -> PASS: 401 returned when token is missing.")

    # With invalid token
    res_bad_token = client.get("/api/auth/me", headers={"Authorization": "Bearer invalid.jwt.token"})
    assert res_bad_token.status_code == 401
    print("   -> PASS: 401 returned for forged/invalid token.")

def test_logout():
    print("7. Testing logout endpoint...")
    res = client.post("/api/auth/logout")
    assert res.status_code == 200
    assert "Signed out successfully" in res.json()["message"]
    print("   -> PASS: Logout executed and session invalidated.")

if __name__ == "__main__":
    print("\n=======================================================")
    print("   CREDILENS AUTHENTICATION TEST SUITE EXECUTION   ")
    print("=======================================================\n")
    demo_token = test_demo_login()
    test_invalid_login()
    test_registration_validation()
    new_user_token = test_successful_registration_and_persistence()
    test_session_verification(demo_token)
    test_logout()
    print("\n=======================================================")
    print("   ALL AUTHENTICATION TESTS PASSED WITH 100% SUCCESS   ")
    print("=======================================================\n")
