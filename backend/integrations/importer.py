"""
CrediLens Financial Data Integration Hub — File Import Engine
Supports CSV, XLSX, and XLS uploads with:
- Macro & formula injection sanitization
- Automatic column detection and smart mapping
- Multi-format date parsing and robust currency/amount normalization
- Debit/credit direction auto-inference and balance tracking
- Intra-file and database-level duplicate transaction detection
- Detailed row-level error reporting with downloadable CSV audit logs
- Safe transactional persistence into the unified financial data layer
"""

import os
import re
import csv
import io
import json
import uuid
import hashlib
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Tuple

import pandas as pd
from .db import integration_db

# Maximum allowed file upload size: 20 MB
MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024
MAX_ROW_COUNT = 10000

# Recognized financial fields in CrediLens
CREDILENS_FIELDS = [
    {"key": "transaction_date", "label": "Transaction Date", "required": True, "description": "Date of transaction (e.g. YYYY-MM-DD, DD/MM/YYYY)"},
    {"key": "amount", "label": "Transaction Amount", "required": False, "description": "Total transaction amount (or use Debit/Credit columns)"},
    {"key": "debit_amount", "label": "Debit / Withdrawal", "required": False, "description": "Outflow amount (if separate from Credit)"},
    {"key": "credit_amount", "label": "Credit / Deposit", "required": False, "description": "Inflow amount (if separate from Debit)"},
    {"key": "description", "label": "Description / Narration", "required": True, "description": "Transaction particulars, memo, or narration"},
    {"key": "reference_id", "label": "Reference ID / UTR", "required": False, "description": "Unique transaction ID, UTR, cheque no, or invoice no"},
    {"key": "direction", "label": "Direction (Credit/Debit)", "required": False, "description": "Explicit INFLOW/OUTFLOW or CREDIT/DEBIT indicator"},
    {"key": "transaction_type", "label": "Transaction Type", "required": False, "description": "Category (e.g., PAYMENT, INVOICE, EXPENSE, EMI)"},
    {"key": "balance", "label": "Account Balance", "required": False, "description": "Running or closing balance after transaction"},
    {"key": "counterparty", "label": "Counterparty Name", "required": False, "description": "Beneficiary, vendor, or customer name"},
    {"key": "msme_id", "label": "Borrower ID", "required": False, "description": "MSME Identifier (defaults to selected borrower)"},
]

# Field keyword matching rules for smart auto-mapping
KEYWORD_MAPPINGS = {
    "transaction_date": [
        "date", "tx_date", "txn_date", "transaction_date", "booking_date",
        "value_date", "posting_date", "invoice_date", "payment_date", "trans_date"
    ],
    "amount": [
        "amount", "txn_amount", "transaction_amount", "total", "net_amount",
        "value", "grand_total", "total_amount", "sum"
    ],
    "debit_amount": [
        "debit", "dr", "withdrawal", "withdrawals", "outflow", "debit_amount",
        "dr_amount", "paid_out", "spent"
    ],
    "credit_amount": [
        "credit", "cr", "deposit", "deposits", "inflow", "credit_amount",
        "cr_amount", "paid_in", "received"
    ],
    "description": [
        "description", "narration", "particulars", "details", "memo",
        "remarks", "reason", "notes", "transaction_details"
    ],
    "reference_id": [
        "reference", "ref_no", "ref_id", "txn_id", "transaction_id", "utr",
        "cheque_no", "chq_no", "invoice_no", "id", "ext_id", "reference_number"
    ],
    "direction": [
        "direction", "dr_cr", "type_indicator", "flow", "in_out"
    ],
    "transaction_type": [
        "type", "txn_type", "category", "payment_mode", "mode", "channel",
        "method", "transaction_category"
    ],
    "balance": [
        "balance", "running_balance", "closing_balance", "account_balance",
        "net_balance", "available_balance"
    ],
    "counterparty": [
        "counterparty", "beneficiary", "customer", "vendor", "party_name",
        "party", "payer", "payee", "client"
    ],
    "msme_id": [
        "msme_id", "borrower_id", "business_id", "borrower", "enterprise_id"
    ]
}

def sanitize_cell_value(val: Any) -> Any:
    """
    Prevents CSV / Formula injection attacks.
    Strips leading '=, +, -, @' from string cell values so they cannot
    execute as dynamic spreadsheet formulas upon re-export.
    """
    if isinstance(val, str):
        val_strip = val.strip()
        if len(val_strip) > 0 and val_strip[0] in ('=', '+', '-', '@') and not re.match(r'^-?\d+(\.\d+)?$', val_strip):
            return "'" + val_strip
    return val

def clean_column_name(col: str) -> str:
    """Normalizes header string for comparison."""
    if not isinstance(col, str):
        col = str(col)
    s = col.lower().strip()
    s = re.sub(r'[^a-z0-9]+', '_', s).strip('_')
    return s

def suggest_column_mapping(columns: List[str]) -> Dict[str, str]:
    """
    Suggests smart field mappings from uploaded file columns to CrediLens fields.
    Returns: { credilens_field_key: original_column_name }
    """
    mapping = {}
    normalized_cols = {col: clean_column_name(col) for col in columns}

    for field_key, keywords in KEYWORD_MAPPINGS.items():
        matched_col = None
        # Exact keyword match
        for orig_col, norm in normalized_cols.items():
            if norm in keywords:
                matched_col = orig_col
                break
        # Substring match if exact match not found
        if not matched_col:
            for orig_col, norm in normalized_cols.items():
                for kw in keywords:
                    if kw in norm and orig_col not in mapping.values():
                        matched_col = orig_col
                        break
                if matched_col:
                    break

        if matched_col:
            mapping[field_key] = matched_col

    return mapping

def detect_dataset_type(columns: List[str]) -> str:
    """Infers dataset type from column names."""
    norm_set = set(clean_column_name(c) for c in columns)
    
    # Check bank statement
    bank_kw = {"debit", "credit", "balance", "withdrawal", "deposit", "narration"}
    if len(norm_set.intersection(bank_kw)) >= 2:
        return "BANK_TRANSACTIONS"
    
    # Check invoices
    inv_kw = {"invoice_no", "invoice", "buyer", "seller", "gstin", "tax", "cgst", "sgst"}
    if len(norm_set.intersection(inv_kw)) >= 2:
        return "INVOICES"

    # Check loan repayments
    loan_kw = {"emi", "principal", "interest", "installment", "tenure"}
    if len(norm_set.intersection(loan_kw)) >= 2:
        return "LOAN_REPAYMENTS"

    # Check GST summary
    gst_kw = {"gstr", "hsn", "turnover", "input_tax_credit", "itc"}
    if len(norm_set.intersection(gst_kw)) >= 1:
        return "GST_SUMMARY"

    # Check revenue / expense
    rev_kw = {"expense", "revenue", "income", "cost_center", "profit"}
    if len(norm_set.intersection(rev_kw)) >= 1:
        return "REVENUE_EXPENSES"

    return "CUSTOM"

def parse_raw_dataframe(file_bytes: bytes, filename: str) -> pd.DataFrame:
    """Reads raw bytes into pandas DataFrame supporting CSV, XLSX, and XLS."""
    ext = os.path.splitext(filename.lower())[1]

    if ext == ".csv":
        # Attempt delimiter sniffing and encoding detection
        try:
            sample_str = file_bytes[:4096].decode("utf-8", errors="ignore")
            dialect = csv.Sniffer().sniff(sample_str)
            sep = dialect.delimiter
        except Exception:
            sep = ","

        try:
            df = pd.read_csv(io.BytesIO(file_bytes), sep=sep, encoding="utf-8")
        except UnicodeDecodeError:
            df = pd.read_csv(io.BytesIO(file_bytes), sep=sep, encoding="latin-1")
    elif ext in (".xlsx", ".xls"):
        df = pd.read_excel(io.BytesIO(file_bytes))
    else:
        raise ValueError(f"Unsupported file format '{ext}'. Please upload CSV or Excel (.xlsx, .xls) files.")

    # Remove completely empty rows
    df.dropna(how="all", inplace=True)
    return df

def preview_file(file_bytes: bytes, filename: str) -> Dict[str, Any]:
    """
    Generates preview data including columns, sample rows, and suggested mappings.
    """
    if len(file_bytes) > MAX_FILE_SIZE_BYTES:
        raise ValueError(f"File size exceeds 20 MB limit ({round(len(file_bytes)/(1024*1024), 2)} MB).")

    df = parse_raw_dataframe(file_bytes, filename)
    columns = [str(c) for c in df.columns]
    
    sample_df = df.head(15).copy()
    sample_rows = []
    for _, row in sample_df.iterrows():
        r_dict = {}
        for col in columns:
            val = row[col]
            if pd.isna(val):
                r_dict[col] = None
            elif isinstance(val, (datetime, pd.Timestamp)):
                r_dict[col] = val.isoformat()
            else:
                r_dict[col] = sanitize_cell_value(val)
        sample_rows.append(r_dict)

    suggested = suggest_column_mapping(columns)
    dataset_type = detect_dataset_type(columns)

    return {
        "filename": filename,
        "file_size_bytes": len(file_bytes),
        "total_rows_estimate": len(df),
        "detected_columns": columns,
        "sample_rows": sample_rows,
        "suggested_mapping": suggested,
        "dataset_type": dataset_type,
        "credilens_fields": CREDILENS_FIELDS
    }

def parse_date_value(val: Any) -> Optional[str]:
    """Parses various date formats into YYYY-MM-DD ISO string."""
    if pd.isna(val) or val is None:
        return None
    if isinstance(val, (datetime, pd.Timestamp)):
        return val.strftime("%Y-%m-%d")
    
    s = str(val).strip()
    if not s:
        return None

    # Common patterns
    formats = [
        "%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y", "%m/%d/%Y",
        "%Y/%m/%d", "%d.%m.%Y", "%d %b %Y", "%d %B %Y",
        "%Y-%m-%dT%H:%M:%S", "%Y-%m-%d %H:%M:%S"
    ]
    for fmt in formats:
        try:
            dt = datetime.strptime(s.split("T")[0] if "T" in s and fmt == "%Y-%m-%d" else s, fmt)
            return dt.strftime("%Y-%m-%d")
        except ValueError:
            pass

    # Fallback with pandas to_datetime
    try:
        dt = pd.to_datetime(s, dayfirst=True)
        return dt.strftime("%Y-%m-%d")
    except Exception:
        return None

def parse_amount_value(val: Any) -> Optional[float]:
    """Cleans currency strings, symbols, commas, and parses float amount."""
    if pd.isna(val) or val is None:
        return None
    if isinstance(val, (int, float)):
        return float(val)

    s = str(val).strip()
    if not s:
        return None

    # Handle accounting parentheses for negative numbers, e.g. (1,200.50)
    is_paren_neg = False
    if s.startswith("(") and s.endswith(")"):
        is_paren_neg = True
        s = s[1:-1].strip()

    # Strip currency signs (₹, $, €, £, INR, USD) and commas
    cleaned = re.sub(r'[₹$€£,A-Za-z\s]', '', s)
    try:
        num = float(cleaned)
        return -num if is_paren_neg else num
    except ValueError:
        return None

def validate_and_stage_file(
    file_bytes: bytes,
    filename: str,
    column_mapping: Dict[str, str],
    dataset_type: str,
    msme_id: str = "MSME-1042",
    user_email: str = "underwriter@credilens.internal"
) -> Dict[str, Any]:
    """
    Performs full row-level validation, duplicate detection, and stages file record.
    Returns validation summary with row errors, warnings, and valid row records.
    """
    if len(file_bytes) > MAX_FILE_SIZE_BYTES:
        raise ValueError(f"File size exceeds 20 MB limit.")

    df = parse_raw_dataframe(file_bytes, filename)
    if len(df) > MAX_ROW_COUNT:
        raise ValueError(f"File exceeds maximum allowed rows ({MAX_ROW_COUNT:,}). Please split your dataset.")

    file_id = f"file_{uuid.uuid4().hex[:10]}"
    ext = os.path.splitext(filename.lower())[1].replace(".", "").upper()

    date_col = column_mapping.get("transaction_date")
    amount_col = column_mapping.get("amount")
    debit_col = column_mapping.get("debit_amount")
    credit_col = column_mapping.get("credit_amount")
    desc_col = column_mapping.get("description")
    ref_col = column_mapping.get("reference_id")
    dir_col = column_mapping.get("direction")
    type_col = column_mapping.get("transaction_type")
    balance_col = column_mapping.get("balance")
    counterparty_col = column_mapping.get("counterparty")
    row_msme_col = column_mapping.get("msme_id")

    if not date_col:
        raise ValueError("Transaction Date column must be mapped.")
    if not amount_col and not (debit_col or credit_col):
        raise ValueError("Either 'Transaction Amount' or 'Debit'/'Credit' columns must be mapped.")

    errors = []
    warnings = []
    valid_rows = []
    seen_refs = set()
    seen_hashes = set()

    # Pre-fetch existing external_ids from database for duplicate checks
    conn = integration_db._get_connection()
    try:
        cur = conn.cursor()
        cur.execute("SELECT external_id FROM financial_transactions WHERE msme_id = ?", (msme_id,))
        existing_db_refs = set(r["external_id"] for r in cur.fetchall())
    finally:
        conn.close()

    total_rows = len(df)

    for idx, row in df.iterrows():
        row_num = idx + 2  # 1-indexed, accounting for header row
        row_errors = []
        row_warnings = []

        # 1. Date Validation
        raw_date = row.get(date_col)
        parsed_date = parse_date_value(raw_date)
        if not parsed_date:
            row_errors.append({
                "row_number": row_num,
                "column": date_col,
                "raw_value": str(raw_date),
                "error_type": "INVALID_DATE",
                "message": f"Unable to parse date '{raw_date}'. Expected standard date format."
            })

        # 2. Amount & Direction Determination
        final_amount: Optional[float] = None
        direction: str = "CREDIT"
        debit_val: Optional[float] = None
        credit_val: Optional[float] = None

        if debit_col or credit_col:
            raw_deb = row.get(debit_col) if debit_col else None
            raw_cred = row.get(credit_col) if credit_col else None

            if raw_deb is not None and not pd.isna(raw_deb) and str(raw_deb).strip():
                debit_val = parse_amount_value(raw_deb)
                if debit_val is None:
                    row_errors.append({
                        "row_number": row_num,
                        "column": debit_col,
                        "raw_value": str(raw_deb),
                        "error_type": "INVALID_AMOUNT",
                        "message": f"Unable to parse debit amount '{raw_deb}'. Must be a valid numeric value."
                    })
            if raw_cred is not None and not pd.isna(raw_cred) and str(raw_cred).strip():
                credit_val = parse_amount_value(raw_cred)
                if credit_val is None:
                    row_errors.append({
                        "row_number": row_num,
                        "column": credit_col,
                        "raw_value": str(raw_cred),
                        "error_type": "INVALID_AMOUNT",
                        "message": f"Unable to parse credit amount '{raw_cred}'. Must be a valid numeric value."
                    })

            if debit_val and debit_val > 0:
                final_amount = round(debit_val, 2)
                direction = "DEBIT"
            elif credit_val and credit_val > 0:
                final_amount = round(credit_val, 2)
                direction = "CREDIT"
            elif amount_col:
                raw_amt = row.get(amount_col)
                parsed_amt = parse_amount_value(raw_amt)
                if parsed_amt is not None and parsed_amt != 0:
                    final_amount = round(abs(parsed_amt), 2)
                    direction = "DEBIT" if parsed_amt < 0 else "CREDIT"
        else:
            raw_amt = row.get(amount_col)
            parsed_amt = parse_amount_value(raw_amt)
            if parsed_amt is None:
                row_errors.append({
                    "row_number": row_num,
                    "column": amount_col,
                    "raw_value": str(raw_amt),
                    "error_type": "INVALID_AMOUNT",
                    "message": f"Unable to parse amount '{raw_amt}'. Must be a valid numeric value."
                })
            elif parsed_amt == 0:
                row_warnings.append({
                    "row_number": row_num,
                    "column": amount_col,
                    "message": "Transaction amount is 0.00."
                })
                final_amount = 0.0
            else:
                final_amount = round(abs(parsed_amt), 2)
                direction = "DEBIT" if parsed_amt < 0 else "CREDIT"

        # Explicit direction override if column exists
        if dir_col and row.get(dir_col):
            dir_str = str(row.get(dir_col)).strip().upper()
            if "DR" in dir_str or "DEBIT" in dir_str or "OUT" in dir_str:
                direction = "DEBIT"
            elif "CR" in dir_str or "CREDIT" in dir_str or "IN" in dir_str:
                direction = "CREDIT"

        if final_amount is None and not row_errors:
            row_errors.append({
                "row_number": row_num,
                "column": amount_col or "Amount",
                "raw_value": "Empty/Zero",
                "error_type": "MISSING_AMOUNT",
                "message": "No non-zero debit or credit amount found in row."
            })

        # 3. Description Validation
        description = "File imported transaction"
        if desc_col and not pd.isna(row.get(desc_col)):
            description = str(sanitize_cell_value(row.get(desc_col))).strip()
        else:
            row_warnings.append({
                "row_number": row_num,
                "column": desc_col or "Description",
                "message": "Missing description; default label assigned."
            })

        # 4. Reference ID & Deduplication Key
        reference_id = None
        if ref_col and not pd.isna(row.get(ref_col)):
            reference_id = str(row.get(ref_col)).strip()

        # Compute deterministic content hash
        hash_payload = f"{msme_id}_{parsed_date}_{final_amount}_{direction}_{description[:40]}"
        row_hash = hashlib.sha256(hash_payload.encode()).hexdigest()[:16]
        external_id = reference_id if reference_id else f"imp_{row_hash}"

        # 5. Duplicate Detection
        is_duplicate = False
        if reference_id and reference_id in seen_refs:
            is_duplicate = True
        elif row_hash in seen_hashes:
            is_duplicate = True
        elif external_id in existing_db_refs:
            is_duplicate = True

        if is_duplicate:
            row_warnings.append({
                "row_number": row_num,
                "column": ref_col or "Row Hash",
                "message": f"Duplicate transaction detected (Ref: {external_id}). Will be skipped during import."
            })

        if reference_id:
            seen_refs.add(reference_id)
        seen_hashes.add(row_hash)

        # 6. Balance & Counterparty
        balance_val = parse_amount_value(row.get(balance_col)) if balance_col else None
        counterparty_val = str(sanitize_cell_value(row.get(counterparty_col))).strip() if counterparty_col and not pd.isna(row.get(counterparty_col)) else None
        target_msme = str(row.get(row_msme_col)).strip() if row_msme_col and not pd.isna(row.get(row_msme_col)) else msme_id

        # Accumulate
        if row_errors:
            errors.extend(row_errors)
        else:
            valid_rows.append({
                "row_number": row_num,
                "is_duplicate": is_duplicate,
                "external_id": external_id,
                "msme_id": target_msme,
                "transaction_date": parsed_date,
                "amount": final_amount,
                "direction": direction,
                "debit_amount": debit_val,
                "credit_amount": credit_val,
                "balance": balance_val,
                "description": description,
                "counterparty": counterparty_val,
                "transaction_type": str(row.get(type_col)).strip() if type_col and not pd.isna(row.get(type_col)) else dataset_type,
                "raw_data": {k: sanitize_cell_value(v) for k, v in row.to_dict().items() if not pd.isna(v)}
            })

        warnings.extend(row_warnings)

    duplicate_count = sum(1 for r in valid_rows if r["is_duplicate"])
    actionable_valid_count = sum(1 for r in valid_rows if not r["is_duplicate"])
    invalid_count = len(set(e["row_number"] for e in errors))

    # Stage metadata into imported_files table as PENDING_REVIEW
    now_iso = datetime.now(timezone.utc).isoformat()
    staging_file_record = {
        "file_id": file_id,
        "filename": filename,
        "file_type": ext,
        "file_size_bytes": len(file_bytes),
        "dataset_type": dataset_type,
        "total_rows": total_rows,
        "valid_rows": actionable_valid_count,
        "invalid_rows": invalid_count,
        "duplicate_rows": duplicate_count,
        "warnings_count": len(warnings),
        "status": "PENDING_REVIEW",
        "msme_id": msme_id,
        "error_report": errors[:500],  # Store up to 500 error rows
        "column_mapping": column_mapping,
        "created_by": user_email,
        "created_at": now_iso,
        "updated_at": now_iso
    }

    integration_db.insert_imported_file(staging_file_record)

    # Cache staged rows in a companion file in scratch or temp memory for confirmation
    _stage_cache[file_id] = {
        "valid_rows": valid_rows,
        "file_record": staging_file_record
    }

    return {
        "file_id": file_id,
        "filename": filename,
        "total_rows": total_rows,
        "valid_rows": actionable_valid_count,
        "invalid_rows": invalid_count,
        "duplicate_rows": duplicate_count,
        "warnings_count": len(warnings),
        "status": "PENDING_REVIEW",
        "errors": errors[:50],  # Return first 50 errors for UI inspection
        "total_errors": len(errors),
        "warnings": warnings[:50],
        "preview_valid_rows": valid_rows[:15],
        "can_import": actionable_valid_count > 0
    }

# In-memory staging cache for uploaded files pending user confirmation
_stage_cache: Dict[str, Dict[str, Any]] = {}

def execute_import(file_id: str, user_email: str = "underwriter@credilens.internal") -> Dict[str, Any]:
    """
    Commits staged valid non-duplicate transactions into the unified financial data layer.
    """
    cached = _stage_cache.get(file_id)
    file_record = integration_db.get_imported_file(file_id)
    if not file_record:
        raise ValueError(f"Imported file '{file_id}' not found.")

    if file_record["status"] in ("IMPORTED", "PARTIALLY_IMPORTED"):
        return {
            "file_id": file_id,
            "status": file_record["status"],
            "records_inserted": 0,
            "records_skipped": file_record.get("duplicate_rows", 0),
            "message": "File has already been imported."
        }

    valid_rows = cached["valid_rows"] if cached else []
    if not valid_rows:
        # Fallback if cache cleared: check database
        raise ValueError("Staged transaction payload expired or already committed. Please upload the file again.")

    inserted_count = 0
    skipped_count = 0
    now_iso = datetime.now(timezone.utc).isoformat()

    conn = integration_db._get_connection()
    try:
        with conn:
            cur = conn.cursor()
            for r in valid_rows:
                if r.get("is_duplicate"):
                    skipped_count += 1
                    continue

                tx_id = f"tx_imp_{uuid.uuid4().hex[:12]}"
                raw_json = json.dumps(r.get("raw_data") or {})

                cur.execute("""
                    INSERT INTO financial_transactions
                    (transaction_id, provider, external_id, msme_id, transaction_date,
                     amount, currency, status, direction, payment_method, payer_email,
                     payer_contact, description, source_environment, provenance,
                     sync_run_id, raw_data, debit_amount, credit_amount, balance,
                     transaction_type, validation_status, file_id, source, created_at, updated_at)
                    VALUES (?, 'file_import', ?, ?, ?, ?, 'INR', 'SUCCESS', ?,
                            ?, ?, ?, ?, 'file_upload', 'FILE_IMPORT',
                            ?, ?, ?, ?, ?, ?, 'VALID', ?, 'FILE_IMPORT', ?, ?)
                """, (
                    tx_id,
                    r["external_id"],
                    r["msme_id"],
                    r["transaction_date"],
                    r["amount"],
                    r["direction"],
                    r.get("payment_method") or "FILE_UPLOAD",
                    None,
                    r.get("counterparty"),
                    r["description"],
                    file_id,
                    raw_json,
                    r.get("debit_amount"),
                    r.get("credit_amount"),
                    r.get("balance"),
                    r.get("transaction_type"),
                    file_id,
                    now_iso,
                    now_iso
                ))
                inserted_count += 1
    finally:
        conn.close()

    # Determine final status
    final_status = "IMPORTED" if file_record.get("invalid_rows", 0) == 0 else "PARTIALLY_IMPORTED"
    integration_db.update_imported_file(file_id, {
        "status": final_status,
        "valid_rows": inserted_count,
        "duplicate_rows": skipped_count,
        "imported_at": now_iso
    })

    # Clear staging cache
    _stage_cache.pop(file_id, None)

    return {
        "file_id": file_id,
        "status": final_status,
        "records_inserted": inserted_count,
        "records_skipped": skipped_count,
        "message": f"Successfully imported {inserted_count} financial transactions into unified data layer."
    }

def generate_error_report_csv(file_id: str) -> str:
    """Generates downloadable CSV containing error audit trail."""
    file_record = integration_db.get_imported_file(file_id)
    if not file_record:
        raise ValueError(f"File record '{file_id}' not found.")

    errors = file_record.get("error_report") or []
    if isinstance(errors, str):
        try:
            errors = json.loads(errors)
        except Exception:
            errors = []

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Row Number", "Column", "Error Type", "Raw Value", "Error Message", "Filename", "File ID"])

    for err in errors:
        writer.writerow([
            err.get("row_number", ""),
            err.get("column", ""),
            err.get("error_type", ""),
            err.get("raw_value", ""),
            err.get("message", ""),
            file_record.get("filename", ""),
            file_id
        ])

    return output.getvalue()
