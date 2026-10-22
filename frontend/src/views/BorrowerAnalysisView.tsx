import React, { useState, useEffect } from 'react';
import {
  Building2,
  FileText,
  Calculator,
  Info,
  Sliders,
  ChevronRight,
  Database,
  UploadCloud,
  CheckCircle2,
  FileSpreadsheet
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
} from 'recharts';
import { MSME, RiskExplanation, LoanImpactResponse } from '../types';
import { api } from '../services/api';
import { InfoTooltip } from '../components/InfoTooltip';

interface BorrowerAnalysisViewProps {
  borrower: MSME;
  onOpenReport: () => void;
  onNavigateToWhatIf: () => void;
  onNavigateToCashflow: () => void;
}

export const BorrowerAnalysisView: React.FC<BorrowerAnalysisViewProps> = ({
  borrower,
  onOpenReport,
  onNavigateToWhatIf,
  onNavigateToCashflow
}) => {
  const [riskData, setRiskData] = useState<RiskExplanation | null>(null);
  const [signals, setSignals] = useState<any>(null);
  const [dataSummary, setDataSummary] = useState<any>(null);

  // Loan Impact State
  const [loanAmount, setLoanAmount] = useState<number>(1000000);
  const [interestRate, setInterestRate] = useState<number>(12);
  const [tenureMonths, setTenureMonths] = useState<number>(24);
  const [loanImpact, setLoanImpact] = useState<LoanImpactResponse | null>(null);
  const [isCalculatingLoan, setIsCalculatingLoan] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    api.getMSME(borrower.msme_id).then(res => {
      if (isMounted) setSignals(res.alternative_signals);
    });
    api.getMSMERisk(borrower.msme_id).then(res => {
      if (isMounted) setRiskData(res.explanation);
    });
    api.getMsmeDataSummary(borrower.msme_id).then(res => {
      if (isMounted) setDataSummary(res);
    }).catch(() => {});
    // Calculate initial loan impact
    calculateLoan(1000000, 12, 24);
    return () => { isMounted = false; };
  }, [borrower.msme_id]);

  const calculateLoan = async (amt: number, rate: number, tenure: number) => {
    setIsCalculatingLoan(true);
    try {
      const res = await api.calculateLoanImpact({
        msme_id: borrower.msme_id,
        loan_amount: amt,
        interest_rate: rate,
        tenure_months: tenure
      });
      setLoanImpact(res);
    } finally {
      setIsCalculatingLoan(false);
    }
  };

  const handleLoanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    calculateLoan(loanAmount, interestRate, tenureMonths);
  };

  const isMetro = borrower.msme_id === 'MSME-1042';

  // Risk Score Styling
  const riskColor =
    borrower.risk_score >= 70
      ? 'text-[#EF5350]'
      : borrower.risk_score >= 40
      ? 'text-[#E8A23A]'
      : 'text-[#22A477]';

  const riskBadgeStyle =
    borrower.risk_score >= 70
      ? 'bg-[#331515] text-[#EF5350] border-[#6B1F1F]'
      : borrower.risk_score >= 40
      ? 'bg-[#332410] text-[#E8A23A] border-[#6B4A15]'
      : 'bg-[#132E25] text-[#22A477] border-[#1A533E]';

  // Loan impact comparison data for bar chart
  const loanComparisonData = loanImpact ? [
    {
      metric: 'Risk Score',
      Current: loanImpact.current.risk_score,
      'After Loan': loanImpact.after_loan.risk_score,
      unit: '/100'
    },
    {
      metric: 'DSCR (x10)',
      Current: Math.round(loanImpact.current.dscr * 10),
      'After Loan': Math.round(loanImpact.after_loan.dscr * 10),
      unit: 'x'
    },
    {
      metric: 'Cash Reserve (₹L)',
      Current: loanImpact.current.cash_reserve,
      'After Loan': loanImpact.after_loan.cash_reserve,
      unit: 'L'
    }
  ] : [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Borrower Profile Header */}
      <div className="bg-[#171719] border border-[#303035] rounded-xl p-6 shadow-fin-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-xl bg-[#332015] border border-[#75401F] flex items-center justify-center text-[#FF7A1A] shrink-0">
              <Building2 className="w-7 h-7" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl font-bold tracking-tight text-[#F5F5F5]">
                  {borrower.business_name}
                </h1>
                <span className="font-mono text-xs font-semibold px-2.5 py-0.5 rounded bg-[#332015] text-[#FF7A1A] border border-[#75401F]">
                  {borrower.msme_id}
                </span>
                <span className={`text-xs font-bold uppercase px-2.5 py-0.5 rounded border ${riskBadgeStyle}`}>
                  {isMetro ? 'MODERATE-HIGH RISK' : `${borrower.risk_segment} RISK`}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-[#A1A1AA] mt-1.5">
                <span className="text-[#F5F5F5] font-semibold">{borrower.sector}</span>
                <span>•</span>
                <span>Incorporated {borrower.business_age} Years</span>
                <span>•</span>
                <span>{borrower.city}, {borrower.region}</span>
                <span>•</span>
                <span>
                  Annual Revenue: <strong className="text-[#F5F5F5] font-mono">₹{(borrower.annual_revenue / 10000000).toFixed(2)} Cr</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={onNavigateToCashflow}
              className="px-3.5 py-2 rounded-lg bg-[#1E1E21] hover:bg-[#262629] text-[#F5F5F5] border border-[#303035] hover:border-[#75401F] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>6-Month Forecast</span>
              <ChevronRight className="w-3.5 h-3.5 text-[#FF7A1A]" />
            </button>
            <button
              onClick={onNavigateToWhatIf}
              className="px-3.5 py-2 rounded-lg bg-[#1E1E21] hover:bg-[#262629] text-[#F5F5F5] border border-[#303035] hover:border-[#75401F] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Sliders className="w-3.5 h-3.5 text-[#FF7A1A]" />
              <span>What-If Lab</span>
            </button>
            <button
              onClick={onOpenReport}
              className="px-4 py-2 rounded-lg bg-[#FF7A1A] hover:bg-[#FF8F3D] active:bg-[#C2410C] text-[#0D0D0F] text-xs font-bold flex items-center gap-2 shadow-fin-sm transition-all cursor-pointer"
            >
              <FileText className="w-4 h-4" />
              <span>Generate Underwriting Report</span>
            </button>
          </div>
        </div>

        {/* Synthetic Notice Banner */}
        <div className="mt-4 pt-3 border-t border-[#303035] flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-[#71717A] gap-2">
          <div className="flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-[#FF7A1A] shrink-0" />
            <span>Synthetic alternative business telemetry evaluated for algorithmic credit decision-support.</span>
          </div>
          <span className="font-mono text-[#71717A]">Audit Run: 2026.Q3</span>
        </div>
      </div>

      {/* Main Risk Card & Explainable AI */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Main Risk Summary (5 cols) */}
        <div className="lg:col-span-5 bg-[#171719] border border-[#303035] rounded-xl p-6 flex flex-col justify-between space-y-5 shadow-fin-sm">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-bold tracking-wider text-[#A1A1AA]">
                Composite Risk Assessment
              </span>
              <InfoTooltip
                title="Risk Score"
                text="Composite predictive risk score (0-100) derived from alternative cash-flow, GST invoice, and payment telemetry. Higher score indicates greater risk."
              />
            </div>

            <div className="mt-4 flex items-baseline gap-3">
              <div className={`text-5xl font-extrabold tracking-tight font-mono tabular-nums ${riskColor}`}>
                {borrower.risk_score}
              </div>
              <div className="text-sm text-[#71717A] font-medium">/ 100</div>
              <span className={`ml-auto px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wide border ${riskBadgeStyle}`}>
                {isMetro ? 'MODERATE-HIGH' : borrower.risk_segment}
              </span>
            </div>

            {/* Horizontal Risk Scale (0-100) */}
            <div className="mt-4 space-y-1.5">
              <div className="h-3 w-full bg-[#141416] border border-[#303035] rounded-full overflow-hidden p-0.5 flex relative">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${borrower.risk_score}%`,
                    backgroundColor:
                      borrower.risk_score >= 70 ? '#EF5350' : borrower.risk_score >= 40 ? '#E8A23A' : '#22A477'
                  }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-[#71717A] font-mono px-0.5">
                <span>0 Low</span>
                <span>40 Moderate</span>
                <span>70 High</span>
                <span>100</span>
              </div>
            </div>
          </div>

          {/* Key 4 Risk Telemetry Metrics */}
          <div className="grid grid-cols-2 gap-3 pt-4 border-t border-[#303035]">
            {/* Probability of Default */}
            <div className="p-3 rounded-lg bg-[#141416] border border-[#303035]">
              <div className="flex items-center justify-between text-[11px] text-[#A1A1AA]">
                <span>Prob. of Default (PD)</span>
                <InfoTooltip text="Model-estimated 12-month commercial default probability." />
              </div>
              <div className="text-lg font-bold font-mono text-[#EF5350] tabular-nums mt-1">
                {borrower.probability_of_default}%
              </div>
              <div className="text-[10px] text-[#71717A] mt-0.5">12M Forward Horizon</div>
            </div>

            {/* Cash Flow Stability */}
            <div className="p-3 rounded-lg bg-[#141416] border border-[#303035]">
              <div className="flex items-center justify-between text-[11px] text-[#A1A1AA]">
                <span>Cash Flow Stability</span>
                <InfoTooltip text="Quantifies month-over-month operating surplus consistency." />
              </div>
              <div className="text-lg font-bold font-mono text-[#E8A23A] tabular-nums mt-1">
                {borrower.cash_flow_stability}%
              </div>
              <div className="text-[10px] text-[#71717A] mt-0.5">Moderate Variance</div>
            </div>

            {/* Debt Service Coverage (DSCR) */}
            <div className="p-3 rounded-lg bg-[#141416] border border-[#303035]">
              <div className="flex items-center justify-between text-[11px] text-[#A1A1AA]">
                <span>Debt Service Coverage</span>
                <InfoTooltip text="Debt Service Coverage Ratio — operating cash flow divided by total debt service (Target ≥ 1.25x)." />
              </div>
              <div className="text-lg font-bold font-mono text-[#F5F5F5] tabular-nums mt-1">
                {borrower.dscr}x
              </div>
              <div className="text-[10px] text-[#FF7A1A] mt-0.5">Threshold Buffer: +0.04x</div>
            </div>

            {/* Revenue Trend */}
            <div className="p-3 rounded-lg bg-[#141416] border border-[#303035]">
              <div className="flex items-center justify-between text-[11px] text-[#A1A1AA]">
                <span>Revenue Trend</span>
                <InfoTooltip text="Trailing 12-month year-over-year revenue trajectory." />
              </div>
              <div
                className={`text-lg font-bold font-mono tabular-nums mt-1 ${
                  borrower.revenue_growth >= 0 ? 'text-[#22A477]' : 'text-[#EF5350]'
                }`}
              >
                {borrower.revenue_growth > 0 ? `+${borrower.revenue_growth}%` : `${borrower.revenue_growth}%`}
              </div>
              <div className="text-[10px] text-[#71717A] mt-0.5">
                {borrower.revenue_growth >= 0 ? 'YoY Expanded' : 'YoY Contracted'}
              </div>
            </div>
          </div>
        </div>

        {/* Explainable AI: WHY THIS RISK SCORE? (7 cols) */}
        <div className="lg:col-span-7 bg-[#171719] border border-[#303035] rounded-xl p-6 space-y-4 flex flex-col justify-between shadow-fin-sm">
          <div>
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-[#F5F5F5]">
                    WHY THIS RISK SCORE?
                  </h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#332015] text-[#FF7A1A] border border-[#75401F]">
                    Model Explanation — GBC v1.0
                  </span>
                </div>
                <p className="text-xs text-[#A1A1AA] mt-0.5">
                  Factor contribution breakdown against the baseline population benchmark
                </p>
              </div>
              <InfoTooltip
                title="Explainable AI"
                text="Shows which business telemetry signals contributed positively or negatively to the predicted credit score."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3">
              {/* Risk Increasing Factors */}
              <div className="space-y-2.5">
                <div className="text-xs font-bold text-[#EF5350] flex items-center justify-between pb-1 border-b border-[#6B1F1F]">
                  <span>Risk Increasing Factors</span>
                  <span className="text-[10px] font-mono text-[#71717A]">Points Added</span>
                </div>

                <div className="space-y-2">
                  {(riskData?.risk_increasing || [
                    { factor: 'Cash-flow volatility', contribution: 18, detail: 'High MoM variance in inflows' },
                    { factor: 'Revenue decline', contribution: 15, detail: 'YoY contraction of -8.2%' },
                    { factor: 'Debt burden', contribution: 12, detail: 'Elevated debt-to-revenue ratio' },
                    { factor: 'Payment delays', contribution: 10, detail: 'Receivables turnaround 28 days' },
                    { factor: 'Supplier concentration', contribution: 6, detail: 'Dependency on key vendor' }
                  ]).map((item, idx) => (
                    <div key={idx} className="p-2.5 rounded-lg bg-[#331515] border border-[#6B1F1F] text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-[#F5F5F5]">{item.factor}</span>
                        <span className="font-mono font-bold text-[#EF5350] tabular-nums">+{item.contribution}</span>
                      </div>
                      <div className="h-1.5 w-full bg-[#141416] rounded-full mt-1.5 overflow-hidden">
                        <div
                          className="h-full bg-[#EF5350] rounded-full"
                          style={{ width: `${Math.min(100, item.contribution * 4)}%` }}
                        />
                      </div>
                      <div className="text-[10px] text-[#A1A1AA] mt-1">{item.detail || item.description}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Risk Reducing Factors */}
              <div className="space-y-2.5">
                <div className="text-xs font-bold text-[#22A477] flex items-center justify-between pb-1 border-b border-[#1A533E]">
                  <span>Risk Reducing Factors</span>
                  <span className="text-[10px] font-mono text-[#71717A]">Points Reduced</span>
                </div>

                <div className="space-y-2">
                  {(riskData?.risk_reducing || [
                    { factor: 'Business activity', contribution: -11, detail: 'High transaction frequency' },
                    { factor: 'Stable transaction frequency', contribution: -8, detail: 'Regular weekly deposits' },
                    { factor: 'Improved supplier payments', contribution: -5, detail: 'Zero supplier defaults' }
                  ]).map((item, idx) => (
                    <div key={idx} className="p-2.5 rounded-lg bg-[#132E25] border border-[#1A533E] text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-[#F5F5F5]">{item.factor}</span>
                        <span className="font-mono font-bold text-[#22A477] tabular-nums">{item.contribution}</span>
                      </div>
                      <div className="h-1.5 w-full bg-[#141416] rounded-full mt-1.5 overflow-hidden">
                        <div
                          className="h-full bg-[#22A477] rounded-full"
                          style={{ width: `${Math.min(100, Math.abs(item.contribution) * 6)}%` }}
                        />
                      </div>
                      <div className="text-[10px] text-[#A1A1AA] mt-1">{item.detail || item.description}</div>
                    </div>
                  ))}
                </div>

                {/* Underwriting Rationale Callout */}
                <div className="p-3 rounded-lg bg-[#332015] border border-[#75401F] text-[11px] text-[#F5F5F5] leading-snug">
                  <span className="text-[#FF7A1A] font-bold">Underwriting Rationale:</span> Elevated cash-flow volatility (+18) and revenue contraction (+15) are partially mitigated by steady operational frequency (-11).
                </div>
              </div>
            </div>
          </div>

          <div className="pt-2 text-[11px] text-[#71717A] border-t border-[#303035] text-center">
            Scores reflect population Shapley value approximations computed against 127 peer MSMEs.
          </div>
        </div>
      </div>

      {/* Alternative Business Signals Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#F5F5F5] flex items-center gap-2">
              ALTERNATIVE BUSINESS SIGNALS
            </h3>
            <p className="text-xs text-[#A1A1AA] mt-0.5">
              High-frequency alternative operational telemetry replacing static annual financial statements.
            </p>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#141416] text-[#A1A1AA] border border-[#303035]">
            Synthetic Commercial Telemetry
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-3.5">
          {/* Card 1: Revenue Stability */}
          <div className="bg-[#171719] border border-[#303035] hover:border-[#75401F] rounded-xl p-4 space-y-2 transition-all shadow-fin-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#A1A1AA] font-medium">Revenue Stability</span>
              <InfoTooltip text="Measures monthly recurring revenue predictability over a trailing 12-month period." />
            </div>
            <div className="text-2xl font-bold font-mono text-[#F5F5F5] tabular-nums">72%</div>
            <p className="text-[11px] text-[#71717A] leading-relaxed">
              Based on month-over-month sales run-rate variance.
            </p>
          </div>

          {/* Card 2: Cash Flow Stability */}
          <div className="bg-[#171719] border border-[#303035] hover:border-[#75401F] rounded-xl p-4 space-y-2 transition-all shadow-fin-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#A1A1AA] font-medium">Cash Flow Stability</span>
              <InfoTooltip text="Based on monthly inflow/outflow consistency." />
            </div>
            <div className="text-2xl font-bold font-mono text-[#E8A23A] tabular-nums">61%</div>
            <p className="text-[11px] text-[#71717A] leading-relaxed">
              Based on monthly inflow/outflow consistency.
            </p>
          </div>

          {/* Card 3: Invoice Consistency */}
          <div className="bg-[#171719] border border-[#303035] hover:border-[#75401F] rounded-xl p-4 space-y-2 transition-all shadow-fin-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#A1A1AA] font-medium">Invoice Consistency</span>
              <InfoTooltip text="Frequency, regular cadence, and timeliness of digital tax invoice generation." />
            </div>
            <div className="text-2xl font-bold font-mono text-[#F5F5F5] tabular-nums">78%</div>
            <p className="text-[11px] text-[#71717A] leading-relaxed">
              Evaluates cadence of digital GST invoice generation.
            </p>
          </div>

          {/* Card 4: Payment Behavior */}
          <div className="bg-[#171719] border border-[#303035] hover:border-[#75401F] rounded-xl p-4 space-y-2 transition-all shadow-fin-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#A1A1AA] font-medium">Payment Behavior</span>
              <InfoTooltip text="Counterparty days-sales-outstanding (DSO) and vendor clearance punctuality." />
            </div>
            <div className="text-2xl font-bold font-mono text-[#F5F5F5] tabular-nums">64%</div>
            <p className="text-[11px] text-[#71717A] leading-relaxed">
              Receivables collection timeliness and vendor settlement.
            </p>
          </div>

          {/* Card 5: Business Activity */}
          <div className="bg-[#171719] border border-[#303035] hover:border-[#1A533E] rounded-xl p-4 space-y-2 transition-all shadow-fin-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#A1A1AA] font-medium">Business Activity</span>
              <InfoTooltip text="Composite index of digital banking, counterparty density, and utility payments." />
            </div>
            <div className="text-2xl font-bold font-mono text-[#22A477] tabular-nums">81%</div>
            <p className="text-[11px] text-[#71717A] leading-relaxed">
              Commercial transaction cadence and logistics e-way bills.
            </p>
          </div>

          {/* Card 6: Customer Concentration */}
          <div className="bg-[#171719] border border-[#303035] hover:border-[#6B4A15] rounded-xl p-4 space-y-2 transition-all shadow-fin-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#A1A1AA] font-medium">Customer Concentration</span>
              <InfoTooltip text="Percentage of revenue derived from the top 3 commercial buyers." />
            </div>
            <div className="text-xl font-bold font-mono text-[#E8A23A]">Moderate</div>
            <p className="text-[11px] text-[#71717A] leading-relaxed">
              Top 3 customers account for 44% of revenue.
            </p>
          </div>

          {/* Card 7: Supplier Concentration */}
          <div className="bg-[#171719] border border-[#303035] hover:border-[#1A533E] rounded-xl p-4 space-y-2 transition-all shadow-fin-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#A1A1AA] font-medium">Supplier Concentration</span>
              <InfoTooltip text="Input dependency across primary component distributors." />
            </div>
            <div className="text-xl font-bold font-mono text-[#22A477]">Low</div>
            <p className="text-[11px] text-[#71717A] leading-relaxed">
              Diversified procurement across 18 approved vendors.
            </p>
          </div>

          {/* Card 8: Transaction Volatility */}
          <div className="bg-[#171719] border border-[#303035] hover:border-[#6B1F1F] rounded-xl p-4 space-y-2 transition-all shadow-fin-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#A1A1AA] font-medium">Transaction Volatility</span>
              <InfoTooltip text="Standard deviation of recurring operating inflows." />
            </div>
            <div className="text-xl font-bold font-mono text-[#EF5350]">High</div>
            <p className="text-[11px] text-[#71717A] leading-relaxed">
              Elevated standard deviation in month-end cash balances.
            </p>
          </div>
        </div>
      </div>

      {/* Active Financial Data Feeds & Statement Ingestion */}
      {dataSummary && dataSummary.total_transactions > 0 && (
        <div className="bg-[#171719] border border-[#303035] rounded-xl p-5 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#303035] pb-3">
            <div>
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-[#FF7A1A]" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#A1A1AA]">
                  Active Data Feeds & Statement Ingestion
                </h3>
              </div>
              <p className="text-xs text-[#71717A] mt-0.5">
                {dataSummary.total_transactions} verified transactions linked from connected providers and uploaded statements.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#10241A] text-[#22A477] border border-[#1B4D36] font-semibold">
                {dataSummary.imported_files_count} Files Ingested
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="text-[#71717A] text-[10px] uppercase font-mono border-b border-[#252528]">
                <tr>
                  <th className="py-1.5 font-semibold">Date</th>
                  <th className="py-1.5 font-semibold">Source</th>
                  <th className="py-1.5 font-semibold">Description</th>
                  <th className="py-1.5 font-semibold text-right">Amount</th>
                  <th className="py-1.5 font-semibold">Direction</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#252528] text-[11px]">
                {dataSummary.recent_transactions.slice(0, 5).map((tx: any, idx: number) => (
                  <tr key={idx} className="hover:bg-[#1E1E21]/50">
                    <td className="py-1.5 font-mono text-[#A1A1AA]">{tx.transaction_date}</td>
                    <td className="py-1.5">
                      <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded border ${
                        tx.source === 'FILE_IMPORT'
                          ? 'bg-[#332015] text-[#FF7A1A] border-[#75401F]'
                          : 'bg-[#1E1E21] text-[#A1A1AA] border-[#303035]'
                      }`}>
                        {tx.source || tx.provider}
                      </span>
                    </td>
                    <td className="py-1.5 text-[#D4D4D8] truncate max-w-xs">{tx.description}</td>
                    <td className="py-1.5 text-right font-mono font-semibold text-[#F5F5F5]">
                      ₹{Number(tx.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-1.5">
                      <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                        tx.direction === 'CREDIT' || tx.direction === 'INFLOW'
                          ? 'text-[#22A477] bg-[#10241A]'
                          : 'text-[#EF5350] bg-[#2A1414]'
                      }`}>
                        {tx.direction}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Loan Impact Simulator */}
      <div className="bg-[#171719] border border-[#303035] rounded-xl p-6 space-y-5 shadow-fin-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Calculator className="w-5 h-5 text-[#FF7A1A]" />
              <h3 className="text-base font-bold text-[#F5F5F5]">
                LOAN IMPACT SIMULATOR
              </h3>
            </div>
            <p className="text-xs text-[#A1A1AA] mt-0.5">
              Simulate incremental debt facility impact on DSCR, cash reserves, and risk score
            </p>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#141416] text-[#A1A1AA] border border-[#303035]">
            Underwriting What-If Tool
          </span>
        </div>

        <form onSubmit={handleLoanSubmit} className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-4 bg-[#141416] p-4 rounded-xl border border-[#303035]">
          <div>
            <label className="block text-xs font-semibold text-[#F5F5F5] mb-1">
              Loan Amount (₹)
            </label>
            <input
              type="number"
              step="50000"
              value={loanAmount}
              onChange={(e) => setLoanAmount(Number(e.target.value))}
              className="w-full px-3 py-2 bg-[#1E1E21] border border-[#303035] rounded-lg text-xs font-mono text-[#F5F5F5] focus:outline-none focus:border-[#75401F] focus:ring-1 focus:ring-[#FF7A1A]/30 transition-colors"
            />
            <span className="text-[10px] text-[#71717A] mt-1 block">Default: ₹10,00,000</span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#F5F5F5] mb-1">
              Interest Rate (%)
            </label>
            <input
              type="number"
              step="0.5"
              value={interestRate}
              onChange={(e) => setInterestRate(Number(e.target.value))}
              className="w-full px-3 py-2 bg-[#1E1E21] border border-[#303035] rounded-lg text-xs font-mono text-[#F5F5F5] focus:outline-none focus:border-[#75401F] focus:ring-1 focus:ring-[#FF7A1A]/30 transition-colors"
            />
            <span className="text-[10px] text-[#71717A] mt-1 block">Default: 12% p.a.</span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#F5F5F5] mb-1">
              Tenure (Months)
            </label>
            <input
              type="number"
              step="6"
              value={tenureMonths}
              onChange={(e) => setTenureMonths(Number(e.target.value))}
              className="w-full px-3 py-2 bg-[#1E1E21] border border-[#303035] rounded-lg text-xs font-mono text-[#F5F5F5] focus:outline-none focus:border-[#75401F] focus:ring-1 focus:ring-[#FF7A1A]/30 transition-colors"
            />
            <span className="text-[10px] text-[#71717A] mt-1 block">Default: 24 Months</span>
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={isCalculatingLoan}
              className="w-full py-2 px-4 bg-[#FF7A1A] hover:bg-[#FF8F3D] active:bg-[#C2410C] text-[#0D0D0F] rounded-lg text-xs font-bold shadow-fin-sm transition-colors cursor-pointer disabled:opacity-50"
            >
              {isCalculatingLoan ? 'Computing...' : 'Recalculate Impact'}
            </button>
          </div>
        </form>

        {/* Loan Impact Results */}
        {loanImpact && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-2">
            {/* Comparison Cards (7 cols) */}
            <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-3">
              {/* Estimated EMI */}
              <div className="p-3.5 rounded-xl bg-[#141416] border border-[#303035]">
                <div className="text-[11px] text-[#A1A1AA] font-medium">Estimated Monthly EMI</div>
                <div className="text-xl font-bold font-mono text-[#FF7A1A] mt-1 tabular-nums">
                  {loanImpact.formatted_emi}
                </div>
                <div className="text-[10px] text-[#71717A] mt-0.5">Principal + Interest</div>
              </div>

              {/* DSCR Before / After */}
              <div className="p-3.5 rounded-xl bg-[#141416] border border-[#303035]">
                <div className="text-[11px] text-[#A1A1AA] font-medium">DSCR Impact</div>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-base font-mono text-[#71717A]">{loanImpact.current.dscr}x</span>
                  <span className="text-[#71717A]">→</span>
                  <span className="text-xl font-bold font-mono text-[#E8A23A] tabular-nums">
                    {loanImpact.after_loan.dscr}x
                  </span>
                </div>
                <div className="text-[10px] text-[#EF5350] mt-0.5 font-mono">
                  {loanImpact.delta.dscr > 0 ? `+${loanImpact.delta.dscr}` : loanImpact.delta.dscr}x compression
                </div>
              </div>

              {/* Cash Reserve Before / After */}
              <div className="p-3.5 rounded-xl bg-[#141416] border border-[#303035]">
                <div className="text-[11px] text-[#A1A1AA] font-medium">Projected Cash Reserve</div>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-base font-mono text-[#71717A]">₹{loanImpact.current.cash_reserve}L</span>
                  <span className="text-[#71717A]">→</span>
                  <span className="text-xl font-bold font-mono text-[#E8A23A] tabular-nums">
                    ₹{loanImpact.after_loan.cash_reserve}L
                  </span>
                </div>
                <div className="text-[10px] text-[#EF5350] mt-0.5 font-mono">
                  {loanImpact.delta.cash_reserve}L buffer draw
                </div>
              </div>

              {/* Risk Score Before / After */}
              <div className="p-3.5 rounded-xl bg-[#141416] border border-[#303035] col-span-2 sm:col-span-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[11px] text-[#A1A1AA] font-medium">Risk Score Migration</div>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-base font-mono text-[#71717A]">{loanImpact.current.risk_score}</span>
                      <span className="text-[#71717A]">→</span>
                      <span className="text-2xl font-bold font-mono text-[#E8A23A] tabular-nums">
                        {loanImpact.after_loan.risk_score}
                      </span>
                      <span className="text-xs font-mono font-semibold text-[#EF5350] ml-2">
                        (+{loanImpact.delta.risk_score} pts)
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="px-2.5 py-1 rounded text-xs font-bold uppercase bg-[#332410] text-[#E8A23A] border border-[#6B4A15]">
                      {loanImpact.after_loan.risk_segment}
                    </span>
                  </div>
                </div>

                <div className="mt-2.5 pt-2.5 border-t border-[#303035] text-[11px] text-[#A1A1AA]">
                  <span className="text-[#FF7A1A] font-semibold">Underwriting Guidance:</span> {loanImpact.underwriting_note}
                </div>
              </div>
            </div>

            {/* Comparison Bar Chart (5 cols) */}
            <div className="lg:col-span-5 p-4 rounded-xl bg-[#141416] border border-[#303035] flex flex-col justify-between">
              <div className="text-xs font-semibold text-[#F5F5F5] mb-2">
                Current Condition vs Post-Loan Condition
              </div>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={loanComparisonData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#303035" vertical={false} />
                    <XAxis dataKey="metric" stroke="#71717A" fontSize={10} tickLine={false} />
                    <YAxis stroke="#71717A" fontSize={10} tickLine={false} />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: '#1E1E21',
                        borderColor: '#303035',
                        borderRadius: '8px',
                        fontSize: '11px',
                        color: '#F5F5F5'
                      }}
                      itemStyle={{ color: '#F5F5F5' }}
                    />
                    <Bar dataKey="Current" fill="#71717A" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="After Loan" fill="#FF7A1A" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-6 text-[11px] text-[#A1A1AA] pt-2 border-t border-[#303035]">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded bg-[#71717A]" /> Current
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded bg-[#FF7A1A]" /> After Loan
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
