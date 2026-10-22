import React from 'react';
import {
  ShieldCheck,
  Cpu,
  Sliders,
  ArrowRight,
  Database,
  Building2,
  CheckCircle2,
  Zap,
} from 'lucide-react';
import { MSME } from '../types';

interface LandingViewProps {
  onAnalyze: (msmeId?: string) => void;
  onViewPortfolio: () => void;
  featuredMSME: MSME;
}

export const LandingView: React.FC<LandingViewProps> = ({
  onAnalyze,
  onViewPortfolio,
  featuredMSME
}) => {
  return (
    <div className="max-w-6xl mx-auto py-10 px-4 space-y-12">
      {/* Hero Section */}
      <div className="text-center space-y-5 max-w-3xl mx-auto pt-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#332015] border border-[#75401F] text-[#FF7A1A] text-xs font-semibold uppercase tracking-wider">
          <ShieldCheck className="w-4 h-4 text-[#FF7A1A]" />
          <span>Next-Generation MSME Underwriting Intelligence</span>
        </div>

        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-[#F5F5F5] leading-tight">
          CREDILENS
          <span className="block text-2xl sm:text-3xl font-bold text-[#A1A1AA] mt-2">
            MSME CREDIT INTELLIGENCE
          </span>
        </h1>

        <p className="text-base sm:text-lg text-[#F5F5F5] font-medium leading-relaxed">
          "Understand business risk beyond traditional credit scores."
        </p>

        <p className="text-xs sm:text-sm text-[#A1A1AA] max-w-2xl mx-auto leading-relaxed">
          CrediLens evaluates Micro, Small, and Medium Enterprises through high-frequency alternative business signals, explainable machine learning, forward-looking cash flow projections, and macroeconomic stress simulations.
        </p>

        {/* Action CTAs */}
        <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
          <button
            onClick={() => onAnalyze(featuredMSME.msme_id)}
            className="px-6 py-3 rounded-lg bg-[#FF7A1A] hover:bg-[#FF8F3D] active:bg-[#C2410C] text-[#0D0D0F] font-bold text-sm shadow-fin-sm transition-all flex items-center gap-2 group cursor-pointer"
          >
            <span>ANALYZE A BUSINESS</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </button>

          <button
            onClick={onViewPortfolio}
            className="px-6 py-3 rounded-lg bg-[#171719] hover:bg-[#1E1E21] text-[#F5F5F5] border border-[#303035] hover:border-[#75401F] font-semibold text-sm shadow-fin-sm transition-all flex items-center gap-2 cursor-pointer"
          >
            <Building2 className="w-4 h-4 text-[#FF7A1A]" />
            <span>VIEW PORTFOLIO (127)</span>
          </button>
        </div>

        {/* Demo spotlight card */}
        <div className="pt-2">
          <div 
            onClick={() => onAnalyze(featuredMSME.msme_id)}
            className="inline-flex items-center gap-3 px-4 py-2.5 rounded-xl bg-[#171719] border border-[#303035] hover:border-[#75401F] hover:bg-[#1E1E21] hover:shadow-orange-glow cursor-pointer text-xs text-[#A1A1AA] transition-all"
          >
            <span className="w-2 h-2 rounded-full bg-[#E8A23A] animate-pulse" />
            <span>Featured Case Study:</span>
            <strong className="text-[#F5F5F5]">{featuredMSME.business_name} ({featuredMSME.msme_id})</strong>
            <span className="text-[#E8A23A] font-mono font-bold">Risk Score: {featuredMSME.risk_score}</span>
            <ArrowRight className="w-3.5 h-3.5 text-[#FF7A1A]" />
          </div>
        </div>
      </div>

      {/* Three Core Feature Blocks */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
        {/* Block 1 */}
        <div className="bg-[#171719] border border-[#303035] hover:border-[#75401F] rounded-xl p-6 space-y-3 relative overflow-hidden transition-all shadow-fin-sm">
          <div className="w-10 h-10 rounded-lg bg-[#332015] border border-[#75401F] flex items-center justify-center text-[#FF7A1A]">
            <Zap className="w-5 h-5 text-[#FF7A1A]" />
          </div>
          <h3 className="font-bold text-base text-[#F5F5F5]">Alternative Data Signals</h3>
          <p className="text-xs text-[#A1A1AA] leading-relaxed">
            Replaces outdated static bureau scores with real-time operational telemetry: cash flow volatility, invoice cadence, payment punctuality, and counterparty concentration.
          </p>
          <div className="pt-2 flex flex-wrap gap-1.5">
            <span className="text-[10px] px-2 py-0.5 rounded bg-[#1E1E21] text-[#A1A1AA] border border-[#303035]">Cash Flow Stability</span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-[#1E1E21] text-[#A1A1AA] border border-[#303035]">Invoice Frequency</span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-[#1E1E21] text-[#A1A1AA] border border-[#303035]">Buyer Concentration</span>
          </div>
        </div>

        {/* Block 2 */}
        <div className="bg-[#171719] border border-[#303035] hover:border-[#1A533E] rounded-xl p-6 space-y-3 relative overflow-hidden transition-all shadow-fin-sm">
          <div className="w-10 h-10 rounded-lg bg-[#132E25] border border-[#1A533E] flex items-center justify-center text-[#22A477]">
            <Cpu className="w-5 h-5 text-[#22A477]" />
          </div>
          <h3 className="font-bold text-base text-[#F5F5F5]">Explainable AI & Risk Attribution</h3>
          <p className="text-xs text-[#A1A1AA] leading-relaxed">
            Full transparency into why an MSME received its risk score. Transparent SHAP-style positive and negative feature attribution empowers underwriters with auditable rationale.
          </p>
          <div className="pt-2 flex flex-wrap gap-1.5">
            <span className="text-[10px] px-2 py-0.5 rounded bg-[#1E1E21] text-[#A1A1AA] border border-[#303035]">Positive Contributors</span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-[#1E1E21] text-[#A1A1AA] border border-[#303035]">Risk Dampeners</span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-[#1E1E21] text-[#A1A1AA] border border-[#303035]">Audit-Ready</span>
          </div>
        </div>

        {/* Block 3 */}
        <div className="bg-[#171719] border border-[#303035] hover:border-[#6B4A15] rounded-xl p-6 space-y-3 relative overflow-hidden transition-all shadow-fin-sm">
          <div className="w-10 h-10 rounded-lg bg-[#332410] border border-[#6B4A15] flex items-center justify-center text-[#E8A23A]">
            <Sliders className="w-5 h-5 text-[#E8A23A]" />
          </div>
          <h3 className="font-bold text-base text-[#F5F5F5]">Economic Stress Testing</h3>
          <p className="text-xs text-[#A1A1AA] leading-relaxed">
            Dynamic macroeconomic shock simulator. Test borrower resilience against inflation shocks, customer payment delays, revenue drops, and incremental loan debt-service burdens.
          </p>
          <div className="pt-2 flex flex-wrap gap-1.5">
            <span className="text-[10px] px-2 py-0.5 rounded bg-[#1E1E21] text-[#A1A1AA] border border-[#303035]">DSCR Shock</span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-[#1E1E21] text-[#A1A1AA] border border-[#303035]">Receivables Delay</span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-[#1E1E21] text-[#A1A1AA] border border-[#303035]">Loan Impact</span>
          </div>
        </div>
      </div>

      {/* Architecture & Trust Banner */}
      <div className="p-4 rounded-xl bg-[#171719] border border-[#303035] text-xs text-[#A1A1AA] flex flex-col sm:flex-row items-center justify-between gap-4 shadow-fin-sm">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-[#FF7A1A] shrink-0" />
          <span>Synthetic Enterprise Benchmark: <strong className="text-[#F5F5F5]">127 Seeded MSMEs</strong> across 10 commercial sectors</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[#22A477] font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Model Version: GBC v1.0
          </span>
          <span className="text-[#303035]">|</span>
          <span className="text-[#FF7A1A] font-medium">Human-In-The-Loop Decision Support</span>
        </div>
      </div>
    </div>
  );
};
