"""
CrediLens Financial Data Integration Hub — Persistent Storage Layer
Manages data_connections, connection_sync_runs, financial_transactions,
provider_consents, and secure credential storage in SQLite/PostgreSQL.
"""

import os
import json
import sqlite3
import uuid
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List, Tuple
from dotenv import load_dotenv

load_dotenv()

DB_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "credilens_users.db")
DATABASE_URL = os.getenv("DATABASE_URL", None)

class IntegrationDatabase:
    def __init__(self):
        self.is_postgres = False
        self._init_db()

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
        """Initializes tables for integrations, sync runs, transactions, and consents."""
        if DATABASE_URL:
            try:
                import psycopg2
                conn = psycopg2.connect(DATABASE_URL)
                with conn.cursor() as cur:
                    cur.execute("""
                        CREATE TABLE IF NOT EXISTS data_connections (
                            connection_id VARCHAR(100) PRIMARY KEY,
                            provider VARCHAR(50) UNIQUE NOT NULL,
                            display_name VARCHAR(100) NOT NULL,
                            category VARCHAR(50) NOT NULL,
                            environment VARCHAR(50) NOT NULL,
                            status VARCHAR(50) NOT NULL,
                            config_metadata TEXT NOT NULL DEFAULT '{}',
                            last_tested_at VARCHAR(100),
                            last_synced_at VARCHAR(100),
                            error_message TEXT,
                            created_at VARCHAR(100) NOT NULL,
                            updated_at VARCHAR(100) NOT NULL
                        );

                        CREATE TABLE IF NOT EXISTS connection_sync_runs (
                            sync_run_id VARCHAR(100) PRIMARY KEY,
                            connection_id VARCHAR(100) NOT NULL,
                            provider VARCHAR(50) NOT NULL,
                            status VARCHAR(50) NOT NULL,
                            records_retrieved INT NOT NULL DEFAULT 0,
                            records_inserted INT NOT NULL DEFAULT 0,
                            records_updated INT NOT NULL DEFAULT 0,
                            records_skipped INT NOT NULL DEFAULT 0,
                            error_message TEXT,
                            started_at VARCHAR(100) NOT NULL,
                            completed_at VARCHAR(100),
                            batch_id VARCHAR(100) NOT NULL
                        );

                        CREATE TABLE IF NOT EXISTS financial_transactions (
                            transaction_id VARCHAR(100) PRIMARY KEY,
                            provider VARCHAR(50) NOT NULL,
                            external_id VARCHAR(150) NOT NULL,
                            msme_id VARCHAR(50),
                            transaction_date VARCHAR(100) NOT NULL,
                            amount NUMERIC(15, 2) NOT NULL,
                            currency VARCHAR(10) NOT NULL DEFAULT 'INR',
                            status VARCHAR(50) NOT NULL,
                            direction VARCHAR(20) NOT NULL,
                            payment_method VARCHAR(50),
                            payer_email VARCHAR(255),
                            payer_contact VARCHAR(50),
                            description TEXT,
                            source_environment VARCHAR(50) NOT NULL,
                            provenance VARCHAR(100) NOT NULL,
                            sync_run_id VARCHAR(100),
                            raw_data TEXT,
                            created_at VARCHAR(100) NOT NULL,
                            updated_at VARCHAR(100) NOT NULL,
                            CONSTRAINT uq_provider_external_id UNIQUE (provider, external_id)
                        );

                        CREATE TABLE IF NOT EXISTS provider_consents (
                            consent_id VARCHAR(100) PRIMARY KEY,
                            provider VARCHAR(50) NOT NULL,
                            customer_identifier VARCHAR(150) NOT NULL,
                            msme_id VARCHAR(50),
                            consent_handle VARCHAR(150) NOT NULL,
                            status VARCHAR(50) NOT NULL,
                            data_scopes TEXT NOT NULL,
                            consent_url TEXT,
                            expires_at VARCHAR(100) NOT NULL,
                            created_at VARCHAR(100) NOT NULL,
                            updated_at VARCHAR(100) NOT NULL
                        );

                        CREATE TABLE IF NOT EXISTS provider_credentials (
                            provider VARCHAR(50) PRIMARY KEY,
                            key_id TEXT,
                            key_secret TEXT,
                            environment VARCHAR(50),
                            extra_data TEXT,
                            updated_at VARCHAR(100) NOT NULL
                        );

                        CREATE TABLE IF NOT EXISTS imported_files (
                            file_id VARCHAR(100) PRIMARY KEY,
                            filename VARCHAR(255) NOT NULL,
                            file_type VARCHAR(20) NOT NULL,
                            file_size_bytes INT NOT NULL,
                            dataset_type VARCHAR(50) NOT NULL,
                            total_rows INT NOT NULL DEFAULT 0,
                            valid_rows INT NOT NULL DEFAULT 0,
                            invalid_rows INT NOT NULL DEFAULT 0,
                            duplicate_rows INT NOT NULL DEFAULT 0,
                            warnings_count INT NOT NULL DEFAULT 0,
                            status VARCHAR(50) NOT NULL,
                            msme_id VARCHAR(50),
                            error_report TEXT,
                            column_mapping TEXT,
                            imported_at VARCHAR(100),
                            created_by VARCHAR(255),
                            created_at VARCHAR(100) NOT NULL,
                            updated_at VARCHAR(100) NOT NULL
                        );
                    """)
                    conn.commit()
                conn.close()
                self.is_postgres = True
                print("[CrediLens Integrations] PostgreSQL schema initialized.")
                return
            except Exception as e:
                print(f"[CrediLens Integrations] PostgreSQL unavailable ({e}). Using persistent SQLite.")
                self.is_postgres = False

        # SQLite persistent schema
        conn = sqlite3.connect(DB_FILE)
        with conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS data_connections (
                    connection_id TEXT PRIMARY KEY,
                    provider TEXT UNIQUE NOT NULL,
                    display_name TEXT NOT NULL,
                    category TEXT NOT NULL,
                    environment TEXT NOT NULL,
                    status TEXT NOT NULL,
                    config_metadata TEXT NOT NULL DEFAULT '{}',
                    last_tested_at TEXT,
                    last_synced_at TEXT,
                    error_message TEXT,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );
            """)
            conn.execute("""
                CREATE TABLE IF NOT EXISTS connection_sync_runs (
                    sync_run_id TEXT PRIMARY KEY,
                    connection_id TEXT NOT NULL,
                    provider TEXT NOT NULL,
                    status TEXT NOT NULL,
                    records_retrieved INTEGER NOT NULL DEFAULT 0,
                    records_inserted INTEGER NOT NULL DEFAULT 0,
                    records_updated INTEGER NOT NULL DEFAULT 0,
                    records_skipped INTEGER NOT NULL DEFAULT 0,
                    error_message TEXT,
                    started_at TEXT NOT NULL,
                    completed_at TEXT,
                    batch_id TEXT NOT NULL
                );
            """)
            conn.execute("""
                CREATE TABLE IF NOT EXISTS financial_transactions (
                    transaction_id TEXT PRIMARY KEY,
                    provider TEXT NOT NULL,
                    external_id TEXT NOT NULL,
                    msme_id TEXT,
                    transaction_date TEXT NOT NULL,
                    amount REAL NOT NULL,
                    currency TEXT NOT NULL DEFAULT 'INR',
                    status TEXT NOT NULL,
                    direction TEXT NOT NULL,
                    payment_method TEXT,
                    payer_email TEXT,
                    payer_contact TEXT,
                    description TEXT,
                    source_environment TEXT NOT NULL,
                    provenance TEXT NOT NULL,
                    sync_run_id TEXT,
                    raw_data TEXT,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    UNIQUE(provider, external_id)
                );
            """)
            conn.execute("""
                CREATE TABLE IF NOT EXISTS provider_consents (
                    consent_id TEXT PRIMARY KEY,
                    provider TEXT NOT NULL,
                    customer_identifier TEXT NOT NULL,
                    msme_id TEXT,
                    consent_handle TEXT NOT NULL,
                    status TEXT NOT NULL,
                    data_scopes TEXT NOT NULL,
                    consent_url TEXT,
                    expires_at TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );
            """)
            conn.execute("""
                CREATE TABLE IF NOT EXISTS provider_credentials (
                    provider TEXT PRIMARY KEY,
                    key_id TEXT,
                    key_secret TEXT,
                    environment TEXT,
                    extra_data TEXT,
                    updated_at TEXT NOT NULL
                );
            """)
            conn.execute("""
                CREATE TABLE IF NOT EXISTS imported_files (
                    file_id TEXT PRIMARY KEY,
                    filename TEXT NOT NULL,
                    file_type TEXT NOT NULL,
                    file_size_bytes INTEGER NOT NULL,
                    dataset_type TEXT NOT NULL,
                    total_rows INTEGER NOT NULL DEFAULT 0,
                    valid_rows INTEGER NOT NULL DEFAULT 0,
                    invalid_rows INTEGER NOT NULL DEFAULT 0,
                    duplicate_rows INTEGER NOT NULL DEFAULT 0,
                    warnings_count INTEGER NOT NULL DEFAULT 0,
                    status TEXT NOT NULL,
                    msme_id TEXT,
                    error_report TEXT,
                    column_mapping TEXT,
                    imported_at TEXT,
                    created_by TEXT,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );
            """)

            # Graceful column migrations for financial_transactions
            new_columns = [
                ("debit_amount", "REAL"),
                ("credit_amount", "REAL"),
                ("balance", "REAL"),
                ("transaction_type", "TEXT"),
                ("validation_status", "TEXT"),
                ("file_id", "TEXT"),
                ("source", "TEXT")
            ]
            for col_name, col_type in new_columns:
                try:
                    conn.execute(f"ALTER TABLE financial_transactions ADD COLUMN {col_name} {col_type};")
                except Exception:
                    pass  # Column already exists
        conn.close()

    # ================= CONNECTION MANAGEMENT =================

    def get_connection(self, provider: str) -> Optional[Dict[str, Any]]:
        conn = self._get_connection()
        try:
            cur = conn.cursor()
            cur.execute("SELECT * FROM data_connections WHERE provider = ?", (provider,))
            row = cur.fetchone()
            if row:
                d = dict(row)
                d["config_metadata"] = json.loads(d.get("config_metadata") or "{}")
                return d
            return None
        finally:
            conn.close()

    def upsert_connection(
        self,
        provider: str,
        display_name: str,
        category: str,
        environment: str,
        status: str,
        config_metadata: Optional[Dict[str, Any]] = None,
        last_tested_at: Optional[str] = None,
        last_synced_at: Optional[str] = None,
        error_message: Optional[str] = None
    ) -> Dict[str, Any]:
        conn = self._get_connection()
        now = datetime.now(timezone.utc).isoformat()
        meta_str = json.dumps(config_metadata or {})
        existing = self.get_connection(provider)

        try:
            with conn:
                if existing:
                    conn.execute("""
                        UPDATE data_connections
                        SET display_name = ?, category = ?, environment = ?, status = ?,
                            config_metadata = ?, last_tested_at = COALESCE(?, last_tested_at),
                            last_synced_at = COALESCE(?, last_synced_at), error_message = ?,
                            updated_at = ?
                        WHERE provider = ?
                    """, (display_name, category, environment, status, meta_str,
                          last_tested_at, last_synced_at, error_message, now, provider))
                else:
                    conn_id = f"conn_{provider}_{uuid.uuid4().hex[:8]}"
                    conn.execute("""
                        INSERT INTO data_connections
                        (connection_id, provider, display_name, category, environment, status,
                         config_metadata, last_tested_at, last_synced_at, error_message, created_at, updated_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (conn_id, provider, display_name, category, environment, status,
                          meta_str, last_tested_at, last_synced_at, error_message, now, now))
            return self.get_connection(provider) or {}
        finally:
            conn.close()

    def update_connection_status(
        self,
        provider: str,
        status: str,
        error_message: Optional[str] = None,
        last_tested_at: Optional[str] = None,
        last_synced_at: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ):
        conn = self._get_connection()
        now = datetime.now(timezone.utc).isoformat()
        try:
            with conn:
                if metadata is not None:
                    meta_str = json.dumps(metadata)
                    conn.execute("""
                        UPDATE data_connections
                        SET status = ?, error_message = ?, config_metadata = ?,
                            last_tested_at = COALESCE(?, last_tested_at),
                            last_synced_at = COALESCE(?, last_synced_at),
                            updated_at = ?
                        WHERE provider = ?
                    """, (status, error_message, meta_str, last_tested_at, last_synced_at, now, provider))
                else:
                    conn.execute("""
                        UPDATE data_connections
                        SET status = ?, error_message = ?,
                            last_tested_at = COALESCE(?, last_tested_at),
                            last_synced_at = COALESCE(?, last_synced_at),
                            updated_at = ?
                        WHERE provider = ?
                    """, (status, error_message, last_tested_at, last_synced_at, now, provider))
        finally:
            conn.close()

    def get_all_connections(self) -> List[Dict[str, Any]]:
        conn = self._get_connection()
        try:
            cur = conn.cursor()
            cur.execute("SELECT * FROM data_connections ORDER BY created_at ASC")
            rows = cur.fetchall()
            result = []
            for r in rows:
                d = dict(r)
                d["config_metadata"] = json.loads(d.get("config_metadata") or "{}")
                result.append(d)
            return result
        finally:
            conn.close()

    # ================= CREDENTIAL STORAGE (SECURE & ISOLATED) =================

    def save_credentials(
        self,
        provider: str,
        key_id: Optional[str],
        key_secret: Optional[str],
        environment: str = "SANDBOX",
        extra_data: Optional[Dict[str, Any]] = None
    ):
        conn = self._get_connection()
        now = datetime.now(timezone.utc).isoformat()
        extra_str = json.dumps(extra_data or {})
        try:
            with conn:
                conn.execute("""
                    INSERT INTO provider_credentials (provider, key_id, key_secret, environment, extra_data, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?)
                    ON CONFLICT(provider) DO UPDATE SET
                        key_id = COALESCE(excluded.key_id, provider_credentials.key_id),
                        key_secret = COALESCE(excluded.key_secret, provider_credentials.key_secret),
                        environment = excluded.environment,
                        extra_data = excluded.extra_data,
                        updated_at = excluded.updated_at
                """, (provider, key_id, key_secret, environment, extra_str, now))
        finally:
            conn.close()

    def get_credentials(self, provider: str) -> Optional[Dict[str, Any]]:
        conn = self._get_connection()
        try:
            cur = conn.cursor()
            cur.execute("SELECT * FROM provider_credentials WHERE provider = ?", (provider,))
            row = cur.fetchone()
            if row:
                d = dict(row)
                d["extra_data"] = json.loads(d.get("extra_data") or "{}")
                return d
            return None
        finally:
            conn.close()

    # ================= SYNC RUN TRACKING =================

    def create_sync_run(
        self,
        connection_id: str,
        provider: str,
        batch_id: str
    ) -> Dict[str, Any]:
        conn = self._get_connection()
        sync_run_id = f"sync_{provider}_{uuid.uuid4().hex[:8]}"
        now = datetime.now(timezone.utc).isoformat()
        try:
            with conn:
                conn.execute("""
                    INSERT INTO connection_sync_runs
                    (sync_run_id, connection_id, provider, status, records_retrieved,
                     records_inserted, records_updated, records_skipped, started_at, batch_id)
                    VALUES (?, ?, ?, 'STARTED', 0, 0, 0, 0, ?, ?)
                """, (sync_run_id, connection_id, provider, now, batch_id))
            return self.get_sync_run(sync_run_id) or {}
        finally:
            conn.close()

    def update_sync_run(
        self,
        sync_run_id: str,
        status: str,
        records_retrieved: int = 0,
        records_inserted: int = 0,
        records_updated: int = 0,
        records_skipped: int = 0,
        error_message: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        conn = self._get_connection()
        now = datetime.now(timezone.utc).isoformat()
        try:
            with conn:
                conn.execute("""
                    UPDATE connection_sync_runs
                    SET status = ?, records_retrieved = ?, records_inserted = ?,
                        records_updated = ?, records_skipped = ?, error_message = ?,
                        completed_at = ?
                    WHERE sync_run_id = ?
                """, (status, records_retrieved, records_inserted, records_updated,
                      records_skipped, error_message, now, sync_run_id))
            return self.get_sync_run(sync_run_id)
        finally:
            conn.close()

    def get_sync_run(self, sync_run_id: str) -> Optional[Dict[str, Any]]:
        conn = self._get_connection()
        try:
            cur = conn.cursor()
            cur.execute("SELECT * FROM connection_sync_runs WHERE sync_run_id = ?", (sync_run_id,))
            row = cur.fetchone()
            if row:
                d = dict(row)
                if d.get("started_at") and d.get("completed_at"):
                    try:
                        t1 = datetime.fromisoformat(d["started_at"])
                        t2 = datetime.fromisoformat(d["completed_at"])
                        d["duration_seconds"] = round((t2 - t1).total_seconds(), 2)
                    except Exception:
                        d["duration_seconds"] = None
                return d
            return None
        finally:
            conn.close()

    def get_sync_runs(self, provider: Optional[str] = None, limit: int = 30) -> List[Dict[str, Any]]:
        conn = self._get_connection()
        try:
            cur = conn.cursor()
            if provider:
                cur.execute("""
                    SELECT * FROM connection_sync_runs
                    WHERE provider = ?
                    ORDER BY started_at DESC LIMIT ?
                """, (provider, limit))
            else:
                cur.execute("""
                    SELECT * FROM connection_sync_runs
                    ORDER BY started_at DESC LIMIT ?
                """, (limit,))
            rows = cur.fetchall()
            results = []
            for r in rows:
                d = dict(r)
                if d.get("started_at") and d.get("completed_at"):
                    try:
                        t1 = datetime.fromisoformat(d["started_at"])
                        t2 = datetime.fromisoformat(d["completed_at"])
                        d["duration_seconds"] = round((t2 - t1).total_seconds(), 2)
                    except Exception:
                        d["duration_seconds"] = None
                results.append(d)
            return results
        finally:
            conn.close()

    # ================= FINANCIAL TRANSACTIONS (IDEMPOTENT UPSERT) =================

    def upsert_transaction(self, tx: Dict[str, Any]) -> Tuple[str, bool]:
        """
        Idempotently inserts or updates a financial transaction.
        Returns (transaction_id, is_new_record: bool).
        """
        conn = self._get_connection()
        now = datetime.now(timezone.utc).isoformat()
        tx_id = tx.get("transaction_id") or f"tx_{uuid.uuid4().hex[:12]}"
        source = tx.get("source") or tx["provider"]

        raw_str = json.dumps(tx.get("raw_data") or {}) if isinstance(tx.get("raw_data"), dict) else (tx.get("raw_data") or "")

        try:
            with conn:
                cur = conn.cursor()
                # Check existing by (provider, external_id)
                cur.execute("""
                    SELECT transaction_id FROM financial_transactions
                    WHERE provider = ? AND external_id = ?
                """, (tx["provider"], tx["external_id"]))
                existing = cur.fetchone()

                if existing:
                    existing_id = existing["transaction_id"]
                    cur.execute("""
                        UPDATE financial_transactions
                        SET amount = ?, currency = ?, status = ?, direction = ?,
                            payment_method = ?, payer_email = ?, payer_contact = ?,
                            description = ?, source_environment = ?, provenance = ?,
                            sync_run_id = ?, raw_data = ?, debit_amount = ?, credit_amount = ?,
                            balance = ?, transaction_type = ?, validation_status = ?,
                            file_id = ?, source = ?, updated_at = ?
                        WHERE transaction_id = ?
                    """, (tx["amount"], tx.get("currency", "INR"), tx["status"], tx["direction"],
                          tx.get("payment_method"), tx.get("payer_email"), tx.get("payer_contact"),
                          tx.get("description"), tx["source_environment"], tx["provenance"],
                          tx.get("sync_run_id"), raw_str, tx.get("debit_amount"), tx.get("credit_amount"),
                          tx.get("balance"), tx.get("transaction_type"), tx.get("validation_status", "VALID"),
                          tx.get("file_id"), source, now, existing_id))
                    return existing_id, False
                else:
                    cur.execute("""
                        INSERT INTO financial_transactions
                        (transaction_id, provider, external_id, msme_id, transaction_date,
                         amount, currency, status, direction, payment_method, payer_email,
                         payer_contact, description, source_environment, provenance,
                         sync_run_id, raw_data, debit_amount, credit_amount, balance,
                         transaction_type, validation_status, file_id, source, created_at, updated_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (tx_id, tx["provider"], tx["external_id"], tx.get("msme_id"),
                          tx["transaction_date"], tx["amount"], tx.get("currency", "INR"),
                          tx["status"], tx["direction"], tx.get("payment_method"),
                          tx.get("payer_email"), tx.get("payer_contact"), tx.get("description"),
                          tx["source_environment"], tx["provenance"], tx.get("sync_run_id"),
                          raw_str, tx.get("debit_amount"), tx.get("credit_amount"), tx.get("balance"),
                          tx.get("transaction_type"), tx.get("validation_status", "VALID"),
                          tx.get("file_id"), source, now, now))
                    return tx_id, True
        finally:
            conn.close()

    def get_transactions(
        self,
        provider: Optional[str] = None,
        source: Optional[str] = None,
        msme_id: Optional[str] = None,
        file_id: Optional[str] = None,
        status: Optional[str] = None,
        search: Optional[str] = None,
        page: int = 1,
        limit: int = 50
    ) -> Tuple[int, List[Dict[str, Any]], Dict[str, Any]]:
        conn = self._get_connection()
        offset = (page - 1) * limit
        query_clauses = []
        params = []

        if provider:
            query_clauses.append("provider = ?")
            params.append(provider)
        if source:
            query_clauses.append("(source = ? OR provider = ?)")
            params.extend([source, source])
        if msme_id:
            query_clauses.append("msme_id = ?")
            params.append(msme_id)
        if file_id:
            query_clauses.append("file_id = ?")
            params.append(file_id)
        if status:
            query_clauses.append("status = ?")
            params.append(status)
        if search:
            query_clauses.append("(external_id LIKE ? OR payer_email LIKE ? OR description LIKE ?)")
            term = f"%{search.strip()}%"
            params.extend([term, term, term])

        where_sql = ("WHERE " + " AND ".join(query_clauses)) if query_clauses else ""

        try:
            cur = conn.cursor()
            # Count total
            cur.execute(f"SELECT COUNT(*) as total FROM financial_transactions {where_sql}", params)
            total = cur.fetchone()["total"]

            # Aggregate summary
            cur.execute(f"""
                SELECT
                    COALESCE(SUM(amount), 0) as total_amount,
                    COUNT(CASE WHEN direction = 'INFLOW' OR direction = 'CREDIT' THEN 1 END) as inflow_count,
                    COUNT(CASE WHEN direction = 'OUTFLOW' OR direction = 'DEBIT' THEN 1 END) as outflow_count,
                    COUNT(CASE WHEN status = 'captured' OR status = 'SUCCESS' OR status = 'VALID' THEN 1 END) as successful_count
                FROM financial_transactions {where_sql}
            """, params)
            agg = dict(cur.fetchone())

            # Fetch page
            cur.execute(f"""
                SELECT * FROM financial_transactions
                {where_sql}
                ORDER BY transaction_date DESC
                LIMIT ? OFFSET ?
            """, params + [limit, offset])
            rows = [dict(r) for r in cur.fetchall()]

            return total, rows, agg
        finally:
            conn.close()

    # ================= IMPORTED FILES MANAGEMENT =================

    def insert_imported_file(self, file_data: Dict[str, Any]) -> Dict[str, Any]:
        """Creates or updates a record for an imported CSV/Excel file."""
        conn = self._get_connection()
        now = datetime.now(timezone.utc).isoformat()
        err_json = json.dumps(file_data.get("error_report") or [])
        map_json = json.dumps(file_data.get("column_mapping") or {})

        try:
            with conn:
                conn.execute("""
                    INSERT INTO imported_files
                    (file_id, filename, file_type, file_size_bytes, dataset_type,
                     total_rows, valid_rows, invalid_rows, duplicate_rows, warnings_count,
                     status, msme_id, error_report, column_mapping, imported_at,
                     created_by, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    file_data["file_id"], file_data["filename"], file_data["file_type"],
                    file_data["file_size_bytes"], file_data["dataset_type"],
                    file_data.get("total_rows", 0), file_data.get("valid_rows", 0),
                    file_data.get("invalid_rows", 0), file_data.get("duplicate_rows", 0),
                    file_data.get("warnings_count", 0), file_data.get("status", "PENDING_REVIEW"),
                    file_data.get("msme_id"), err_json, map_json,
                    file_data.get("imported_at"), file_data.get("created_by"),
                    file_data.get("created_at", now), now
                ))
            return self.get_imported_file(file_data["file_id"]) or {}
        finally:
            conn.close()

    def update_imported_file(self, file_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Updates metadata on an imported file record."""
        conn = self._get_connection()
        now = datetime.now(timezone.utc).isoformat()
        set_parts = ["updated_at = ?"]
        params = [now]

        for k, v in updates.items():
            if k in ("error_report", "column_mapping") and isinstance(v, (dict, list)):
                v = json.dumps(v)
            set_parts.append(f"{k} = ?")
            params.append(v)
        params.append(file_id)

        try:
            with conn:
                conn.execute(f"UPDATE imported_files SET {', '.join(set_parts)} WHERE file_id = ?", params)
            return self.get_imported_file(file_id)
        finally:
            conn.close()

    def get_imported_file(self, file_id: str) -> Optional[Dict[str, Any]]:
        """Retrieves a single imported file record with deserialized JSON."""
        conn = self._get_connection()
        try:
            cur = conn.cursor()
            cur.execute("SELECT * FROM imported_files WHERE file_id = ?", (file_id,))
            row = cur.fetchone()
            if row:
                d = dict(row)
                d["error_report"] = json.loads(d.get("error_report") or "[]")
                d["column_mapping"] = json.loads(d.get("column_mapping") or "{}")
                return d
            return None
        finally:
            conn.close()

    def list_imported_files(self, msme_id: Optional[str] = None, limit: int = 50) -> List[Dict[str, Any]]:
        """Lists imported files history."""
        conn = self._get_connection()
        try:
            cur = conn.cursor()
            if msme_id:
                cur.execute("""
                    SELECT * FROM imported_files
                    WHERE msme_id = ?
                    ORDER BY created_at DESC LIMIT ?
                """, (msme_id, limit))
            else:
                cur.execute("""
                    SELECT * FROM imported_files
                    ORDER BY created_at DESC LIMIT ?
                """, (limit,))
            rows = cur.fetchall()
            results = []
            for r in rows:
                d = dict(r)
                d["error_report"] = json.loads(d.get("error_report") or "[]")
                d["column_mapping"] = json.loads(d.get("column_mapping") or "{}")
                results.append(d)
            return results
        finally:
            conn.close()

    def delete_imported_file(self, file_id: str) -> bool:
        """Deletes an imported file and rolls back its transactions."""
        conn = self._get_connection()
        try:
            with conn:
                conn.execute("DELETE FROM financial_transactions WHERE file_id = ?", (file_id,))
                conn.execute("DELETE FROM imported_files WHERE file_id = ?", (file_id,))
            return True
        finally:
            conn.close()

    def get_data_management_summary(self) -> Dict[str, Any]:
        """
        Unified Data Management Overview:
        Calculates all metrics from actual database records:
        - Total connected providers
        - Total imported files
        - Total imported transactions
        - Last successful synchronization
        - Recent imports and synchronization activity
        - Data quality status
        """
        conn = self._get_connection()
        try:
            cur = conn.cursor()

            # 1. Providers count
            cur.execute("SELECT COUNT(*) as cnt FROM data_connections")
            total_providers = cur.fetchone()["cnt"]

            cur.execute("""
                SELECT COUNT(*) as cnt FROM data_connections
                WHERE status IN ('CONNECTED', 'ACTIVE', 'SYNCING')
            """)
            connected_providers = cur.fetchone()["cnt"]

            # 2. Imported files
            cur.execute("""
                SELECT COUNT(*) as cnt FROM imported_files
                WHERE status IN ('IMPORTED', 'PARTIALLY_IMPORTED')
            """)
            total_imported_files = cur.fetchone()["cnt"]

            # 3. Financial transactions breakdown
            cur.execute("SELECT COUNT(*) as cnt FROM financial_transactions")
            total_transactions = cur.fetchone()["cnt"]

            cur.execute("""
                SELECT COUNT(*) as cnt FROM financial_transactions
                WHERE provider != 'file_import' AND (source != 'FILE_IMPORT' OR source IS NULL)
            """)
            provider_transactions = cur.fetchone()["cnt"]

            cur.execute("""
                SELECT COUNT(*) as cnt FROM financial_transactions
                WHERE provider = 'file_import' OR source = 'FILE_IMPORT'
            """)
            file_transactions = cur.fetchone()["cnt"]

            # 4. Last sync & last import timestamps
            cur.execute("""
                SELECT completed_at FROM connection_sync_runs
                WHERE status = 'SUCCESS'
                ORDER BY completed_at DESC LIMIT 1
            """)
            last_sync_row = cur.fetchone()
            last_sync_time = last_sync_row["completed_at"] if last_sync_row else None

            cur.execute("""
                SELECT imported_at FROM imported_files
                WHERE status IN ('IMPORTED', 'PARTIALLY_IMPORTED') AND imported_at IS NOT NULL
                ORDER BY imported_at DESC LIMIT 1
            """)
            last_import_row = cur.fetchone()
            last_import_time = last_import_row["imported_at"] if last_import_row else None

            # 5. Recent unified activity feed
            cur.execute("""
                SELECT
                    sync_run_id as id,
                    'PROVIDER_SYNC' as activity_type,
                    provider as source_name,
                    status,
                    records_inserted as count,
                    completed_at as timestamp,
                    batch_id as details
                FROM connection_sync_runs
                WHERE completed_at IS NOT NULL
                ORDER BY completed_at DESC LIMIT 10
            """)
            sync_activities = [dict(r) for r in cur.fetchall()]

            cur.execute("""
                SELECT
                    file_id as id,
                    'FILE_IMPORT' as activity_type,
                    filename as source_name,
                    status,
                    valid_rows as count,
                    imported_at as timestamp,
                    dataset_type as details
                FROM imported_files
                WHERE imported_at IS NOT NULL
                ORDER BY imported_at DESC LIMIT 10
            """)
            import_activities = [dict(r) for r in cur.fetchall()]

            # Combine and sort by timestamp descending
            all_activities = sync_activities + import_activities
            all_activities.sort(key=lambda x: x.get("timestamp") or "", reverse=True)
            recent_activity = all_activities[:15]

            # 6. Data Quality status calculation
            cur.execute("""
                SELECT
                    COUNT(CASE WHEN status IN ('SUCCESS', 'captured', 'VALID', 'COMPLETED') THEN 1 END) as valid_cnt,
                    COUNT(*) as total_cnt
                FROM financial_transactions
            """)
            dq_row = cur.fetchone()
            total_records = dq_row["total_cnt"] if dq_row else 0
            valid_records = dq_row["valid_cnt"] if dq_row else 0
            valid_rate = round((valid_records / total_records * 100), 1) if total_records > 0 else 100.0

            # Quality status
            if valid_rate >= 95.0:
                quality_status = "EXCELLENT"
            elif valid_rate >= 80.0:
                quality_status = "GOOD"
            else:
                quality_status = "NEEDS_ATTENTION"

            return {
                "total_providers": total_providers,
                "connected_providers": connected_providers,
                "total_imported_files": total_imported_files,
                "total_transactions": total_transactions,
                "provider_transactions": provider_transactions,
                "imported_file_transactions": file_transactions,
                "last_sync_time": last_sync_time,
                "last_import_time": last_import_time,
                "recent_activity": recent_activity,
                "data_quality": {
                    "valid_rate": valid_rate,
                    "valid_records": valid_records,
                    "total_records": total_records,
                    "status": quality_status
                }
            }
        finally:
            conn.close()

    def get_connection_stats(self, provider: str) -> Dict[str, Any]:
        """Calculates live stats for a specific provider connection."""
        conn = self._get_connection()
        try:
            cur = conn.cursor()
            cur.execute("""
                SELECT
                    COUNT(*) as total_records,
                    COALESCE(SUM(amount), 0) as total_amount,
                    currency
                FROM financial_transactions
                WHERE provider = ?
                GROUP BY currency
            """, (provider,))
            base = cur.fetchone()

            total_records = base["total_records"] if base else 0
            total_amount = round(base["total_amount"], 2) if base else 0.0
            currency = base["currency"] if base else "INR"

            # Status breakdown
            cur.execute("""
                SELECT status, COUNT(*) as cnt
                FROM financial_transactions
                WHERE provider = ?
                GROUP BY status
            """, (provider,))
            status_breakdown = {row["status"]: row["cnt"] for row in cur.fetchall()}

            # Last sync duration
            cur.execute("""
                SELECT started_at, completed_at FROM connection_sync_runs
                WHERE provider = ? AND status = 'SUCCESS'
                ORDER BY completed_at DESC LIMIT 1
            """, (provider,))
            last_run = cur.fetchone()
            duration_ms = None
            if last_run and last_run["started_at"] and last_run["completed_at"]:
                try:
                    t1 = datetime.fromisoformat(last_run["started_at"])
                    t2 = datetime.fromisoformat(last_run["completed_at"])
                    duration_ms = int((t2 - t1).total_seconds() * 1000)
                except Exception:
                    pass

            return {
                "total_records": total_records,
                "total_amount": total_amount,
                "currency": currency,
                "status_breakdown": status_breakdown,
                "last_sync_duration_ms": duration_ms
            }
        finally:
            conn.close()

    # ================= PROVIDER CONSENTS (ACCOUNT AGGREGATOR) =================

    def create_consent(
        self,
        provider: str,
        customer_identifier: str,
        consent_handle: str,
        data_scopes: List[str],
        expires_at: str,
        msme_id: Optional[str] = None,
        consent_url: Optional[str] = None
    ) -> Dict[str, Any]:
        conn = self._get_connection()
        consent_id = f"cst_{provider}_{uuid.uuid4().hex[:8]}"
        now = datetime.now(timezone.utc).isoformat()
        scopes_str = json.dumps(data_scopes)
        try:
            with conn:
                conn.execute("""
                    INSERT INTO provider_consents
                    (consent_id, provider, customer_identifier, msme_id, consent_handle,
                     status, data_scopes, consent_url, expires_at, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, 'PENDING_APPROVAL', ?, ?, ?, ?, ?)
                """, (consent_id, provider, customer_identifier, msme_id, consent_handle,
                      scopes_str, consent_url, expires_at, now, now))
            return self.get_consent(consent_id) or {}
        finally:
            conn.close()

    def get_consent(self, consent_id: str) -> Optional[Dict[str, Any]]:
        conn = self._get_connection()
        try:
            cur = conn.cursor()
            cur.execute("SELECT * FROM provider_consents WHERE consent_id = ?", (consent_id,))
            row = cur.fetchone()
            if row:
                d = dict(row)
                d["data_scopes"] = json.loads(d.get("data_scopes") or "[]")
                return d
            return None
        finally:
            conn.close()

    def update_consent_status(self, consent_id: str, status: str) -> Optional[Dict[str, Any]]:
        conn = self._get_connection()
        now = datetime.now(timezone.utc).isoformat()
        try:
            with conn:
                conn.execute("""
                    UPDATE provider_consents
                    SET status = ?, updated_at = ?
                    WHERE consent_id = ?
                """, (status, now, consent_id))
            return self.get_consent(consent_id)
        finally:
            conn.close()

# Global database singleton
integration_db = IntegrationDatabase()
