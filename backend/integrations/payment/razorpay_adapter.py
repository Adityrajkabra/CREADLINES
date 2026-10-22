"""
CrediLens Financial Data Integration Hub — Razorpay Adapter
Implements official Razorpay Payments API (v1) Test Mode / Sandbox integration.
Handles credential validation, connection verification, paginated payment retrieval,
normalization, and idempotent database synchronization.
"""

import os
import base64
import httpx
from datetime import datetime, timezone
from typing import Dict, Any, List, Tuple, Optional, Callable

from ..base import BaseIntegrationAdapter
from ..schemas import (
    IntegrationCategory,
    IntegrationEnvironment,
    IntegrationStatus,
    TestConnectionResponse,
    SyncRunModel,
    SyncStatus
)
from ..security import mask_credential, generate_batch_id
from ..normalizer import normalize_razorpay_payment
from ..db import integration_db

RAZORPAY_API_BASE = "https://api.razorpay.com/v1"

class RazorpayAdapter(BaseIntegrationAdapter):
    """
    Adapter for Razorpay Payment Gateway in Test Mode / Sandbox.
    Enforces official Basic Auth authentication and endpoint specifications.
    """

    def __init__(self):
        super().__init__(
            provider="razorpay",
            display_name="Razorpay Payment Gateway",
            category=IntegrationCategory.PAYMENT,
            environment=IntegrationEnvironment.SANDBOX
        )
        self.mock_client: Optional[Callable] = None

    def set_mock_client(self, mock_fn: Optional[Callable]):
        """Sets a mock HTTP responder for automated test execution without credentials."""
        self.mock_client = mock_fn

    def _get_credentials(self) -> Tuple[Optional[str], Optional[str], str]:
        """Resolves Key ID and Key Secret from DB or environment variables."""
        db_creds = integration_db.get_credentials(self.provider)
        key_id = None
        key_secret = None
        mode = "test"

        if db_creds:
            key_id = db_creds.get("key_id")
            key_secret = db_creds.get("key_secret")
            mode = db_creds.get("environment") or "test"

        if not key_id:
            key_id = os.getenv("RAZORPAY_KEY_ID", "").strip() or None
        if not key_secret:
            key_secret = os.getenv("RAZORPAY_KEY_SECRET", "").strip() or None
        if mode == "test":
            mode = os.getenv("RAZORPAY_MODE", "test").strip().lower()

        return key_id, key_secret, mode

    def validate_configuration(self) -> Tuple[bool, str, Dict[str, Any]]:
        """Validates presence and format of Razorpay test credentials."""
        key_id, key_secret, mode = self._get_credentials()

        is_valid = bool(key_id and key_secret)
        metadata = {
            "configured": is_valid,
            "mode": mode,
            "api_endpoint": RAZORPAY_API_BASE,
            "auth_type": "HTTP Basic Auth",
            "masked_key_id": mask_credential(key_id) if key_id else None
        }

        if not is_valid:
            msg = "Razorpay credentials not configured. Please provide RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET."
            return False, msg, metadata

        # Check key ID prefix format
        if not key_id.startswith("rzp_test_") and not key_id.startswith("rzp_live_"):
            return True, "Credentials configured (non-standard key prefix).", metadata

        return True, "Razorpay test credentials ready.", metadata

    def test_connection(self) -> TestConnectionResponse:
        """
        Validates credentials by pinging Razorpay GET /v1/payments?count=1.
        """
        key_id, key_secret, mode = self._get_credentials()
        now = datetime.now(timezone.utc).isoformat()

        if not key_id or not key_secret:
            msg = "Cannot test connection: Missing Key ID or Key Secret."
            integration_db.update_connection_status(self.provider, IntegrationStatus.NOT_CONFIGURED.value, error_message=msg)
            return TestConnectionResponse(
                provider=self.provider,
                success=False,
                status=IntegrationStatus.NOT_CONFIGURED,
                message=msg,
                tested_at=now
            )

        # Automated test hook if mock is registered
        if self.mock_client:
            mock_res = self.mock_client("GET", f"{RAZORPAY_API_BASE}/payments?count=1")
            status_code = mock_res.get("status_code", 200)
            if status_code == 200:
                integration_db.update_connection_status(self.provider, IntegrationStatus.CONNECTED.value, last_tested_at=now, error_message=None)
                return TestConnectionResponse(
                    provider=self.provider,
                    success=True,
                    status=IntegrationStatus.CONNECTED,
                    message="Successfully authenticated with Razorpay Test Mode API.",
                    tested_at=now,
                    details={"entity": "collection", "merchant_status": "active", "mode": mode}
                )
            else:
                err_msg = mock_res.get("error_description", "Razorpay authentication failed.")
                integration_db.update_connection_status(self.provider, IntegrationStatus.ERROR.value, last_tested_at=now, error_message=err_msg)
                return TestConnectionResponse(
                    provider=self.provider,
                    success=False,
                    status=IntegrationStatus.ERROR,
                    message=err_msg,
                    tested_at=now
                )

        # Real HTTP connection to Razorpay API
        try:
            auth_str = f"{key_id}:{key_secret}"
            b64_auth = base64.b64encode(auth_str.encode()).decode()
            headers = {
                "Authorization": f"Basic {b64_auth}",
                "User-Agent": "CrediLens-Fintech-Underwriting/1.0"
            }

            with httpx.Client(timeout=8.0) as client:
                res = client.get(f"{RAZORPAY_API_BASE}/payments?count=1", headers=headers)

            if res.status_code == 200:
                integration_db.update_connection_status(
                    self.provider,
                    IntegrationStatus.CONNECTED.value,
                    last_tested_at=now,
                    error_message=None
                )
                return TestConnectionResponse(
                    provider=self.provider,
                    success=True,
                    status=IntegrationStatus.CONNECTED,
                    message="Successfully authenticated with Razorpay Test Mode API.",
                    tested_at=now,
                    details={"http_status": 200, "mode": mode}
                )
            elif res.status_code in (401, 403):
                err_desc = "Authentication failed: The Key ID or Key Secret is invalid or expired."
                try:
                    data = res.json()
                    if "error" in data and "description" in data["error"]:
                        err_desc = data["error"]["description"]
                except Exception:
                    pass
                integration_db.update_connection_status(
                    self.provider,
                    IntegrationStatus.ERROR.value,
                    last_tested_at=now,
                    error_message=err_desc
                )
                return TestConnectionResponse(
                    provider=self.provider,
                    success=False,
                    status=IntegrationStatus.ERROR,
                    message=err_desc,
                    tested_at=now
                )
            else:
                err_desc = f"Razorpay API returned unexpected status {res.status_code}."
                integration_db.update_connection_status(
                    self.provider,
                    IntegrationStatus.ERROR.value,
                    last_tested_at=now,
                    error_message=err_desc
                )
                return TestConnectionResponse(
                    provider=self.provider,
                    success=False,
                    status=IntegrationStatus.ERROR,
                    message=err_desc,
                    tested_at=now
                )

        except httpx.TimeoutException:
            err_desc = "Connection timed out while communicating with Razorpay API (api.razorpay.com)."
            integration_db.update_connection_status(self.provider, IntegrationStatus.ERROR.value, last_tested_at=now, error_message=err_desc)
            return TestConnectionResponse(provider=self.provider, success=False, status=IntegrationStatus.ERROR, message=err_desc, tested_at=now)
        except Exception as e:
            err_desc = f"Network or transport error: {str(e)}"
            integration_db.update_connection_status(self.provider, IntegrationStatus.ERROR.value, last_tested_at=now, error_message=err_desc)
            return TestConnectionResponse(provider=self.provider, success=False, status=IntegrationStatus.ERROR, message=err_desc, tested_at=now)

    def sync_data(self, options: Optional[Dict[str, Any]] = None) -> Tuple[bool, SyncRunModel, str]:
        """
        Executes paginated synchronization of payment records from Razorpay Sandbox.
        Stores normalized records into financial_transactions table with duplicate prevention.
        """
        key_id, key_secret, mode = self._get_credentials()
        now = datetime.now(timezone.utc).isoformat()
        batch_id = generate_batch_id("rzp")

        conn_record = integration_db.get_connection(self.provider)
        conn_id = conn_record["connection_id"] if conn_record else f"conn_{self.provider}"

        # Initialize sync run record
        sync_run_raw = integration_db.create_sync_run(
            connection_id=conn_id,
            provider=self.provider,
            batch_id=batch_id
        )
        sync_run_id = sync_run_raw["sync_run_id"]

        if not key_id or not key_secret:
            err_msg = "Cannot synchronize: Razorpay credentials are not configured."
            updated = integration_db.update_sync_run(
                sync_run_id=sync_run_id,
                status=SyncStatus.FAILED.value,
                error_message=err_msg
            )
            integration_db.update_connection_status(self.provider, IntegrationStatus.NOT_CONFIGURED.value, error_message=err_msg)
            return False, SyncRunModel(**(updated or sync_run_raw)), err_msg

        # Set status to SYNCING
        integration_db.update_connection_status(self.provider, IntegrationStatus.SYNCING.value)

        # Retrieve payments with pagination
        retrieved_count = 0
        inserted_count = 0
        updated_count = 0
        skipped_count = 0

        # Handle Mock Client for automated testing
        if self.mock_client:
            mock_res = self.mock_client("GET", f"{RAZORPAY_API_BASE}/payments?count=100")
            status_code = mock_res.get("status_code", 200)
            if status_code != 200:
                err_msg = mock_res.get("error_description", "Razorpay mock synchronization failed.")
                updated = integration_db.update_sync_run(
                    sync_run_id=sync_run_id,
                    status=SyncStatus.FAILED.value,
                    error_message=err_msg
                )
                integration_db.update_connection_status(self.provider, IntegrationStatus.ERROR.value, error_message=err_msg)
                return False, SyncRunModel(**(updated or sync_run_raw)), err_msg

            items = mock_res.get("items", [])
            retrieved_count = len(items)
            for item in items:
                norm = normalize_razorpay_payment(
                    raw_item=item,
                    source_env="SANDBOX",
                    sync_run_id=sync_run_id,
                    msme_id=options.get("msme_id") if options else None
                )
                _, is_new = integration_db.upsert_transaction(norm)
                if is_new:
                    inserted_count += 1
                else:
                    updated_count += 1

            if retrieved_count == 0:
                msg = "No test payments found. Create a test transaction using the Razorpay-supported test workflow, then synchronize again."
            else:
                msg = f"Successfully synchronized {retrieved_count} test payments ({inserted_count} new, {updated_count} updated)."

            updated_run = integration_db.update_sync_run(
                sync_run_id=sync_run_id,
                status=SyncStatus.SUCCESS.value,
                records_retrieved=retrieved_count,
                records_inserted=inserted_count,
                records_updated=updated_count,
                records_skipped=skipped_count
            )
            integration_db.update_connection_status(
                self.provider,
                IntegrationStatus.SYNCED.value,
                last_synced_at=now,
                error_message=None
            )
            return True, SyncRunModel(**(updated_run or sync_run_raw)), msg

        # Real HTTP retrieval with pagination
        try:
            auth_str = f"{key_id}:{key_secret}"
            b64_auth = base64.b64encode(auth_str.encode()).decode()
            headers = {
                "Authorization": f"Basic {b64_auth}",
                "User-Agent": "CrediLens-Fintech-Underwriting/1.0"
            }

            skip = 0
            page_size = 100
            max_pages = 10  # Protection against infinite loops

            with httpx.Client(timeout=15.0) as client:
                for page in range(max_pages):
                    url = f"{RAZORPAY_API_BASE}/payments?count={page_size}&skip={skip}"
                    res = client.get(url, headers=headers)

                    if res.status_code != 200:
                        err_desc = f"Razorpay API error on page {page + 1}: HTTP {res.status_code}"
                        try:
                            err_data = res.json()
                            if "error" in err_data and "description" in err_data["error"]:
                                err_desc = err_data["error"]["description"]
                        except Exception:
                            pass

                        updated = integration_db.update_sync_run(
                            sync_run_id=sync_run_id,
                            status=SyncStatus.FAILED.value,
                            records_retrieved=retrieved_count,
                            records_inserted=inserted_count,
                            records_updated=updated_count,
                            error_message=err_desc
                        )
                        integration_db.update_connection_status(self.provider, IntegrationStatus.ERROR.value, error_message=err_desc)
                        return False, SyncRunModel(**(updated or sync_run_raw)), err_desc

                    data = res.json()
                    items = data.get("items", [])
                    if not items:
                        break

                    retrieved_count += len(items)

                    for raw_p in items:
                        norm = normalize_razorpay_payment(
                            raw_item=raw_p,
                            source_env=self.environment.value,
                            sync_run_id=sync_run_id,
                            msme_id=options.get("msme_id") if options else None
                        )
                        _, is_new = integration_db.upsert_transaction(norm)
                        if is_new:
                            inserted_count += 1
                        else:
                            updated_count += 1

                    if len(items) < page_size:
                        break
                    skip += len(items)

            # Check outcome
            if retrieved_count == 0:
                msg = "No test payments found. Create a test transaction using the Razorpay-supported test workflow, then synchronize again."
            else:
                msg = f"Successfully synchronized {retrieved_count} payment records ({inserted_count} new, {updated_count} updated)."

            updated_run = integration_db.update_sync_run(
                sync_run_id=sync_run_id,
                status=SyncStatus.SUCCESS.value,
                records_retrieved=retrieved_count,
                records_inserted=inserted_count,
                records_updated=updated_count,
                records_skipped=skipped_count
            )
            integration_db.update_connection_status(
                self.provider,
                IntegrationStatus.SYNCED.value,
                last_synced_at=now,
                error_message=None
            )
            return True, SyncRunModel(**(updated_run or sync_run_raw)), msg

        except httpx.TimeoutException:
            err_msg = "Synchronization timed out while communicating with Razorpay API."
            updated = integration_db.update_sync_run(sync_run_id=sync_run_id, status=SyncStatus.FAILED.value, error_message=err_msg)
            integration_db.update_connection_status(self.provider, IntegrationStatus.ERROR.value, error_message=err_msg)
            return False, SyncRunModel(**(updated or sync_run_raw)), err_msg
        except Exception as e:
            err_msg = f"Synchronization error: {str(e)}"
            updated = integration_db.update_sync_run(sync_run_id=sync_run_id, status=SyncStatus.FAILED.value, error_message=err_msg)
            integration_db.update_connection_status(self.provider, IntegrationStatus.ERROR.value, error_message=err_msg)
            return False, SyncRunModel(**(updated or sync_run_raw)), err_msg
