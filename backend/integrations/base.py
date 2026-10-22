"""
CrediLens Financial Data Integration Hub — Base Provider Adapter
Defines the standard contract and lifecycle hooks for all financial data adapters.
"""

from abc import ABC, abstractmethod
from typing import Dict, Any, List, Tuple, Optional
from datetime import datetime, timezone

from .schemas import (
    IntegrationCategory,
    IntegrationEnvironment,
    IntegrationStatus,
    DataConnectionModel,
    DataConnectionStats,
    TestConnectionResponse,
    SyncRunModel,
    SyncStatus
)
from .db import integration_db

class BaseIntegrationAdapter(ABC):
    """
    Abstract base adapter for all financial data providers in CrediLens.
    Enforces typed contracts, credential safety, and standardized sync flows.
    """

    def __init__(
        self,
        provider: str,
        display_name: str,
        category: IntegrationCategory,
        environment: IntegrationEnvironment = IntegrationEnvironment.SANDBOX
    ):
        self.provider = provider
        self.display_name = display_name
        self.category = category
        self.environment = environment

    @abstractmethod
    def validate_configuration(self) -> Tuple[bool, str, Dict[str, Any]]:
        """
        Validates whether required credentials exist in environment or database.
        Returns (is_valid: bool, error_or_info_msg: str, metadata: dict).
        Metadata must never contain unmasked secrets.
        """
        pass

    @abstractmethod
    def test_connection(self) -> TestConnectionResponse:
        """
        Calls provider API to verify credentials and endpoint reachability.
        """
        pass

    @abstractmethod
    def sync_data(self, options: Optional[Dict[str, Any]] = None) -> Tuple[bool, SyncRunModel, str]:
        """
        Executes synchronization of financial records from the provider.
        Returns (success: bool, sync_run: SyncRunModel, message: str).
        """
        pass

    def get_supported_operations(self) -> List[str]:
        """Returns the list of actions supported by this adapter in its current state."""
        return ["configure", "test_connection", "sync_data", "view_transactions", "view_sync_history"]

    def get_status(self) -> DataConnectionModel:
        """
        Retrieves the consolidated connection status, configuration readiness,
        and real-time transaction stats from the database.
        """
        conn_record = integration_db.get_connection(self.provider)
        stats_dict = integration_db.get_connection_stats(self.provider)

        is_valid, info_msg, meta = self.validate_configuration()

        if not conn_record:
            init_status = IntegrationStatus.CONFIGURED if is_valid else IntegrationStatus.NOT_CONFIGURED
            conn_record = integration_db.upsert_connection(
                provider=self.provider,
                display_name=self.display_name,
                category=self.category.value,
                environment=self.environment.value,
                status=init_status.value,
                config_metadata=meta,
                error_message=None if is_valid else info_msg
            )

        # Re-evaluate status if credentials were added/removed
        current_status = conn_record.get("status", IntegrationStatus.NOT_CONFIGURED.value)
        if not is_valid and current_status in [IntegrationStatus.CONNECTED.value, IntegrationStatus.CONFIGURED.value]:
            current_status = IntegrationStatus.NOT_CONFIGURED.value
            integration_db.update_connection_status(self.provider, current_status, error_message=info_msg)
        elif is_valid and current_status == IntegrationStatus.NOT_CONFIGURED.value:
            current_status = IntegrationStatus.CONFIGURED.value
            integration_db.update_connection_status(self.provider, current_status, error_message=None)

        return DataConnectionModel(
            connection_id=conn_record.get("connection_id", f"conn_{self.provider}"),
            provider=self.provider,
            display_name=self.display_name,
            category=self.category,
            environment=self.environment,
            status=IntegrationStatus(current_status),
            config_metadata=meta,
            last_tested_at=conn_record.get("last_tested_at"),
            last_synced_at=conn_record.get("last_synced_at"),
            error_message=conn_record.get("error_message"),
            supported_operations=self.get_supported_operations(),
            stats=DataConnectionStats(**stats_dict)
        )

    def get_sync_history(self, limit: int = 20) -> List[Dict[str, Any]]:
        """Retrieves recent synchronization runs for this provider."""
        return integration_db.get_sync_runs(provider=self.provider, limit=limit)

    def configure(
        self,
        credentials: Dict[str, str],
        environment: Optional[str] = None
    ) -> Tuple[bool, str, Dict[str, Any]]:
        """
        Saves updated provider credentials securely in the database.
        """
        env = environment or self.environment.value
        key_id = credentials.get("key_id") or credentials.get("username") or credentials.get("client_id")
        key_secret = credentials.get("key_secret") or credentials.get("password") or credentials.get("client_secret")

        extra = {k: v for k, v in credentials.items() if k not in ["key_id", "key_secret", "username", "password", "client_id", "client_secret"]}

        integration_db.save_credentials(
            provider=self.provider,
            key_id=key_id,
            key_secret=key_secret,
            environment=env,
            extra_data=extra
        )

        is_valid, msg, meta = self.validate_configuration()
        new_status = IntegrationStatus.CONFIGURED if is_valid else IntegrationStatus.NOT_CONFIGURED
        integration_db.update_connection_status(
            self.provider,
            new_status.value,
            error_message=None if is_valid else msg,
            metadata=meta
        )

        return is_valid, msg, meta
