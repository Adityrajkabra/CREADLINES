"""
CrediLens Financial Data Integration Hub — Schemas & Data Contracts
Defines typed models for status tracking, sync operations, normalized transactions,
and provider configurations.
"""

from enum import Enum
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field

class IntegrationCategory(str, Enum):
    PAYMENT = "PAYMENT"
    BANK = "BANK"
    TAX = "TAX"

class IntegrationEnvironment(str, Enum):
    SANDBOX = "SANDBOX"
    DEMO = "DEMO"
    LIVE = "LIVE"

class IntegrationStatus(str, Enum):
    NOT_CONFIGURED = "NOT_CONFIGURED"
    NOT_CONNECTED = "NOT_CONNECTED"
    CONFIGURED = "CONFIGURED"
    TESTING = "TESTING"
    CONNECTED = "CONNECTED"
    SYNCING = "SYNCING"
    SYNCED = "SYNCED"
    AWAITING_CONSENT = "AWAITING_CONSENT"
    CONSENT_EXPIRED = "CONSENT_EXPIRED"
    ERROR = "ERROR"

class SyncStatus(str, Enum):
    STARTED = "STARTED"
    SUCCESS = "SUCCESS"
    PARTIAL = "PARTIAL"
    FAILED = "FAILED"

class TransactionDirection(str, Enum):
    INFLOW = "INFLOW"
    OUTFLOW = "OUTFLOW"

class DataConnectionStats(BaseModel):
    total_records: int = 0
    total_amount: float = 0.0
    currency: str = "INR"
    status_breakdown: Dict[str, int] = Field(default_factory=dict)
    last_sync_duration_ms: Optional[int] = None

class DataConnectionModel(BaseModel):
    connection_id: str
    provider: str
    display_name: str
    category: IntegrationCategory
    environment: IntegrationEnvironment
    status: IntegrationStatus
    config_metadata: Dict[str, Any] = Field(default_factory=dict)
    last_tested_at: Optional[str] = None
    last_synced_at: Optional[str] = None
    error_message: Optional[str] = None
    supported_operations: List[str] = Field(default_factory=list)
    stats: DataConnectionStats = Field(default_factory=DataConnectionStats)

class IntegrationSummaryResponse(BaseModel):
    total_integrations: int
    connected_integrations: int
    awaiting_configuration: int
    last_successful_sync: Optional[str] = None
    total_imported_transactions: int
    overall_health: str
    integrations: List[DataConnectionModel]

class SyncRunModel(BaseModel):
    sync_run_id: str
    connection_id: str
    provider: str
    status: SyncStatus
    records_retrieved: int = 0
    records_inserted: int = 0
    records_updated: int = 0
    records_skipped: int = 0
    error_message: Optional[str] = None
    started_at: str
    completed_at: Optional[str] = None
    batch_id: str
    duration_seconds: Optional[float] = None

class FinancialTransactionModel(BaseModel):
    transaction_id: str
    provider: str
    external_id: str
    msme_id: Optional[str] = None
    transaction_date: str
    amount: float
    currency: str = "INR"
    status: str
    direction: TransactionDirection
    payment_method: Optional[str] = None
    payer_email: Optional[str] = None
    payer_contact: Optional[str] = None
    description: Optional[str] = None
    source_environment: IntegrationEnvironment
    provenance: str
    sync_run_id: Optional[str] = None
    debit_amount: Optional[float] = None
    credit_amount: Optional[float] = None
    balance: Optional[float] = None
    transaction_type: Optional[str] = None
    validation_status: Optional[str] = None
    file_id: Optional[str] = None
    source: Optional[str] = None
    created_at: str

class TransactionsListResponse(BaseModel):
    total: int
    page: int
    limit: int
    transactions: List[FinancialTransactionModel]
    summary: Dict[str, Any] = Field(default_factory=dict)

class ImportedFileModel(BaseModel):
    file_id: str
    filename: str
    file_type: str
    file_size_bytes: int
    dataset_type: str
    total_rows: int = 0
    valid_rows: int = 0
    invalid_rows: int = 0
    duplicate_rows: int = 0
    warnings_count: int = 0
    status: str
    msme_id: Optional[str] = None
    error_report: List[Dict[str, Any]] = Field(default_factory=list)
    column_mapping: Dict[str, str] = Field(default_factory=dict)
    imported_at: Optional[str] = None
    created_by: Optional[str] = None
    created_at: str
    updated_at: str

class DataManagementSummaryResponse(BaseModel):
    total_providers: int
    connected_providers: int
    total_imported_files: int
    total_transactions: int
    provider_transactions: int
    imported_file_transactions: int
    last_sync_time: Optional[str] = None
    last_import_time: Optional[str] = None
    recent_activity: List[Dict[str, Any]] = Field(default_factory=list)
    data_quality: Dict[str, Any] = Field(default_factory=dict)

class TestConnectionResponse(BaseModel):
    provider: str
    success: bool
    status: IntegrationStatus
    message: str
    tested_at: str
    details: Optional[Dict[str, Any]] = None

class SyncResponse(BaseModel):
    provider: str
    success: bool
    status: IntegrationStatus
    sync_run: SyncRunModel
    message: str

class ConfigureProviderRequest(BaseModel):
    environment: Optional[str] = None
    credentials: Dict[str, str] = Field(default_factory=dict)

class ConfigureProviderResponse(BaseModel):
    provider: str
    status: IntegrationStatus
    message: str
    config_metadata: Dict[str, Any]

class BankConsentRequest(BaseModel):
    customer_identifier: str = Field(..., min_length=3, max_length=100)
    msme_id: Optional[str] = Field(default=None)
    data_scopes: List[str] = Field(default_factory=lambda: ["TRANSACTIONS", "PROFILE", "SUMMARY"])
    date_range_months: int = Field(default=12, ge=1, le=36)

class BankConsentResponse(BaseModel):
    consent_id: str
    provider: str
    customer_identifier: Optional[str] = None
    consent_handle: str
    status: str
    consent_url: Optional[str] = None
    expires_at: str
    data_scopes: List[str]
    message: str
