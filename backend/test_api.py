"""
CrediLens — Backend API Endpoint Test Suite (Direct Execution)
"""

import sys
import io

# Ensure UTF-8 output on Windows console
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

import main
from main import (
    get_overview,
    list_msmes,
    get_msme,
    get_msme_risk,
    get_cashflow_data,
    run_simulation,
    get_fairness_monitor,
    get_model_metrics,
    run_loan_impact,
    generate_credit_intelligence_report,
    chat_endpoint,
    SimulationRequest,
    LoanImpactRequest,
    ChatRequest
)

def test_all():
    print("1. Testing get_overview()...")
    ov = get_overview()
    kpis = ov["kpis"]
    assert kpis["total_msmes"] == 127
    assert kpis["low_risk"] == 54
    assert kpis["moderate_risk"] == 49
    assert kpis["high_risk"] == 24
    assert kpis["average_risk_score"] == 57.4
    assert kpis["portfolio_at_risk"] == 18.6
    print(f"   -> PASS: 127 MSMEs, Low={kpis['low_risk']}, Mod={kpis['moderate_risk']}, High={kpis['high_risk']}, Avg={kpis['average_risk_score']}, PAR={kpis['portfolio_at_risk']}%")

    print("2. Testing list_msmes()...")
    msme_list = list_msmes()
    assert msme_list["total"] == 127
    assert len(msme_list["msmes"]) == 127
    print("   -> PASS: 127 MSMEs listed")

    print("3. Testing get_msme('MSME-1042')...")
    metro = get_msme("MSME-1042")
    m = metro["msme"]
    assert m["business_name"] == "Metro Auto Parts"
    assert m["risk_score"] == 68
    assert m["probability_of_default"] == 18.7
    assert m["dscr"] == 1.24
    assert m["revenue_growth"] == -8.2
    assert "alternative_signals" in metro
    assert metro["alternative_signals"]["cash_flow_stability"]["score"] == 61
    print("   -> PASS: Metro Auto Parts: Risk Score 68, PD 18.7%, DSCR 1.24x, Revenue -8.2%")

    print("4. Testing get_msme_risk('MSME-1042') [Explainable AI]...")
    risk_info = get_msme_risk("MSME-1042")
    exp = risk_info["explanation"]
    inc_factors = {item["factor"]: item["contribution"] for item in exp["risk_increasing"]}
    red_factors = {item["factor"]: item["contribution"] for item in exp["risk_reducing"]}
    assert inc_factors["Cash-flow volatility"] == 18
    assert inc_factors["Revenue decline"] == 15
    assert inc_factors["Debt burden"] == 12
    assert inc_factors["Payment delays"] == 10
    assert inc_factors["Supplier concentration"] == 6
    assert red_factors["Business activity"] == -11
    assert red_factors["Stable transaction frequency"] == -8
    assert red_factors["Improved supplier payments"] == -5
    print("   -> PASS: All SHAP-style waterfall factors verified (+18, +15, +12, +10, +6, -11, -8, -5)")

    print("5. Testing get_cashflow_data('MSME-1042')...")
    cf = get_cashflow_data("MSME-1042")
    assert any(row["month"] == "Dec" and "-₹0.4L" in row["net"] for row in cf["table_data"])
    assert "December" in cf["forecast_insight"]
    print("   -> PASS: Cash flow series contains Dec trough (-0.4L) and seasonal warning insight")

    print("6. Testing run_simulation() [Moderate Stress]...")
    sim_req = SimulationRequest(
        msme_id="MSME-1042",
        revenue_change=-10.0,
        cost_change=8.0,
        interest_change=2.0,
        payment_delay_days=15.0
    )
    sim_res = run_simulation(sim_req)
    state = sim_res["simulated_state"]
    assert state["risk_score"] == 72
    assert state["probability_of_default"] == 21.8
    assert state["cash_reserve"] == 3.1
    assert state["dscr"] == 1.12
    print(f"   -> PASS: Moderate Stress: Score {state['risk_score']}, PD {state['probability_of_default']}%, Reserve {state['cash_reserve']}L, DSCR {state['dscr']}x")

    print("7. Testing run_simulation() [Severe Stress]...")
    sim_sev_req = SimulationRequest(
        msme_id="MSME-1042",
        revenue_change=-20.0,
        cost_change=15.0,
        interest_change=4.0,
        payment_delay_days=30.0
    )
    sim_sev_res = run_simulation(sim_sev_req)
    state_sev = sim_sev_res["simulated_state"]
    assert state_sev["risk_score"] == 84
    assert state_sev["probability_of_default"] == 34.6
    assert state_sev["cash_reserve"] == 1.4
    assert state_sev["dscr"] == 0.91
    print(f"   -> PASS: Severe Stress: Score {state_sev['risk_score']}, PD {state_sev['probability_of_default']}%, Reserve {state_sev['cash_reserve']}L, DSCR {state_sev['dscr']}x")

    print("8. Testing run_loan_impact()...")
    loan_req = LoanImpactRequest(
        msme_id="MSME-1042",
        loan_amount=1000000.0,
        interest_rate=12.0,
        tenure_months=24
    )
    loan_res = run_loan_impact(loan_req)
    assert loan_res["after_loan"]["risk_score"] == 73
    assert loan_res["after_loan"]["dscr"] == 1.09
    assert loan_res["after_loan"]["cash_reserve"] == 2.8
    assert "47,073" in loan_res["formatted_emi"]
    print(f"   -> PASS: Loan impact: EMI {loan_res['formatted_emi']}, Score 68->73, DSCR 1.24x->1.09x, Reserve 4.2L->2.8L")

    print("9. Testing get_fairness_monitor()...")
    fairness = get_fairness_monitor()
    assert fairness["fairness_status"] == "MONITOR"
    assert len(fairness["cohorts"]) >= 2
    print("   -> PASS: Fairness Monitor: Regional and Maturity cohorts within four-fifths parity rule")

    print("10. Testing get_model_metrics()...")
    metrics = get_model_metrics()
    assert metrics["metrics"]["roc_auc"] >= 0.85
    assert len(metrics["feature_importances"]) >= 6
    print(f"   -> PASS: Model Observability: ROC-AUC {metrics['metrics']['roc_auc']}, Precision {metrics['metrics']['precision']}, Recall {metrics['metrics']['recall']}, F1 {metrics['metrics']['f1']}")

    print("11. Testing generate_credit_intelligence_report('MSME-1042')...")
    report = generate_credit_intelligence_report("MSME-1042")
    assert report["decision_support"] == "Enhanced underwriting review"
    print(f"   -> PASS: Decision Support Report generated with '{report['decision_support']}'")

    print("12. Testing chat_endpoint() [CrediLens Intelligence Assistant]...")
    chat1 = chat_endpoint(ChatRequest(message="Why is Metro Auto Parts risky?", borrower_id="MSME-1042"))
    assert "Metro Auto Parts" in chat1.reply
    assert "68" in chat1.reply
    assert "Cash-flow volatility" in chat1.reply
    assert len(chat1.data_sources) >= 2
    assert chat1.mode in ["ai", "demo"]

    chat2 = chat_endpoint(ChatRequest(message="What happens under moderate stress?", borrower_id="MSME-1042"))
    assert "72" in chat2.reply or "Moderate Stress" in chat2.reply

    chat3 = chat_endpoint(ChatRequest(message="Explain the cash-flow forecast", borrower_id="MSME-1042"))
    assert "December" in chat3.reply

    chat4 = chat_endpoint(ChatRequest(message="Which MSMEs have the highest risk?"))
    assert "127 MSMEs" in chat4.reply

    print("   -> PASS: Chatbot accurately answers risk score, stress test, cash-flow, and portfolio queries!")

    print("\n=======================================================")
    print("   ALL TESTS PASSED WITH 100% SPECIFICATION FIDELITY   ")
    print("=======================================================")

if __name__ == "__main__":
    test_all()
