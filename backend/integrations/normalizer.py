"""
CrediLens Financial Data Integration Hub — Record Normalizer
Translates vendor-specific records (Razorpay, Bank AA, GST) into unified
financial transaction schemas with data provenance and audit metadata.
"""

from datetime import datetime, timezone
from typing import Dict, Any, Optional

def normalize_razorpay_payment(
    raw_item: Dict[str, Any],
    source_env: str = "SANDBOX",
    sync_run_id: Optional[str] = None,
    msme_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Normalizes a Razorpay v1 Payment object.
    Amounts in Razorpay are in the smallest currency unit (paise for INR).
    Timestamps are Unix epoch seconds.
    """
    ext_id = str(raw_item.get("id", "")).strip()
    raw_amount = raw_item.get("amount", 0)
    try:
        # 100 paise = 1 INR
        amount = round(float(raw_amount) / 100.0, 2)
    except (ValueError, TypeError):
        amount = 0.0

    currency = str(raw_item.get("currency", "INR")).upper()
    status = str(raw_item.get("status", "unknown")).lower()

    # Determine direction: payments are INFLOW unless 100% refunded
    amount_refunded = raw_item.get("amount_refunded", 0)
    if status == "refunded" or (amount_refunded and amount_refunded >= raw_amount):
        direction = "OUTFLOW"
    else:
        direction = "INFLOW"

    created_at_epoch = raw_item.get("created_at")
    if created_at_epoch and isinstance(created_at_epoch, (int, float)):
        try:
            tx_date = datetime.fromtimestamp(created_at_epoch, timezone.utc).isoformat()
        except Exception:
            tx_date = datetime.now(timezone.utc).isoformat()
    elif isinstance(created_at_epoch, str):
        tx_date = created_at_epoch
    else:
        tx_date = datetime.now(timezone.utc).isoformat()

    return {
        "provider": "razorpay",
        "external_id": ext_id,
        "msme_id": msme_id,
        "transaction_date": tx_date,
        "amount": amount,
        "currency": currency,
        "status": status,
        "direction": direction,
        "payment_method": raw_item.get("method"),
        "payer_email": raw_item.get("email"),
        "payer_contact": raw_item.get("contact"),
        "description": raw_item.get("description") or f"Razorpay Payment ({raw_item.get('order_id') or ext_id})",
        "source_environment": source_env,
        "provenance": f"RAZORPAY_{source_env}_API",
        "sync_run_id": sync_run_id,
        "raw_data": raw_item
    }

def normalize_bank_transaction(
    raw_item: Dict[str, Any],
    source_env: str = "DEMO",
    sync_run_id: Optional[str] = None,
    msme_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Normalizes a ReBIT / Sahamati Account Aggregator bank statement record.
    """
    ext_id = str(raw_item.get("txnId") or raw_item.get("transaction_id", "")).strip()
    raw_amount = raw_item.get("amount", 0.0)
    amount = round(float(raw_amount), 2)

    txn_type = str(raw_item.get("type", "CREDIT")).upper()
    direction = "INFLOW" if "CREDIT" in txn_type else "OUTFLOW"

    tx_date = raw_item.get("transactionTimestamp") or raw_item.get("date") or datetime.now(timezone.utc).isoformat()

    return {
        "provider": "bank_aa",
        "external_id": ext_id,
        "msme_id": msme_id,
        "transaction_date": tx_date,
        "amount": amount,
        "currency": raw_item.get("currency", "INR"),
        "status": str(raw_item.get("status", "SUCCESS")).lower(),
        "direction": direction,
        "payment_method": raw_item.get("mode") or "BANK_TRANSFER",
        "payer_email": raw_item.get("payer_email"),
        "payer_contact": raw_item.get("payer_contact"),
        "description": raw_item.get("narration") or raw_item.get("description") or f"Bank Statement Entry ({ext_id})",
        "source_environment": source_env,
        "provenance": f"REBIT_AA_CONSENT_{source_env}",
        "sync_run_id": sync_run_id,
        "raw_data": raw_item
    }

def normalize_gst_invoice(
    raw_item: Dict[str, Any],
    source_env: str = "DEMO",
    sync_run_id: Optional[str] = None,
    msme_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Normalizes a GSP / GSTN outward supply (GSTR-1 B2B) record.
    """
    ext_id = str(raw_item.get("inum") or raw_item.get("invoice_number", "")).strip()
    raw_val = raw_item.get("val") or raw_item.get("invoice_value", 0.0)
    amount = round(float(raw_val), 2)

    tx_date = raw_item.get("idt") or raw_item.get("invoice_date") or datetime.now(timezone.utc).isoformat()
    counterparty = raw_item.get("ctin") or raw_item.get("buyer_gstin") or "B2B_BUYER"

    return {
        "provider": "gst",
        "external_id": ext_id,
        "msme_id": msme_id,
        "transaction_date": tx_date,
        "amount": amount,
        "currency": "INR",
        "status": "filed",
        "direction": "INFLOW",
        "payment_method": "INVOICE",
        "payer_email": None,
        "payer_contact": None,
        "description": f"GST GSTR-1 B2B Supply to {counterparty} (Inv #{ext_id})",
        "source_environment": source_env,
        "provenance": f"GSP_GSTR1_{source_env}",
        "sync_run_id": sync_run_id,
        "raw_data": raw_item
    }
