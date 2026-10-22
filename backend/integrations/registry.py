"""
CrediLens Financial Data Integration Hub — Central Integration Registry
Discovers, instantiates, and aggregates status for all data adapters.
Computes real-time dashboard summary metrics from actual database states.
"""

from typing import Dict, List, Optional
from datetime import datetime

from .base import BaseIntegrationAdapter
from .schemas import (
    IntegrationSummaryResponse,
    DataConnectionModel,
    IntegrationStatus
)
from .payment.razorpay_adapter import RazorpayAdapter
from .bank.account_aggregator_adapter import AccountAggregatorAdapter
from .gst.gsp_adapter import GspAdapter
from .db import integration_db

class IntegrationRegistry:
    """
    Central discovery registry for financial data providers.
    Prevents hardcoding provider logic in API routes and business services.
    """

    def __init__(self):
        self._adapters: Dict[str, BaseIntegrationAdapter] = {}
        self._register_default_adapters()

    def _register_default_adapters(self):
        """Registers the 3 primary financial integrations."""
        self.register(RazorpayAdapter())
        self.register(AccountAggregatorAdapter())
        self.register(GspAdapter())

    def register(self, adapter: BaseIntegrationAdapter):
        """Registers an integration adapter."""
        self._adapters[adapter.provider] = adapter

    def get_adapter(self, provider: str) -> Optional[BaseIntegrationAdapter]:
        """Looks up adapter by provider identifier."""
        return self._adapters.get(provider.lower())

    def list_adapters(self) -> List[BaseIntegrationAdapter]:
        """Returns all registered integration adapters in order."""
        return list(self._adapters.values())

    def get_summary(self) -> IntegrationSummaryResponse:
        """
        Calculates live dashboard summary KPIs from database transactions
        and real adapter connection states. Never hardcodes success counts.
        """
        connections: List[DataConnectionModel] = []
        connected_count = 0
        awaiting_count = 0
        latest_sync: Optional[str] = None
        total_tx_count = 0
        has_error = False

        for adapter in self.list_adapters():
            status_model = adapter.get_status()
            connections.append(status_model)

            st = status_model.status
            if st in (IntegrationStatus.CONNECTED, IntegrationStatus.SYNCED):
                connected_count += 1
            elif st in (IntegrationStatus.NOT_CONFIGURED, IntegrationStatus.NOT_CONNECTED, IntegrationStatus.AWAITING_CONSENT):
                awaiting_count += 1
            elif st == IntegrationStatus.ERROR:
                has_error = True

            # Track latest successful sync
            if status_model.last_synced_at:
                if not latest_sync or status_model.last_synced_at > latest_sync:
                    latest_sync = status_model.last_synced_at

            # Add imported records
            total_tx_count += status_model.stats.total_records

        # Calculate overall integration health
        if has_error:
            health = "DEGRADED"
        elif connected_count > 0:
            health = "HEALTHY"
        else:
            health = "ACTION_REQUIRED"

        return IntegrationSummaryResponse(
            total_integrations=len(self._adapters),
            connected_integrations=connected_count,
            awaiting_configuration=awaiting_count,
            last_successful_sync=latest_sync,
            total_imported_transactions=total_tx_count,
            overall_health=health,
            integrations=connections
        )

# Global registry singleton
registry = IntegrationRegistry()
