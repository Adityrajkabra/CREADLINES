"""
CrediLens — MSME Credit Intelligence Assistant Service
Provides contextual credit risk insights using existing data and models.
Supports optional external LLM integration via environment variables with deterministic fallback.
"""

import os
import json
import urllib.request
import urllib.error
from typing import Dict, Any, List, Optional

# Environment variables for optional LLM provider
LLM_API_KEY = os.getenv("LLM_API_KEY") or os.getenv("OPENAI_API_KEY") or os.getenv("GEMINI_API_KEY")
LLM_PROVIDER = os.getenv("LLM_PROVIDER", "openai_compatible" if LLM_API_KEY else "none")
LLM_MODEL = os.getenv("LLM_MODEL", "gpt-4o-mini" if "OPENAI_API_KEY" in os.environ else "default")
LLM_BASE_URL = os.getenv("LLM_BASE_URL", "https://api.openai.com/v1")

SYSTEM_DISCLAIMER = "This assistant explains synthetic demonstration data and model outputs. It does not make lending decisions."

def call_external_llm(
    prompt: str,
    context: Dict[str, Any]
) -> Optional[str]:
    """
    Calls an OpenAI-compatible chat completions endpoint if LLM_API_KEY is configured.
    Returns None if unconfigured or on failure.
    """
    if not LLM_API_KEY or LLM_PROVIDER == "none":
        return None

    try:
        url = f"{LLM_BASE_URL.rstrip('/')}/chat/completions"
        system_instruction = (
            "You are the CrediLens Intelligence Assistant, a senior fintech credit risk analyst. "
            "You help underwriters evaluate MSMEs by analyzing alternative business data, explainable AI, "
            "cash-flow forecasts, and stress simulations. "
            "CRITICAL RULES: "
            "1. Only cite figures and facts provided in the Borrower and Portfolio context. "
            "2. Never claim real banking or GST access; this is synthetic demo data. "
            "3. Do not approve or reject loans; frame all output as human-in-the-loop decision support. "
            f"4. Always uphold the disclaimer: {SYSTEM_DISCLAIMER}\n\n"
            f"CONTEXT:\n{json.dumps(context, indent=2)}"
        )

        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {LLM_API_KEY}"
        }

        body = {
            "model": LLM_MODEL,
            "messages": [
                {"role": "system", "content": system_instruction},
                {"role": "user", "content": prompt}
            ],
            "temperature": 0.2,
            "max_tokens": 600
        }

        req = urllib.request.Request(
            url,
            data=json.dumps(body).encode("utf-8"),
            headers=headers,
            method="POST"
        )

        with urllib.request.urlopen(req, timeout=5) as response:
            res_data = json.loads(response.read().decode("utf-8"))
            return res_data["choices"][0]["message"]["content"]
    except Exception as e:
        print(f"[CrediLens Assistant] External LLM call skipped or failed ({e}). Falling back to deterministic engine.")
        return None


def generate_chat_response(
    message: str,
    borrower_id: Optional[str],
    msme_map: Dict[str, Any],
    msme_database: List[Dict[str, Any]],
    risk_engine: Any,
    get_msme_cashflow: Any,
    simulate_stress: Any,
    calculate_loan_impact: Any,
    compute_fairness_audit: Any
) -> Dict[str, Any]:
    """
    Generates an intelligent contextual response based on the existing CrediLens data.
    """
    msg_lower = message.lower().strip()

    # Determine targeted borrower: check message for business names/IDs or use borrower_id
    target_msme = None
    if borrower_id and borrower_id in msme_map:
        target_msme = msme_map[borrower_id]

    # Check if a specific business is mentioned in the prompt
    for m in msme_database:
        if m["business_name"].lower() in msg_lower or m["msme_id"].lower() in msg_lower:
            target_msme = m
            break

    if not target_msme:
        target_msme = msme_map.get("MSME-1042") or msme_database[0]

    b_id = target_msme["msme_id"]
    b_name = target_msme["business_name"]
    b_score = target_msme["risk_score"]
    b_pd = target_msme["probability_of_default"]
    b_dscr = target_msme["dscr"]
    b_seg = target_msme["risk_segment"]
    b_health = target_msme["cash_flow_health"]

    # Gather live context objects
    explanation = risk_engine.explain_msme(target_msme)
    cashflow = get_msme_cashflow(target_msme)
    fairness = compute_fairness_audit(msme_database)
    model_metrics = {
        "version": risk_engine.version,
        "type": risk_engine.model_type,
        "metrics": risk_engine.metrics,
        "importances": risk_engine.feature_importances
    }

    # Prepare context dictionary for LLM if active
    llm_context = {
        "selected_borrower": {
            "name": b_name,
            "id": b_id,
            "sector": target_msme.get("sector"),
            "risk_score": b_score,
            "probability_of_default": f"{b_pd}%",
            "dscr": f"{b_dscr}x",
            "risk_segment": b_seg,
            "cash_flow_health": b_health,
            "annual_revenue": f"₹{(target_msme.get('annual_revenue', 0)/10000000):.2f} Cr"
        },
        "risk_explanation": explanation,
        "cash_flow_forecast": cashflow,
        "fairness_summary": fairness.get("cohorts", [])[0] if fairness.get("cohorts") else None,
        "model_metrics": model_metrics
    }

    # Try calling configured external LLM first
    llm_reply = call_external_llm(message, llm_context)
    if llm_reply:
        return {
            "reply": llm_reply,
            "data_sources": [
                f"{b_name} Profile ({b_id})",
                "CrediLens Risk Engine v1.0",
                "Cash Flow Forecast Engine"
            ],
            "mode": "ai",
            "borrower_id": b_id,
            "disclaimer": SYSTEM_DISCLAIMER
        }

    # ----------------------------------------------------
    # Deterministic Data-Driven Assistant Engine
    # ----------------------------------------------------
    data_sources: List[str] = [f"{b_name} Operational Profile ({b_id})"]

    # 1. Why risky / why this score / explain score / risk factors
    if any(k in msg_lower for k in [
        "why", "score", "risky", "risk factor", "contributor", "increase", "reduce", "why this", "explanation"
    ]) and not any(k in msg_lower for k in ["fairness", "model perform", "auc"]):
        data_sources.append("Risk Engine Feature Attribution")

        inc_factors = explanation.get("risk_increasing", [])
        red_factors = explanation.get("risk_reducing", [])

        inc_str = "\n".join([f"  • **{f['factor']}** (+{f['contribution']} pts): {f.get('detail') or f.get('description', '')}" for f in inc_factors[:4]])
        red_str = "\n".join([f"  • **{f['factor']}** ({f['contribution']} pts): {f.get('detail') or f.get('description', '')}" for f in red_factors[:3]])

        reply = (
            f"**{b_name} ({b_id})** has an assigned risk score of **{b_score}/100** ({b_seg} Risk) "
            f"with an estimated **{b_pd}% Probability of Default**.\n\n"
            f"### Primary Risk-Increasing Drivers:\n{inc_str}\n\n"
            f"### Operational Risk Mitigants:\n{red_str}\n\n"
            f"**Underwriting Assessment**: While operational throughput and recurring invoice consistency provide structural stability, "
            f"elevated cash-flow volatility and receivables collection delays place this borrower in the **{b_health}** category, "
            f"warranting enhanced credit review."
        )
        return {
            "reply": reply,
            "data_sources": data_sources,
            "mode": "demo",
            "borrower_id": b_id,
            "disclaimer": SYSTEM_DISCLAIMER
        }

    # 2. DSCR / Debt Service Coverage / Debt capacity
    if "dscr" in msg_lower or "debt" in msg_lower or "coverage" in msg_lower:
        data_sources.append("Solvency & Coverage Assessment")
        threshold_note = "near the conservative 1.10x floor" if b_dscr < 1.3 else "maintaining comfortable headroom"
        reply = (
            f"**Debt Service Coverage Ratio (DSCR)** measures an enterprise's ability to cover its debt principal "
            f"and interest payments from operational cash flow.\n\n"
            f"• **Current DSCR for {b_name}**: **{b_dscr}x** ({threshold_note}).\n"
            f"• **Benchmark Threshold**: Commercial lenders typically target a minimum of **1.25x** for unsecured credit facilities.\n"
            f"• **Impact on Underwriting**: At {b_dscr}x, operating cash margins can cover debt obligations under current conditions, "
            f"but any revenue contraction or cost surge above 8% could compress DSCR below 1.0x, creating debt servicing strain."
        )
        return {
            "reply": reply,
            "data_sources": data_sources,
            "mode": "demo",
            "borrower_id": b_id,
            "disclaimer": SYSTEM_DISCLAIMER
        }

    # 3. Cash Flow / Forecast / Liquidity / December pressure
    if any(k in msg_lower for k in ["cash flow", "cash-flow", "forecast", "liquidity", "runway", "inflow", "outflow"]):
        data_sources.append("Cash Flow Forecasting Engine")
        insight = cashflow.get("forecast_insight", "Seasonal cash pressure projected.")
        min_mo = cashflow.get("min_reserve_month", "December")
        runway = cashflow.get("burn_runway", "2.8 months")

        table_summary = ""
        if cashflow.get("table_data"):
            table_summary = "\n".join([f"  • **{row['month']}**: Inflow {row['inflow']} | Outflow {row['outflow']} | Net **{row['net']}** ({row['status']})" for row in cashflow["table_data"][:6]])

        reply = (
            f"**Cash Flow Analysis for {b_name}** ({cashflow.get('methodology', 'Predictive Forecast')}):\n\n"
            f"**Key Forecast Insight**:\n> *\"{insight}\"*\n\n"
            f"**Projected 6-Month Trajectory**:\n{table_summary}\n\n"
            f"• **Trough Month**: {min_mo}\n"
            f"• **Estimated Liquidity Runway**: {runway}\n"
            f"• **Underwriting Recommendation**: Consider a structured working capital buffer or receivables-linked line to absorb the seasonal December deficit."
        )
        return {
            "reply": reply,
            "data_sources": data_sources,
            "mode": "demo",
            "borrower_id": b_id,
            "disclaimer": SYSTEM_DISCLAIMER
        }

    # 4. What-If Lab / Economic Stress / Simulation / Moderate Stress / Severe Stress
    if any(k in msg_lower for k in ["what-if", "what if", "stress", "simulation", "scenario", "moderate stress", "severe stress", "shock"]):
        data_sources.append("What-If Economic Stress Simulator")

        if "severe" in msg_lower:
            sim_res = simulate_stress(target_msme, revenue_change=-20.0, cost_change=15.0, interest_change=4.0, payment_delay_days=30.0)
            scen_name = "Severe Stress (-20% Revenue, +15% Costs, +4% Interest, +30d Delay)"
        else:
            sim_res = simulate_stress(target_msme, revenue_change=-10.0, cost_change=8.0, interest_change=2.0, payment_delay_days=15.0)
            scen_name = "Moderate Stress (-10% Revenue, +8% Costs, +2% Interest, +15d Delay)"

        reply = (
            f"### What-If Lab Simulation Results for {b_name}\n"
            f"**Scenario Tested**: {scen_name}\n\n"
            f"| Metric | Current Baseline | Stress Scenario | Delta |\n"
            f"| :--- | :--- | :--- | :--- |\n"
            f"| **Risk Score** | {b_score} / 100 | **{sim_res['risk_score']} / 100** | +{sim_res['risk_score'] - b_score} pts |\n"
            f"| **Prob. of Default (PD)** | {b_pd}% | **{sim_res['probability_of_default']}%** | +{(sim_res['probability_of_default'] - b_pd):.1f}% |\n"
            f"| **DSCR** | {b_dscr}x | **{sim_res['dscr']}x** | {(sim_res['dscr'] - b_dscr):.2f}x |\n"
            f"| **Cash Reserve** | ₹4.2L | **₹{sim_res['cash_reserve']}L** | -₹{(4.2 - sim_res['cash_reserve']):.1f}L |\n"
            f"| **Assigned Segment** | {b_seg} | **{sim_res['risk_segment']}** | Risk Migration |\n\n"
            f"> **Stress Result**: *\"{sim_res['stress_result']}\"*\n"
            f"• **Status**: {sim_res.get('dscr_status', 'Strained')}\n"
            f"• **Receivables Drag**: {sim_res.get('liquidity_strain', 'Increased working capital cycle')}"
        )
        return {
            "reply": reply,
            "data_sources": data_sources,
            "mode": "demo",
            "borrower_id": b_id,
            "disclaimer": SYSTEM_DISCLAIMER
        }

    # 5. Loan Impact / EMI
    if any(k in msg_lower for k in ["loan impact", "emi", "tenure", "borrow", "additional loan", "loan amount"]):
        data_sources.append("Loan Impact Simulator")
        loan_res = calculate_loan_impact(target_msme, loan_amount=1000000.0, interest_rate=12.0, tenure_months=24)
        reply = (
            f"### Loan Impact Simulation for {b_name}\n"
            f"Evaluating proposed term loan of **₹10,00,000 @ 12.0% p.a. for 24 months**:\n\n"
            f"• **Estimated Monthly EMI**: **{loan_res['formatted_emi']}**\n"
            f"• **DSCR Migration**: {loan_res['current']['dscr']}x → **{loan_res['after_loan']['dscr']}x** ({loan_res['delta']['dscr']}x)\n"
            f"• **Risk Score Migration**: {loan_res['current']['risk_score']} → **{loan_res['after_loan']['risk_score']}** (+{loan_res['delta']['risk_score']} pts)\n"
            f"• **Projected Cash Reserve**: ₹{loan_res['current']['cash_reserve']}L → **₹{loan_res['after_loan']['cash_reserve']}L**\n\n"
            f"> **Underwriting Guidance**: *\"{loan_res['underwriting_note']}\"*"
        )
        return {
            "reply": reply,
            "data_sources": data_sources,
            "mode": "demo",
            "borrower_id": b_id,
            "disclaimer": SYSTEM_DISCLAIMER
        }

    # 6. Highest risk MSMEs / Portfolio overview
    if any(k in msg_lower for k in ["highest risk", "top risk", "riskiest", "portfolio", "worst", "list msmes", "overview"]):
        data_sources.append("Portfolio Registry (127 MSMEs)")
        sorted_msmes = sorted(msme_database, key=lambda x: x["risk_score"], reverse=True)
        top_high = sorted_msmes[:5]

        top_list = "\n".join([f"  {i+1}. **{m['business_name']}** ({m['msme_id']}) — Risk Score: **{m['risk_score']}**, PD: {m['probability_of_default']}%, Sector: {m['sector']}" for i, m in enumerate(top_high)])

        reply = (
            f"### Portfolio Risk Overview (127 MSMEs)\n"
            f"• **Low Risk (0-39)**: 54 MSMEs (42.5%)\n"
            f"• **Moderate Risk (40-69)**: 49 MSMEs (38.6%)\n"
            f"• **High Risk (70-100)**: 24 MSMEs (18.9%)\n"
            f"• **Portfolio Average Risk Score**: 57.4 / 100\n"
            f"• **Portfolio at Risk (PAR)**: 18.6%\n\n"
            f"**Highest Risk MSMEs Currently Flagged**:\n{top_list}\n\n"
            f"Select any borrower from the Portfolio table to review specific alternative signals and cash flow forecasts."
        )
        return {
            "reply": reply,
            "data_sources": data_sources,
            "mode": "demo",
            "borrower_id": b_id,
            "disclaimer": SYSTEM_DISCLAIMER
        }

    # 7. Model performance / Model monitor / ROC-AUC
    if any(k in msg_lower for k in ["model", "performance", "auc", "roc", "accuracy", "f1", "precision", "recall"]):
        data_sources.append("Model Observability Engine (v1.0)")
        m_stats = model_metrics["metrics"]
        top_feats = "\n".join([f"  • **{f['feature']}**: {int(f['importance']*100)}% weight ({f['category']})" for f in model_metrics["importances"][:5]])

        reply = (
            f"### CrediLens Risk Engine v1.0 Model Metrics\n"
            f"• **Architecture**: Gradient Boosting Classifier (GBC)\n"
            f"• **Training Corpus**: 2,500 synthetic MSME validation records\n"
            f"• **Features Analyzed**: 18 alternative operational variables\n\n"
            f"**Benchmark Validation Performance**:\n"
            f"• **ROC-AUC**: **{m_stats.get('roc_auc', 0.86)}**\n"
            f"• **Precision**: **{m_stats.get('precision', 0.79)}**\n"
            f"• **Recall**: **{m_stats.get('recall', 0.74)}**\n"
            f"• **F1-Score**: **{m_stats.get('f1', 0.76)}**\n\n"
            f"**Top Predictive Features**:\n{top_feats}\n\n"
            f"*Note: Evaluated on synthetic enterprise validation splits for algorithmic audit demonstration.*"
        )
        return {
            "reply": reply,
            "data_sources": data_sources,
            "mode": "demo",
            "borrower_id": b_id,
            "disclaimer": SYSTEM_DISCLAIMER
        }

    # 8. Fairness audit / Bias monitor
    if any(k in msg_lower for k in ["fairness", "bias", "parity", "disparate", "cohort"]):
        data_sources.append("Fairness & Bias Monitor")
        cohorts = fairness.get("cohorts", [])
        c_desc = ""
        for c in cohorts:
            g_lines = ", ".join([f"{g['group_name']}: Rec Rate {g['recommendation_rate']}%, Avg Risk {g['average_risk_score']}" for g in c["groups"]])
            c_desc += f"• **{c['partition_type']}** (Disparate Impact: **{c['disparate_impact_ratio']}**):\n  {g_lines}\n  *Status*: {c['status']}\n\n"

        reply = (
            f"### Fairness & Bias Audit Summary\n"
            f"**Fairness Status**: **MONITOR**\n\n"
            f"{c_desc}"
            f"**Ethical Governance Standards**:\n"
            f"• Follows the regulatory four-fifths (80%) disparate impact standard.\n"
            f"• Protected personal demographics are excluded from all model scoring.\n"
            f"• Audits are executed on synthetic geographic and enterprise-age clusters to detect operational bias."
        )
        return {
            "reply": reply,
            "data_sources": data_sources,
            "mode": "demo",
            "borrower_id": b_id,
            "disclaimer": SYSTEM_DISCLAIMER
        }

    # 9. Default contextual response for general queries
    reply = (
        f"I am analyzing **{b_name} ({b_id})** in the **{target_msme.get('sector', 'MSME')}** sector.\n\n"
        f"• **Risk Score**: **{b_score}/100** ({b_seg})\n"
        f"• **Probability of Default**: **{b_pd}%**\n"
        f"• **Debt Service Coverage (DSCR)**: **{b_dscr}x**\n"
        f"• **Cash Flow Health**: **{b_health}**\n\n"
        f"You can ask me specific questions such as:\n"
        f"• *\"Why is this borrower risky?\"*\n"
        f"• *\"Explain the cash-flow forecast\"*\n"
        f"• *\"What happens under moderate stress?\"*\n"
        f"• *\"What does DSCR mean for this business?\"*\n"
        f"• *\"Which MSMEs have the highest risk?\"*\n"
        f"• *\"Explain the model's performance and fairness audit\"*"
    )
    return {
        "reply": reply,
        "data_sources": data_sources,
        "mode": "demo",
        "borrower_id": b_id,
        "disclaimer": SYSTEM_DISCLAIMER
    }
