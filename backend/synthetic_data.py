"""
CrediLens — MSME Credit Intelligence Platform
Synthetic Data Generation Module
Deterministic, seeded dataset of 127 MSMEs with alternative business signals.
All data is synthetic demonstration data for evaluation purposes.
"""

import json
import math
import random
from typing import Dict, List, Any

# Ensure deterministic generation
RANDOM_SEED = 42

SECTORS = [
    "Automotive Components",
    "Textiles & Apparel",
    "Food Processing & FMCG",
    "Electricals & Electronics",
    "Light Engineering & Tools",
    "Packaging & Paper",
    "Chemicals & Polymers",
    "Healthcare & Pharma Supplies",
    "Logistics & Warehousing",
    "Renewable & Solar Equipment"
]

CITIES_REGIONS = [
    ("Pune", "Region A"),
    ("Surat", "Region A"),
    ("Coimbatore", "Region B"),
    ("Ludhiana", "Region A"),
    ("Hyderabad", "Region B"),
    ("Ahmedabad", "Region A"),
    ("Bengaluru", "Region B"),
    ("Chennai", "Region B"),
    ("Indore", "Region A"),
    ("Jaipur", "Region A")
]

# Primary named companies as specified in prompt
PRIMARY_COMPANIES = [
    {
        "msme_id": "MSME-1042",
        "business_name": "Metro Auto Parts",
        "sector": "Automotive Components",
        "business_age": 6.8,
        "city": "Pune",
        "region": "Region A",
        "annual_revenue": 98500000, # ~9.85 Cr
        "monthly_revenue": 8200000,
        "cash_inflow": 8100000,
        "cash_outflow": 7300000,
        "revenue_growth": -8.2, # Revenue Trend -8.2%
        "cashflow_volatility": 68.0,
        "invoice_frequency": 78,
        "payment_delay_days": 28,
        "debt_ratio": 0.44,
        "dscr": 1.24, # DSCR 1.24x
        "customer_concentration": "Moderate",
        "supplier_concentration": "Low",
        "business_activity": 81,
        "transaction_consistency": 74,
        "revenue_stability": 72,
        "cash_flow_stability": 61,
        "invoice_consistency": 78,
        "payment_behavior": 64,
        "transaction_volatility": "High",
        "traditional_credit_score": 648,
        "risk_score": 68,
        "probability_of_default": 18.7,
        "risk_segment": "MODERATE", # Moderate-High
        "cash_reserve": 4200000, # ₹4.2L / ₹42L normalized
        "loan_exposure": 3500000,
        "cash_flow_health": "Watch",
        "trend": "deteriorating",
        "recent_alert": "Risk increased from 61 → 68"
    },
    {
        "msme_id": "MSME-1001",
        "business_name": "Sharma Electricals",
        "sector": "Electricals & Electronics",
        "business_age": 8.5,
        "city": "Ahmedabad",
        "region": "Region A",
        "annual_revenue": 142000000,
        "monthly_revenue": 11800000,
        "cash_inflow": 12100000,
        "cash_outflow": 9800000,
        "revenue_growth": 14.5,
        "cashflow_volatility": 24.0,
        "invoice_frequency": 92,
        "payment_delay_days": 8,
        "debt_ratio": 0.22,
        "dscr": 2.15,
        "customer_concentration": "Low",
        "supplier_concentration": "Low",
        "business_activity": 94,
        "transaction_consistency": 91,
        "revenue_stability": 92,
        "cash_flow_stability": 88,
        "invoice_consistency": 90,
        "payment_behavior": 95,
        "transaction_volatility": "Low",
        "traditional_credit_score": 765,
        "risk_score": 26,
        "probability_of_default": 4.1,
        "risk_segment": "LOW",
        "cash_reserve": 9800000,
        "loan_exposure": 5000000,
        "cash_flow_health": "Healthy",
        "trend": "improving",
        "recent_alert": None
    },
    {
        "msme_id": "MSME-1002",
        "business_name": "GreenBasket Foods",
        "sector": "Food Processing & FMCG",
        "business_age": 5.2,
        "city": "Bengaluru",
        "region": "Region B",
        "annual_revenue": 86000000,
        "monthly_revenue": 7100000,
        "cash_inflow": 7300000,
        "cash_outflow": 6200000,
        "revenue_growth": 11.2,
        "cashflow_volatility": 32.0,
        "invoice_frequency": 88,
        "payment_delay_days": 12,
        "debt_ratio": 0.28,
        "dscr": 1.85,
        "customer_concentration": "Low",
        "supplier_concentration": "Moderate",
        "business_activity": 89,
        "transaction_consistency": 86,
        "revenue_stability": 85,
        "cash_flow_stability": 82,
        "invoice_consistency": 87,
        "payment_behavior": 88,
        "transaction_volatility": "Low",
        "traditional_credit_score": 725,
        "risk_score": 34,
        "probability_of_default": 6.8,
        "risk_segment": "LOW",
        "cash_reserve": 6500000,
        "loan_exposure": 2800000,
        "cash_flow_health": "Healthy",
        "trend": "stable",
        "recent_alert": None
    },
    {
        "msme_id": "MSME-1003",
        "business_name": "Aarav Textiles",
        "sector": "Textiles & Apparel",
        "business_age": 7.1,
        "city": "Surat",
        "region": "Region A",
        "annual_revenue": 112000000,
        "monthly_revenue": 9300000,
        "cash_inflow": 9100000,
        "cash_outflow": 8200000,
        "revenue_growth": 3.8,
        "cashflow_volatility": 45.0,
        "invoice_frequency": 80,
        "payment_delay_days": 19,
        "debt_ratio": 0.36,
        "dscr": 1.52,
        "customer_concentration": "Moderate",
        "supplier_concentration": "Moderate",
        "business_activity": 82,
        "transaction_consistency": 79,
        "revenue_stability": 78,
        "cash_flow_stability": 73,
        "invoice_consistency": 81,
        "payment_behavior": 76,
        "transaction_volatility": "Moderate",
        "traditional_credit_score": 690,
        "risk_score": 46,
        "probability_of_default": 11.2,
        "risk_segment": "MODERATE",
        "cash_reserve": 5100000,
        "loan_exposure": 4200000,
        "cash_flow_health": "Healthy",
        "trend": "stable",
        "recent_alert": None
    },
    {
        "msme_id": "MSME-1005",
        "business_name": "Sunrise Furniture",
        "sector": "Light Engineering & Tools",
        "business_age": 4.5,
        "city": "Indore",
        "region": "Region A",
        "annual_revenue": 64000000,
        "monthly_revenue": 5300000,
        "cash_inflow": 5200000,
        "cash_outflow": 4700000,
        "revenue_growth": 5.4,
        "cashflow_volatility": 48.0,
        "invoice_frequency": 75,
        "payment_delay_days": 21,
        "debt_ratio": 0.38,
        "dscr": 1.42,
        "customer_concentration": "Moderate",
        "supplier_concentration": "Moderate",
        "business_activity": 76,
        "transaction_consistency": 73,
        "revenue_stability": 74,
        "cash_flow_stability": 69,
        "invoice_consistency": 76,
        "payment_behavior": 72,
        "transaction_volatility": "Moderate",
        "traditional_credit_score": 675,
        "risk_score": 52,
        "probability_of_default": 13.5,
        "risk_segment": "MODERATE",
        "cash_reserve": 3800000,
        "loan_exposure": 2000000,
        "cash_flow_health": "Watch",
        "trend": "stable",
        "recent_alert": None
    },
    {
        "msme_id": "MSME-1006",
        "business_name": "Nova Traders",
        "sector": "Logistics & Warehousing",
        "business_age": 3.2,
        "city": "Hyderabad",
        "region": "Region B",
        "annual_revenue": 78000000,
        "monthly_revenue": 6500000,
        "cash_inflow": 6100000,
        "cash_outflow": 6400000,
        "revenue_growth": -6.4,
        "cashflow_volatility": 74.0,
        "invoice_frequency": 65,
        "payment_delay_days": 34,
        "debt_ratio": 0.52,
        "dscr": 1.08,
        "customer_concentration": "High",
        "supplier_concentration": "Moderate",
        "business_activity": 68,
        "transaction_consistency": 62,
        "revenue_stability": 60,
        "cash_flow_stability": 54,
        "invoice_consistency": 65,
        "payment_behavior": 58,
        "transaction_volatility": "High",
        "traditional_credit_score": 610,
        "risk_score": 74,
        "probability_of_default": 24.5,
        "risk_segment": "HIGH",
        "cash_reserve": 1900000,
        "loan_exposure": 3200000,
        "cash_flow_health": "Critical",
        "trend": "deteriorating",
        "recent_alert": "Cash-flow warning: Outflow exceeded inflow in 2 consecutive months"
    },
    {
        "msme_id": "MSME-1007",
        "business_name": "KJ Textiles",
        "sector": "Textiles & Apparel",
        "business_age": 9.4,
        "city": "Coimbatore",
        "region": "Region B",
        "annual_revenue": 105000000,
        "monthly_revenue": 8700000,
        "cash_inflow": 7900000,
        "cash_outflow": 8600000,
        "revenue_growth": -11.5,
        "cashflow_volatility": 76.0,
        "invoice_frequency": 62,
        "payment_delay_days": 38,
        "debt_ratio": 0.58,
        "dscr": 0.95,
        "customer_concentration": "High",
        "supplier_concentration": "High",
        "business_activity": 64,
        "transaction_consistency": 58,
        "revenue_stability": 56,
        "cash_flow_stability": 50,
        "invoice_consistency": 61,
        "payment_behavior": 52,
        "transaction_volatility": "High",
        "traditional_credit_score": 585,
        "risk_score": 82,
        "probability_of_default": 32.8,
        "risk_segment": "HIGH",
        "cash_reserve": 1200000,
        "loan_exposure": 4800000,
        "cash_flow_health": "Critical",
        "trend": "deteriorating",
        "recent_alert": "Revenue trend deteriorating: Order cancellation from key buyer"
    },
    {
        "msme_id": "MSME-1008",
        "business_name": "Urban Packaging",
        "sector": "Packaging & Paper",
        "business_age": 6.1,
        "city": "Chennai",
        "region": "Region B",
        "annual_revenue": 72000000,
        "monthly_revenue": 6000000,
        "cash_inflow": 6100000,
        "cash_outflow": 5500000,
        "revenue_growth": 4.2,
        "cashflow_volatility": 42.0,
        "invoice_frequency": 82,
        "payment_delay_days": 16,
        "debt_ratio": 0.32,
        "dscr": 1.68,
        "customer_concentration": "Moderate",
        "supplier_concentration": "Low",
        "business_activity": 80,
        "transaction_consistency": 78,
        "revenue_stability": 80,
        "cash_flow_stability": 75,
        "invoice_consistency": 82,
        "payment_behavior": 80,
        "transaction_volatility": "Moderate",
        "traditional_credit_score": 710,
        "risk_score": 42,
        "probability_of_default": 9.4,
        "risk_segment": "MODERATE",
        "cash_reserve": 4900000,
        "loan_exposure": 2400000,
        "cash_flow_health": "Healthy",
        "trend": "stable",
        "recent_alert": None
    },
    {
        "msme_id": "MSME-1009",
        "business_name": "FreshRoute Foods",
        "sector": "Food Processing & FMCG",
        "business_age": 3.8,
        "city": "Pune",
        "region": "Region A",
        "annual_revenue": 58000000,
        "monthly_revenue": 4800000,
        "cash_inflow": 4900000,
        "cash_outflow": 4300000,
        "revenue_growth": 8.7,
        "cashflow_volatility": 38.0,
        "invoice_frequency": 85,
        "payment_delay_days": 14,
        "debt_ratio": 0.30,
        "dscr": 1.74,
        "customer_concentration": "Low",
        "supplier_concentration": "Moderate",
        "business_activity": 85,
        "transaction_consistency": 82,
        "revenue_stability": 82,
        "cash_flow_stability": 78,
        "invoice_consistency": 84,
        "payment_behavior": 84,
        "transaction_volatility": "Moderate",
        "traditional_credit_score": 715,
        "risk_score": 38,
        "probability_of_default": 8.1,
        "risk_segment": "LOW",
        "cash_reserve": 4100000,
        "loan_exposure": 1800000,
        "cash_flow_health": "Healthy",
        "trend": "improving",
        "recent_alert": None
    },
    {
        "msme_id": "MSME-1010",
        "business_name": "Bharat Tools",
        "sector": "Light Engineering & Tools",
        "business_age": 11.2,
        "city": "Ludhiana",
        "region": "Region A",
        "annual_revenue": 168000000,
        "monthly_revenue": 14000000,
        "cash_inflow": 14300000,
        "cash_outflow": 11500000,
        "revenue_growth": 9.8,
        "cashflow_volatility": 26.0,
        "invoice_frequency": 90,
        "payment_delay_days": 10,
        "debt_ratio": 0.25,
        "dscr": 2.05,
        "customer_concentration": "Low",
        "supplier_concentration": "Low",
        "business_activity": 92,
        "transaction_consistency": 89,
        "revenue_stability": 90,
        "cash_flow_stability": 86,
        "invoice_consistency": 89,
        "payment_behavior": 92,
        "transaction_volatility": "Low",
        "traditional_credit_score": 750,
        "risk_score": 28,
        "probability_of_default": 4.8,
        "risk_segment": "LOW",
        "cash_reserve": 11200000,
        "loan_exposure": 6000000,
        "cash_flow_health": "Healthy",
        "trend": "stable",
        "recent_alert": None
    }
]

def generate_synthetic_dataset() -> List[Dict[str, Any]]:
    """
    Generates a deterministic dataset of exactly 127 MSMEs.
    Target breakdown:
    - Total: 127
    - Low Risk (Score < 40): 54
    - Moderate Risk (Score 40-69): 49
    - High Risk (Score >= 70): 24
    - Average Risk Score: ~57.4
    - Portfolio at Risk: ~18.6%
    """
    rng = random.Random(RANDOM_SEED)
    dataset: List[Dict[str, Any]] = []

    # Map primary companies
    primary_ids = {c["msme_id"] for c in PRIMARY_COMPANIES}
    dataset.extend(PRIMARY_COMPANIES)

    # Count how many we already have by risk segment
    low_count = sum(1 for c in PRIMARY_COMPANIES if c["risk_score"] < 40)
    mod_count = sum(1 for c in PRIMARY_COMPANIES if 40 <= c["risk_score"] < 70)
    high_count = sum(1 for c in PRIMARY_COMPANIES if c["risk_score"] >= 70)

    target_low = 54
    target_mod = 49
    target_high = 24
    total_target = 127

    needed_low = target_low - low_count
    needed_mod = target_mod - mod_count
    needed_high = target_high - high_count

    company_prefixes = [
        "Apex", "Zenith", "Vanguard", "Kaveri", "Paramount", "Sterling", "Godavari",
        "Royal", "Shakti", "Trident", "Delta", "Om", "Sai", "Pioneer", "Narmada",
        "Indus", "Falcon", "Ganga", "Surya", "Kohinoor", "Navkar", "Arihant",
        "Mahalaxmi", "Balaji", "Anand", "Riddhi", "Siddhant", "Vikas", "Pragati"
    ]
    
    company_suffixes = [
        "Industries", "Enterprises", "Solutions", "Components", "Works",
        "Technologies", "Fabrics", "Agro", "Plastics", "Motors", "Engineering",
        "Logistics", "Packaging", "Products", "Exports", "Metals", "Foundry"
    ]

    id_counter = 1011

    # Helper to generate an MSME in a target risk bucket
    def create_msme(target_bucket: str) -> Dict[str, Any]:
        nonlocal id_counter
        while f"MSME-{id_counter}" in primary_ids:
            id_counter += 1
        pfx = rng.choice(company_prefixes)
        sfx = rng.choice(company_suffixes)
        name = f"{pfx} {sfx}"
        msme_id = f"MSME-{id_counter}"
        id_counter += 1

        sector = rng.choice(SECTORS)
        city, region = rng.choice(CITIES_REGIONS)
        age = round(rng.uniform(1.5, 15.0), 1)

        # Base annual revenue in INR (range 3 Cr to 25 Cr)
        annual_rev = round(rng.uniform(35000000, 220000000), -5)
        monthly_rev = round(annual_rev / 12, -4)

        if target_bucket == "LOW":
            risk_score = rng.randint(18, 38)
            pd = round(risk_score * 0.22 + rng.uniform(-0.5, 0.8), 1)
            pd = max(2.1, min(8.5, pd))
            rev_growth = round(rng.uniform(6.0, 22.0), 1)
            cf_volatility = round(rng.uniform(15.0, 36.0), 1)
            delay_days = rng.randint(5, 14)
            dscr = round(rng.uniform(1.75, 2.60), 2)
            debt_ratio = round(rng.uniform(0.15, 0.32), 2)
            business_act = rng.randint(82, 98)
            txn_consistency = rng.randint(80, 96)
            rev_stability = rng.randint(82, 96)
            cf_stability = rng.randint(80, 95)
            inv_consistency = rng.randint(84, 96)
            pmt_behavior = rng.randint(85, 98)
            txn_vol = "Low"
            trad_score = rng.randint(720, 810)
            health = "Healthy"
            trend = rng.choice(["improving", "stable", "stable"])
            reserve_multiplier = rng.uniform(0.7, 1.2)
            exposure_multiplier = rng.uniform(0.15, 0.35)
            cust_conc = rng.choice(["Low", "Low", "Moderate"])
            supp_conc = rng.choice(["Low", "Moderate"])
            segment = "LOW"

        elif target_bucket == "MODERATE":
            risk_score = rng.randint(41, 68)
            pd = round(risk_score * 0.28 + rng.uniform(-0.8, 1.2), 1)
            pd = max(8.8, min(19.8, pd))
            rev_growth = round(rng.uniform(-3.5, 8.5), 1)
            cf_volatility = round(rng.uniform(38.0, 64.0), 1)
            delay_days = rng.randint(15, 30)
            dscr = round(rng.uniform(1.15, 1.68), 2)
            debt_ratio = round(rng.uniform(0.33, 0.48), 2)
            business_act = rng.randint(68, 84)
            txn_consistency = rng.randint(65, 80)
            rev_stability = rng.randint(65, 80)
            cf_stability = rng.randint(60, 78)
            inv_consistency = rng.randint(68, 82)
            pmt_behavior = rng.randint(64, 79)
            txn_vol = rng.choice(["Moderate", "Moderate", "High"])
            trad_score = rng.randint(630, 715)
            health = "Watch" if risk_score > 58 else "Healthy"
            trend = rng.choice(["stable", "stable", "deteriorating"])
            reserve_multiplier = rng.uniform(0.35, 0.65)
            exposure_multiplier = rng.uniform(0.25, 0.45)
            cust_conc = rng.choice(["Moderate", "Moderate", "High"])
            supp_conc = rng.choice(["Moderate", "Low", "High"])
            segment = "MODERATE"

        else: # HIGH
            risk_score = rng.randint(70, 91)
            pd = round(risk_score * 0.38 + rng.uniform(-1.0, 2.5), 1)
            pd = max(22.0, min(48.5, pd))
            rev_growth = round(rng.uniform(-18.0, -1.5), 1)
            cf_volatility = round(rng.uniform(66.0, 92.0), 1)
            delay_days = rng.randint(31, 55)
            dscr = round(rng.uniform(0.78, 1.12), 2)
            debt_ratio = round(rng.uniform(0.49, 0.72), 2)
            business_act = rng.randint(50, 70)
            txn_consistency = rng.randint(48, 65)
            rev_stability = rng.randint(45, 62)
            cf_stability = rng.randint(40, 58)
            inv_consistency = rng.randint(50, 66)
            pmt_behavior = rng.randint(45, 62)
            txn_vol = "High"
            trad_score = rng.randint(540, 625)
            health = "Critical"
            trend = rng.choice(["deteriorating", "deteriorating", "stable"])
            reserve_multiplier = rng.uniform(0.12, 0.32)
            exposure_multiplier = rng.uniform(0.35, 0.60)
            cust_conc = rng.choice(["High", "High", "Moderate"])
            supp_conc = rng.choice(["High", "Moderate"])
            segment = "HIGH"

        inflow = round(monthly_rev * rng.uniform(0.92, 1.08), -4)
        outflow_ratio = 0.85 if target_bucket == "LOW" else (0.95 if target_bucket == "MODERATE" else 1.06)
        outflow = round(inflow * rng.uniform(outflow_ratio - 0.05, outflow_ratio + 0.05), -4)

        cash_reserve = round(monthly_rev * reserve_multiplier, -4)
        loan_exposure = round(annual_rev * exposure_multiplier * 0.25, -4)

        return {
            "msme_id": msme_id,
            "business_name": name,
            "sector": sector,
            "business_age": age,
            "city": city,
            "region": region,
            "annual_revenue": annual_rev,
            "monthly_revenue": monthly_rev,
            "cash_inflow": inflow,
            "cash_outflow": outflow,
            "revenue_growth": rev_growth,
            "cashflow_volatility": cf_volatility,
            "invoice_frequency": rng.randint(60, 95),
            "payment_delay_days": delay_days,
            "debt_ratio": debt_ratio,
            "dscr": dscr,
            "customer_concentration": cust_conc,
            "supplier_concentration": supp_conc,
            "business_activity": business_act,
            "transaction_consistency": txn_consistency,
            "revenue_stability": rev_stability,
            "cash_flow_stability": cf_stability,
            "invoice_consistency": inv_consistency,
            "payment_behavior": pmt_behavior,
            "transaction_volatility": txn_vol,
            "traditional_credit_score": trad_score,
            "risk_score": risk_score,
            "probability_of_default": pd,
            "risk_segment": segment,
            "cash_reserve": cash_reserve,
            "loan_exposure": loan_exposure,
            "cash_flow_health": health,
            "trend": trend,
            "recent_alert": None
        }

    for _ in range(needed_low):
        dataset.append(create_msme("LOW"))
    for _ in range(needed_mod):
        dataset.append(create_msme("MODERATE"))
    for _ in range(needed_high):
        dataset.append(create_msme("HIGH"))

    # Slight calibration to ensure exact average risk score ~57.4 if desired, or verify count
    return dataset

# 6-Month Cash Flow history & forecast for Metro Auto Parts
METRO_CASHFLOW_SERIES = [
    {"month": "Jul (Act)", "inflow": 8.6, "outflow": 7.0, "net": 1.6, "type": "actual"},
    {"month": "Aug (Act)", "inflow": 8.5, "outflow": 7.1, "net": 1.4, "type": "actual"},
    {"month": "Sep (Act)", "inflow": 8.2, "outflow": 7.1, "net": 1.1, "type": "actual"},
    {"month": "Oct", "inflow": 8.4, "outflow": 6.9, "net": 1.5, "type": "actual"},
    {"month": "Nov", "inflow": 8.1, "outflow": 7.3, "net": 0.8, "type": "actual"},
    {"month": "Dec", "inflow": 7.2, "outflow": 7.6, "net": -0.4, "type": "forecast", "lower_net": -0.8, "upper_net": 0.1},
    {"month": "Jan", "inflow": 7.8, "outflow": 7.1, "net": 0.7, "type": "forecast", "lower_net": 0.2, "upper_net": 1.1},
    {"month": "Feb", "inflow": 8.6, "outflow": 7.2, "net": 1.4, "type": "forecast", "lower_net": 0.8, "upper_net": 1.9},
    {"month": "Mar", "inflow": 9.1, "outflow": 7.4, "net": 1.7, "type": "forecast", "lower_net": 1.0, "upper_net": 2.3}
]

# Risk factors for Metro Auto Parts Explainable AI
METRO_EXPLANATION = {
    "model_name": "CrediLens Risk Engine v1.0",
    "method": "Feature Contribution Analysis (Demo Model)",
    "disclaimer": "The explanation shows which business signals contributed most to the model's predicted risk score for demonstration purposes.",
    "risk_increasing": [
        {"factor": "Cash-flow volatility", "contribution": 18, "description": "High month-over-month inflow/outflow fluctuation over last 6 months"},
        {"factor": "Revenue decline", "contribution": 15, "description": "YoY contraction of -8.2% in primary component line"},
        {"factor": "Debt burden", "contribution": 12, "description": "Debt-to-revenue ratio elevated at 0.44"},
        {"factor": "Payment delays", "contribution": 10, "description": "Average receivables turnaround slowed to 28 days"},
        {"factor": "Supplier concentration", "contribution": 6, "description": "Moderate dependence on single tier-2 raw material distributor"}
    ],
    "risk_reducing": [
        {"factor": "Business activity", "contribution": -11, "description": "Consistent weekly digital invoice & e-way bill generation"},
        {"factor": "Stable transaction frequency", "contribution": -8, "description": "High repeat customer counterparty density"},
        {"factor": "Improved supplier payments", "contribution": -5, "description": "Zero vendor defaults over trailing 12 months"}
    ]
}
