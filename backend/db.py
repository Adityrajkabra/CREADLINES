"""
CrediLens — PostgreSQL / InMemory Hybrid Database Connector
Seamlessly connects to PostgreSQL if available, otherwise runs on deterministic seeded memory store.
"""

import os
import json
from typing import Optional, List, Dict, Any
from synthetic_data import generate_synthetic_dataset

DATABASE_URL = os.getenv("DATABASE_URL", None)

class DatabaseSession:
    def __init__(self):
        self.is_postgres = False
        self.connection = None
        self._init_db()

    def _init_db(self):
        if DATABASE_URL:
            try:
                import psycopg2
                self.connection = psycopg2.connect(DATABASE_URL)
                self.is_postgres = True
                self._create_tables()
            except Exception as e:
                print(f"[CrediLens DB] PostgreSQL connection unavailable ({e}). Using deterministic in-memory store.")
                self.is_postgres = False
        else:
            self.is_postgres = False

    def _create_tables(self):
        if not self.connection:
            return
        with self.connection.cursor() as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS msme_records (
                    msme_id VARCHAR(50) PRIMARY KEY,
                    business_name VARCHAR(255) NOT NULL,
                    sector VARCHAR(100) NOT NULL,
                    data JSONB NOT NULL
                );
            """)
            self.connection.commit()

db = DatabaseSession()
