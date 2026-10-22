"""
CrediLens Financial Data Integration Hub — Sync & Orchestration Service
Coordinates execution of connection tests, synchronization runs, and transaction retrieval.
"""

from typing import Dict, Any, Optional, List, Tuple
from fastapi import HTTPException, status

from .registry import registry
from .schemas import (
    IntegrationStatus,
    SyncResponse,
    TestConnectionResponse,
    ConfigureProviderRequest,
    ConfigureProviderResponse,
    TransactionsListResponse,
    FinancialTransactionModel,
    BankConsentRequest,
    BankConsentResponse
)
from .db import integration_db
from .bank.account_aggregator_adapter import AccountAggregatorAdapter

class SyncService:
    """Orchestrates integration operations across registered adapters."""

    def test_provider(self, provider: str) -> TestConnectionResponse:
        adapter = registry.get_adapter(provider)
        if not adapter:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Integration provider '{provider}' is not supported."
            )
        return adapter.test_connection()

    def sync_provider(self, provider: str, options: Optional[Dict[str, Any]] = None) -> SyncResponse:
        adapter = registry.get_adapter(provider)
        if not adapter:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Integration provider '{provider}' is not supported."
            )

        success, sync_run, msg = adapter.sync_data(options)
        new_status = IntegrationStatus.SYNCED if success else IntegrationStatus.ERROR

        return SyncResponse(
            provider=provider,
            success=success,
            status=new_status,
            sync_run=sync_run,
            message=msg
        )

    def configure_provider(self, provider: str, req: ConfigureProviderRequest) -> ConfigureProviderResponse:
        adapter = registry.get_adapter(provider)
        if not adapter:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Integration provider '{provider}' is not supported."
            )

        is_valid, msg, meta = adapter.configure(
            credentials=req.credentials,
            environment=req.environment
        )

        st = IntegrationStatus.CONFIGURED if is_valid else IntegrationStatus.NOT_CONFIGURED

        return ConfigureProviderResponse(
            provider=provider,
            status=st,
            message=msg,
            config_metadata=meta
        )

    def get_transactions(
        self,
        provider: Optional[str] = None,
        source: Optional[str] = None,
        msme_id: Optional[str] = None,
        file_id: Optional[str] = None,
        status_filter: Optional[str] = None,
        search: Optional[str] = None,
        page: int = 1,
        limit: int = 50
    ) -> TransactionsListResponse:
        total, rows, summary = integration_db.get_transactions(
            provider=provider,
            source=source,
            msme_id=msme_id,
            file_id=file_id,
            status=status_filter,
            search=search,
            page=page,
            limit=limit
        )

        tx_models = []
        for r in rows:
            tx_models.append(FinancialTransactionModel(
                transaction_id=r["transaction_id"],
                provider=r["provider"],
                external_id=r["external_id"],
                msme_id=r.get("msme_id"),
                transaction_date=r["transaction_date"],
                amount=float(r["amount"]),
                currency=r.get("currency", "INR"),
                status=r["status"],
                direction=r["direction"],
                payment_method=r.get("payment_method"),
                payer_email=r.get("payer_email"),
                payer_contact=r.get("payer_contact"),
                description=r.get("description"),
                source_environment=r["source_environment"],
                provenance=r["provenance"],
                sync_run_id=r.get("sync_run_id"),
                debit_amount=float(r["debit_amount"]) if r.get("debit_amount") is not None else None,
                credit_amount=float(r["credit_amount"]) if r.get("credit_amount") is not None else None,
                balance=float(r["balance"]) if r.get("balance") is not None else None,
                transaction_type=r.get("transaction_type"),
                validation_status=r.get("validation_status"),
                file_id=r.get("file_id"),
                source=r.get("source"),
                created_at=r["created_at"]
            ))

        return TransactionsListResponse(
            total=total,
            page=page,
            limit=limit,
            transactions=tx_models,
            summary=summary
        )

    def initiate_bank_consent(self, req: BankConsentRequest) -> BankConsentResponse:
        adapter = registry.get_adapter("bank_aa")
        if not adapter or not isinstance(adapter, AccountAggregatorAdapter):
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Account Aggregator adapter not available."
            )

        return adapter.start_consent_flow(
            customer_identifier=req.customer_identifier,
            msme_id=req.msme_id,
            data_scopes=req.data_scopes,
            date_range_months=req.date_range_months
        )

    def check_bank_consent(self, consent_id: str) -> Dict[str, Any]:
        adapter = registry.get_adapter("bank_aa")
        if not adapter or not isinstance(adapter, AccountAggregatorAdapter):
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Account Aggregator adapter not available."
            )
        return adapter.check_consent_status(consent_id)

sync_service = SyncService()
