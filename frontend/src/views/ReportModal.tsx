import React, { useState, useEffect } from 'react';
import {
  X,
  Printer,
  Download,
  ShieldCheck,
  Building2,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Copy,
  Check
} from 'lucide-react';
import { MSME, CreditIntelligenceReport } from '../types';
import { api } from '../services/api';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  borrower: MSME;
}

export const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  onClose,
  borrower
}) => {
  const [report, setReport] = useState<CreditIntelligenceReport | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      api.getReport(borrower.msme_id).then(res => setReport(res));
    }
  }, [isOpen, borrower.msme_id]);

  if (!isOpen) return null;

  const handleCopy = () => {
    if (!report) return;
    const text = `CREDILENS CREDIT INTELLIGENCE REPORT
Business: ${report.business_name} (${report.msme_id})
Sector: ${report.sector}
Risk Score: ${report.risk_score}
Risk Segment: ${report.risk_segment}
Probability of Default: ${report.probability_of_default}
DSCR: ${report.dscr}
Decision Support: ${report.decision_support}
Decision Guidance: ${report.decision_guidance}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div 
        className="w-full max-w-3xl bg-[#171719] border border-[#303035] rounded-2xl shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Action Bar */}
        <div className="p-4 bg-[#141416] border-b border-[#303035] flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-[#F5F5F5]">
            <FileText className="w-4 h-4 text-[#FF7A1A]" />
            <span className="font-bold">CrediLens Underwriting Dossier</span>
            <span className="font-mono text-[#71717A]">•</span>
            <span className="font-mono text-[#A1A1AA]">{report?.report_id || 'Generating...'}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="px-3 py-1.5 rounded-lg bg-[#1E1E21] hover:bg-[#262629] border border-[#303035] text-[#F5F5F5] text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-[#22A477]" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy Text'}</span>
            </button>
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-lg bg-[#FF7A1A] hover:bg-[#FF8F3D] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Dossier</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#A1A1AA] hover:text-[#F5F5F5] hover:bg-[#1E1E21] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div className="p-8 space-y-6 text-[#F5F5F5] bg-[#171719]">
          {/* Header Title */}
          <div className="border-b border-[#303035] pb-5 flex flex-col sm:flex-row justify-between items-start gap-4">
            <div>
              <div className="flex items-center gap-2 text-[#FF7A1A] font-bold text-lg tracking-tight">
                <ShieldCheck className="w-6 h-6" />
                <span>CREDILENS CREDIT INTELLIGENCE REPORT</span>
              </div>
              <div className="text-xs text-[#A1A1AA] mt-1 font-medium">
                Commercial Lending Underwriting & Risk Evaluation Summary
              </div>
            </div>
            <div className="text-right text-xs text-[#A1A1AA]">
              <div>Date: <strong className="text-[#F5F5F5]">September 30, 2026</strong></div>
              <div>Report ID: <span className="font-mono text-[#FF7A1A] font-semibold">REP-{borrower.msme_id}-2026</span></div>
            </div>
          </div>

          {/* Business & Core Metrics Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-[#141416] border border-[#303035]">
            <div>
              <div className="text-[11px] text-[#A1A1AA] uppercase font-semibold">Business</div>
              <div className="text-base font-bold text-[#F5F5F5] mt-0.5">{borrower.business_name}</div>
              <div className="text-[11px] text-[#71717A] font-mono">{borrower.msme_id}</div>
            </div>

            <div>
              <div className="text-[11px] text-[#A1A1AA] uppercase font-semibold">Risk Score</div>
              <div className="text-xl font-bold font-mono text-[#E8A23A] mt-0.5 tabular-nums">{borrower.risk_score} / 100</div>
              <div className="text-[11px] text-[#71717A]">Composite Model Score</div>
            </div>

            <div>
              <div className="text-[11px] text-[#A1A1AA] uppercase font-semibold">Risk Segment</div>
              <div className="text-sm font-bold uppercase text-[#E8A23A] mt-1">
                {borrower.msme_id === 'MSME-1042' ? 'Moderate-High' : borrower.risk_segment}
              </div>
              <div className="text-[11px] text-[#71717A]">Assigned Tier</div>
            </div>

            <div>
              <div className="text-[11px] text-[#A1A1AA] uppercase font-semibold">Prob. of Default</div>
              <div className="text-xl font-bold font-mono text-[#EF5350] mt-0.5 tabular-nums">{borrower.probability_of_default}%</div>
              <div className="text-[11px] text-[#71717A]">12M Forward Horizon</div>
            </div>
          </div>

          {/* Drivers & Positive Signals Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Primary Risk Drivers */}
            <div className="p-4 rounded-xl bg-[#EF5350]/10 border border-[#EF5350]/30 space-y-2.5">
              <div className="text-xs font-bold uppercase text-[#EF5350] tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" />
                <span>Primary Risk Drivers</span>
              </div>
              <ul className="text-xs text-[#F5F5F5] space-y-1.5">
                {report?.primary_risk_drivers.map((driver, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-[#EF5350] font-bold">•</span>
                    <span>{driver}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Positive Signals */}
            <div className="p-4 rounded-xl bg-[#22A477]/10 border border-[#22A477]/30 space-y-2.5">
              <div className="text-xs font-bold uppercase text-[#22A477] tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>Positive Signals</span>
              </div>
              <ul className="text-xs text-[#F5F5F5] space-y-1.5">
                {report?.positive_signals.map((sig, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-[#22A477] font-bold">•</span>
                    <span>{sig}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Cash Flow Outlook & Stress Test */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-[#141416] border border-[#303035] space-y-1">
              <div className="text-[11px] text-[#A1A1AA] uppercase font-semibold">Cash Flow Outlook</div>
              <div className="text-sm font-bold text-[#E8A23A]">
                {borrower.cash_flow_health}
              </div>
              <p className="text-xs text-[#A1A1AA] mt-1">
                {report?.cash_flow_insight}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#141416] border border-[#303035] space-y-1">
              <div className="text-[11px] text-[#A1A1AA] uppercase font-semibold">Stress Test Summary</div>
              <div className="text-sm font-bold text-[#F5F5F5]">
                {report?.stress_test_summary}
              </div>
              <p className="text-xs text-[#A1A1AA] mt-1">
                Evaluated under parametric macroeconomic shock testing in What-If Lab.
              </p>
            </div>
          </div>

          {/* Decision Support Recommendation (Human-In-The-Loop) */}
          <div className="p-5 rounded-xl bg-[#332015] border border-[#75401F] space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="text-xs font-bold uppercase tracking-wider text-[#FF7A1A]">
                Decision Support Underwriting Recommendation
              </div>
              <span className="px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider bg-[#1E1E21] text-[#FF7A1A] border border-[#75401F] shadow-2xs self-start sm:self-auto">
                {report?.decision_support}
              </span>
            </div>
            <p className="text-xs text-[#F5F5F5] leading-relaxed font-medium">
              {report?.decision_guidance}
            </p>
            <div className="text-[11px] text-[#A1A1AA] pt-1">
              Human credit committee review mandatory. This algorithmic assessment does not automate credit disbursement.
            </div>
          </div>

          {/* Legal Synthetic Notice */}
          <div className="border-t border-[#303035] pt-4 text-[11px] text-[#71717A] leading-relaxed text-center">
            {report?.disclaimer}
          </div>
        </div>
      </div>
    </div>
  );
};
