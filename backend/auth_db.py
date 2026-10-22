"""
CrediLens — Authentication Database Module
Handles persistent storage for user accounts, pending registrations, and
cryptographically hashed OTP verification records using SQLite (local persistent fallback)
or PostgreSQL when DATABASE_URL is configured.
"""

import os
import sqlite3
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any
import bcrypt
from dotenv import load_dotenv

load_dotenv()

DB_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "credilens_users.db")
DATABASE_URL = os.getenv("DATABASE_URL", None)

class AuthDatabase:
    def __init__(self):
        self.is_postgres = False
        self._init_db()
        self._seed_demo_account()

    def _get_connection(self):
        if self.is_postgres and DATABASE_URL:
            import psycopg2
            import psycopg2.extras
            return psycopg2.connect(DATABASE_URL)
        else:
            conn = sqlite3.connect(DB_FILE)
            conn.row_factory = sqlite3.Row
            return conn

    def _init_db(self):
        """Initializes database schema persistently for users, pending registrations, and OTP records."""
        if DATABASE_URL:
            try:
                import psycopg2
                conn = psycopg2.connect(DATABASE_URL)
                with conn.cursor() as cur:
                    cur.execute("""
                        CREATE TABLE IF NOT EXISTS users (
                            user_id VARCHAR(100) PRIMARY KEY,
                            email VARCHAR(255) UNIQUE NOT NULL,
                            full_name VARCHAR(255) NOT NULL,
                            organization VARCHAR(255),
                            password_hash VARCHAR(255) NOT NULL,
                            account_status VARCHAR(50) NOT NULL DEFAULT 'active',
                            created_at VARCHAR(100) NOT NULL,
                            updated_at VARCHAR(100) NOT NULL
                        );

                        CREATE TABLE IF NOT EXISTS pending_registrations (
                            id VARCHAR(100) PRIMARY KEY,
                            email VARCHAR(255) UNIQUE NOT NULL,
                            full_name VARCHAR(255) NOT NULL,
                            organization VARCHAR(255),
                            password_hash VARCHAR(255) NOT NULL,
                            created_at VARCHAR(100) NOT NULL,
                            expires_at VARCHAR(100) NOT NULL
                        );

                        CREATE TABLE IF NOT EXISTS otp_verifications (
                            id VARCHAR(100) PRIMARY KEY,
                            email VARCHAR(255) NOT NULL,
                            purpose VARCHAR(50) NOT NULL,
                            otp_hash VARCHAR(255) NOT NULL,
                            expires_at VARCHAR(100) NOT NULL,
                            failed_attempts INT NOT NULL DEFAULT 0,
                            resend_count INT NOT NULL DEFAULT 0,
                            last_resend_at VARCHAR(100) NOT NULL,
                            is_used INT NOT NULL DEFAULT 0,
                            created_at VARCHAR(100) NOT NULL
                        );

                        CREATE TABLE IF NOT EXISTS used_tokens (
                            jti VARCHAR(100) PRIMARY KEY,
                            purpose VARCHAR(50) NOT NULL,
                            created_at VARCHAR(100) NOT NULL
                        );
                    """)
                    conn.commit()
                conn.close()
                self.is_postgres = True
                print("[CrediLens Auth] Connected to PostgreSQL user database.")
                return
            except Exception as e:
                print(f"[CrediLens Auth] PostgreSQL connection error ({e}). Falling back to persistent SQLite.")
                self.is_postgres = False

        # SQLite persistent storage
        conn = sqlite3.connect(DB_FILE)
        with conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    user_id TEXT PRIMARY KEY,
                    email TEXT UNIQUE NOT NULL,
                    full_name TEXT NOT NULL,
                    organization TEXT,
                    password_hash TEXT NOT NULL,
                    account_status TEXT NOT NULL DEFAULT 'active',
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );
            """)
            conn.execute("""
                CREATE TABLE IF NOT EXISTS pending_registrations (
                    id TEXT PRIMARY KEY,
                    email TEXT UNIQUE NOT NULL,
                    full_name TEXT NOT NULL,
                    organization TEXT,
                    password_hash TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    expires_at TEXT NOT NULL
                );
            """)
            conn.execute("""
                CREATE TABLE IF NOT EXISTS otp_verifications (
                    id TEXT PRIMARY KEY,
                    email TEXT NOT NULL,
                    purpose TEXT NOT NULL,
                    otp_hash TEXT NOT NULL,
                    expires_at TEXT NOT NULL,
                    failed_attempts INTEGER NOT NULL DEFAULT 0,
                    resend_count INTEGER NOT NULL DEFAULT 0,
                    last_resend_at TEXT NOT NULL,
                    is_used INTEGER NOT NULL DEFAULT 0,
                    created_at TEXT NOT NULL
                );
            """)
            conn.execute("""
                CREATE TABLE IF NOT EXISTS used_tokens (
                    jti TEXT PRIMARY KEY,
                    purpose TEXT NOT NULL,
                    created_at TEXT NOT NULL
                );
            """)
        conn.close()
        print(f"[CrediLens Auth] Persistent SQLite user database ready at {DB_FILE}")

    def _seed_demo_account(self):
        """
        Seeds the official demonstration underwriting account if it does not exist.
        Email: underwriter@credilens.internal
        Password: CrediLens@2026
        """
        demo_email = "underwriter@credilens.internal"
        existing = self.get_user_by_email(demo_email)
        if not existing:
            salt = bcrypt.gensalt(rounds=12)
            pwd_hash = bcrypt.hashpw("CrediLens@2026".encode("utf-8"), salt).decode("utf-8")
            self.create_user(
                full_name="Senior Credit Analyst",
                email=demo_email,
                organization="CrediLens Commercial Credit Group",
                password_hash=pwd_hash,
                user_id="usr_demo_underwriter_01"
            )
            print("[CrediLens Auth] Seeded default underwriter account: underwriter@credilens.internal")

    # ================= USER ACCOUNT METHODS =================
    def create_user(
        self,
        full_name: str,
        email: str,
        password_hash: str,
        organization: Optional[str] = None,
        user_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Creates a new active user record with normalized email."""
        norm_email = email.strip().lower()
        uid = user_id or f"usr_{uuid.uuid4().hex[:12]}"
        now = datetime.now(timezone.utc).isoformat()

        conn = self._get_connection()
        try:
            if self.is_postgres:
                with conn.cursor() as cur:
                    cur.execute("""
                        INSERT INTO users (user_id, email, full_name, organization, password_hash, account_status, created_at, updated_at)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                        RETURNING user_id, email, full_name, organization, account_status, created_at, updated_at;
                    """, (uid, norm_email, full_name.strip(), organization.strip() if organization else None, password_hash, "active", now, now))
                    row = cur.fetchone()
                    conn.commit()
                    return {
                        "user_id": row[0],
                        "email": row[1],
                        "full_name": row[2],
                        "organization": row[3],
                        "account_status": row[4],
                        "created_at": row[5],
                        "updated_at": row[6]
                    }
            else:
                with conn:
                    conn.execute("""
                        INSERT INTO users (user_id, email, full_name, organization, password_hash, account_status, created_at, updated_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?);
                    """, (uid, norm_email, full_name.strip(), organization.strip() if organization else None, password_hash, "active", now, now))
                return {
                    "user_id": uid,
                    "email": norm_email,
                    "full_name": full_name.strip(),
                    "organization": organization.strip() if organization else None,
                    "account_status": "active",
                    "created_at": now,
                    "updated_at": now
                }
        finally:
            conn.close()

    def get_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """Retrieves user by normalized email."""
        norm_email = email.strip().lower()
        conn = self._get_connection()
        try:
            if self.is_postgres:
                import psycopg2.extras
                with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
                    cur.execute("SELECT * FROM users WHERE email = %s LIMIT 1;", (norm_email,))
                    row = cur.fetchone()
                    if row:
                        return dict(row)
                    return None
            else:
                cur = conn.execute("SELECT * FROM users WHERE email = ? LIMIT 1;", (norm_email,))
                row = cur.fetchone()
                if row:
                    return dict(row)
                return None
        finally:
            conn.close()

    def get_user_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Retrieves user by user_id."""
        conn = self._get_connection()
        try:
            if self.is_postgres:
                import psycopg2.extras
                with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
                    cur.execute("SELECT user_id, email, full_name, organization, account_status, created_at, updated_at FROM users WHERE user_id = %s LIMIT 1;", (user_id,))
                    row = cur.fetchone()
                    if row:
                        return dict(row)
                    return None
            else:
                cur = conn.execute("SELECT user_id, email, full_name, organization, account_status, created_at, updated_at FROM users WHERE user_id = ? LIMIT 1;", (user_id,))
                row = cur.fetchone()
                if row:
                    return dict(row)
                return None
        finally:
            conn.close()

    def update_user_password(self, user_id: str, new_password_hash: str) -> bool:
        """Updates user's password hash and updated_at timestamp."""
        now = datetime.now(timezone.utc).isoformat()
        conn = self._get_connection()
        try:
            if self.is_postgres:
                with conn.cursor() as cur:
                    cur.execute("UPDATE users SET password_hash = %s, updated_at = %s WHERE user_id = %s;", (new_password_hash, now, user_id))
                    conn.commit()
                    return cur.rowcount > 0
            else:
                with conn:
                    cur = conn.execute("UPDATE users SET password_hash = ?, updated_at = ? WHERE user_id = ?;", (new_password_hash, now, user_id))
                    return cur.rowcount > 0
        finally:
            conn.close()

    # ================= PENDING REGISTRATIONS =================
    def save_pending_registration(
        self,
        full_name: str,
        email: str,
        password_hash: str,
        organization: Optional[str] = None,
        expiry_minutes: int = 30
    ) -> Dict[str, Any]:
        """Stores or updates a pending unverified registration record."""
        norm_email = email.strip().lower()
        now = datetime.now(timezone.utc)
        expires = now + timedelta(minutes=expiry_minutes)
        now_str = now.isoformat()
        expires_str = expires.isoformat()
        rec_id = f"preg_{uuid.uuid4().hex[:12]}"

        conn = self._get_connection()
        try:
            if self.is_postgres:
                with conn.cursor() as cur:
                    cur.execute("""
                        INSERT INTO pending_registrations (id, email, full_name, organization, password_hash, created_at, expires_at)
                        VALUES (%s, %s, %s, %s, %s, %s, %s)
                        ON CONFLICT (email) DO UPDATE SET
                            full_name = EXCLUDED.full_name,
                            organization = EXCLUDED.organization,
                            password_hash = EXCLUDED.password_hash,
                            created_at = EXCLUDED.created_at,
                            expires_at = EXCLUDED.expires_at;
                    """, (rec_id, norm_email, full_name.strip(), organization.strip() if organization else None, password_hash, now_str, expires_str))
                    conn.commit()
            else:
                with conn:
                    conn.execute("""
                        INSERT OR REPLACE INTO pending_registrations (id, email, full_name, organization, password_hash, created_at, expires_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?);
                    """, (rec_id, norm_email, full_name.strip(), organization.strip() if organization else None, password_hash, now_str, expires_str))

            return {
                "id": rec_id,
                "email": norm_email,
                "full_name": full_name.strip(),
                "organization": organization.strip() if organization else None,
                "created_at": now_str,
                "expires_at": expires_str
            }
        finally:
            conn.close()

    def get_pending_registration(self, email: str) -> Optional[Dict[str, Any]]:
        """Retrieves pending registration record by email."""
        norm_email = email.strip().lower()
        conn = self._get_connection()
        try:
            if self.is_postgres:
                import psycopg2.extras
                with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
                    cur.execute("SELECT * FROM pending_registrations WHERE email = %s LIMIT 1;", (norm_email,))
                    row = cur.fetchone()
                    if row:
                        return dict(row)
                    return None
            else:
                cur = conn.execute("SELECT * FROM pending_registrations WHERE email = ? LIMIT 1;", (norm_email,))
                row = cur.fetchone()
                if row:
                    return dict(row)
                return None
        finally:
            conn.close()

    def delete_pending_registration(self, email: str) -> bool:
        """Removes pending registration upon successful activation."""
        norm_email = email.strip().lower()
        conn = self._get_connection()
        try:
            if self.is_postgres:
                with conn.cursor() as cur:
                    cur.execute("DELETE FROM pending_registrations WHERE email = %s;", (norm_email,))
                    conn.commit()
                    return cur.rowcount > 0
            else:
                with conn:
                    cur = conn.execute("DELETE FROM pending_registrations WHERE email = ?;", (norm_email,))
                    return cur.rowcount > 0
        finally:
            conn.close()

    # ================= OTP VERIFICATION RECORDS =================
    def create_otp_record(
        self,
        email: str,
        purpose: str,
        otp_hash: str,
        expiry_minutes: int = 5
    ) -> Dict[str, Any]:
        """
        Invalidates previous OTPs for this email and purpose, then creates a new active OTP record.
        """
        norm_email = email.strip().lower()
        now = datetime.now(timezone.utc)
        expires = now + timedelta(minutes=expiry_minutes)
        now_str = now.isoformat()
        expires_str = expires.isoformat()
        record_id = f"otp_{uuid.uuid4().hex[:12]}"

        conn = self._get_connection()
        try:
            if self.is_postgres:
                with conn.cursor() as cur:
                    # Invalidate existing active OTPs
                    cur.execute("""
                        UPDATE otp_verifications
                        SET is_used = 1
                        WHERE email = %s AND purpose = %s AND is_used = 0;
                    """, (norm_email, purpose))
                    # Insert new OTP record
                    cur.execute("""
                        INSERT INTO otp_verifications (id, email, purpose, otp_hash, expires_at, failed_attempts, resend_count, last_resend_at, is_used, created_at)
                        VALUES (%s, %s, %s, %s, %s, 0, 0, %s, 0, %s);
                    """, (record_id, norm_email, purpose, otp_hash, expires_str, now_str, now_str))
                    conn.commit()
            else:
                with conn:
                    # Invalidate existing active OTPs
                    conn.execute("""
                        UPDATE otp_verifications
                        SET is_used = 1
                        WHERE email = ? AND purpose = ? AND is_used = 0;
                    """, (norm_email, purpose))
                    # Insert new OTP record
                    conn.execute("""
                        INSERT INTO otp_verifications (id, email, purpose, otp_hash, expires_at, failed_attempts, resend_count, last_resend_at, is_used, created_at)
                        VALUES (?, ?, ?, ?, ?, 0, 0, ?, 0, ?);
                    """, (record_id, norm_email, purpose, otp_hash, expires_str, now_str, now_str))

            return {
                "id": record_id,
                "email": norm_email,
                "purpose": purpose,
                "expires_at": expires_str,
                "failed_attempts": 0,
                "resend_count": 0,
                "last_resend_at": now_str,
                "is_used": 0,
                "created_at": now_str
            }
        finally:
            conn.close()

    def get_active_otp_record(self, email: str, purpose: str) -> Optional[Dict[str, Any]]:
        """Retrieves the latest unused OTP record for a given email and purpose."""
        norm_email = email.strip().lower()
        conn = self._get_connection()
        try:
            if self.is_postgres:
                import psycopg2.extras
                with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
                    cur.execute("""
                        SELECT * FROM otp_verifications
                        WHERE email = %s AND purpose = %s AND is_used = 0
                        ORDER BY created_at DESC LIMIT 1;
                    """, (norm_email, purpose))
                    row = cur.fetchone()
                    if row:
                        return dict(row)
                    return None
            else:
                cur = conn.execute("""
                    SELECT * FROM otp_verifications
                    WHERE email = ? AND purpose = ? AND is_used = 0
                    ORDER BY created_at DESC LIMIT 1;
                """, (norm_email, purpose))
                row = cur.fetchone()
                if row:
                    return dict(row)
                return None
        finally:
            conn.close()

    def increment_otp_failed_attempts(self, record_id: str) -> int:
        """Increments failed attempt counter for an OTP record and returns the updated count."""
        conn = self._get_connection()
        try:
            if self.is_postgres:
                with conn.cursor() as cur:
                    cur.execute("""
                        UPDATE otp_verifications
                        SET failed_attempts = failed_attempts + 1
                        WHERE id = %s
                        RETURNING failed_attempts;
                    """, (record_id,))
                    row = cur.fetchone()
                    conn.commit()
                    return row[0] if row else 1
            else:
                with conn:
                    conn.execute("""
                        UPDATE otp_verifications
                        SET failed_attempts = failed_attempts + 1
                        WHERE id = ?;
                    """, (record_id,))
                    cur = conn.execute("SELECT failed_attempts FROM otp_verifications WHERE id = ?;", (record_id,))
                    row = cur.fetchone()
                    return row["failed_attempts"] if row else 1
        finally:
            conn.close()

    def update_otp_resend(self, record_id: str, new_otp_hash: str, new_expires_at: str) -> Dict[str, Any]:
        """Updates an OTP record with a new hash, reset failed attempts, and incremented resend count."""
        now_str = datetime.now(timezone.utc).isoformat()
        conn = self._get_connection()
        try:
            if self.is_postgres:
                with conn.cursor() as cur:
                    cur.execute("""
                        UPDATE otp_verifications
                        SET otp_hash = %s,
                            expires_at = %s,
                            resend_count = resend_count + 1,
                            last_resend_at = %s,
                            failed_attempts = 0
                        WHERE id = %s
                        RETURNING resend_count, last_resend_at, expires_at;
                    """, (new_otp_hash, new_expires_at, now_str, record_id))
                    row = cur.fetchone()
                    conn.commit()
                    return {
                        "resend_count": row[0],
                        "last_resend_at": row[1],
                        "expires_at": row[2]
                    }
            else:
                with conn:
                    conn.execute("""
                        UPDATE otp_verifications
                        SET otp_hash = ?,
                            expires_at = ?,
                            resend_count = resend_count + 1,
                            last_resend_at = ?,
                            failed_attempts = 0
                        WHERE id = ?;
                    """, (new_otp_hash, new_expires_at, now_str, record_id))
                    cur = conn.execute("SELECT resend_count, last_resend_at, expires_at FROM otp_verifications WHERE id = ?;", (record_id,))
                    row = cur.fetchone()
                    return {
                        "resend_count": row["resend_count"],
                        "last_resend_at": row["last_resend_at"],
                        "expires_at": row["expires_at"]
                    }
        finally:
            conn.close()

    def mark_otp_used(self, record_id: str):
        """Marks an OTP record as consumed."""
        conn = self._get_connection()
        try:
            if self.is_postgres:
                with conn.cursor() as cur:
                    cur.execute("UPDATE otp_verifications SET is_used = 1 WHERE id = %s;", (record_id,))
                    conn.commit()
            else:
                with conn:
                    conn.execute("UPDATE otp_verifications SET is_used = 1 WHERE id = ?;", (record_id,))
        finally:
            conn.close()

    # ================= USED SECURITY TOKENS =================
    def mark_token_used(self, jti: str, purpose: str = "password_reset"):
        """Records a token ID (jti) as consumed to prevent replay attacks."""
        now_str = datetime.now(timezone.utc).isoformat()
        conn = self._get_connection()
        try:
            if self.is_postgres:
                with conn.cursor() as cur:
                    cur.execute("INSERT INTO used_tokens (jti, purpose, created_at) VALUES (%s, %s, %s);", (jti, purpose, now_str))
                    conn.commit()
            else:
                with conn:
                    conn.execute("INSERT OR REPLACE INTO used_tokens (jti, purpose, created_at) VALUES (?, ?, ?);", (jti, purpose, now_str))
        finally:
            conn.close()

    def is_token_used(self, jti: str) -> bool:
        """Checks if a token ID (jti) has already been consumed."""
        conn = self._get_connection()
        try:
            if self.is_postgres:
                with conn.cursor() as cur:
                    cur.execute("SELECT 1 FROM used_tokens WHERE jti = %s LIMIT 1;", (jti,))
                    return cur.fetchone() is not None
            else:
                cur = conn.execute("SELECT 1 FROM used_tokens WHERE jti = ? LIMIT 1;", (jti,))
                return cur.fetchone() is not None
        finally:
            conn.close()

# Global Auth Database Singleton
auth_db = AuthDatabase()
