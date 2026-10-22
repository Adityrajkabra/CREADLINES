import React, { useState, useEffect } from 'react';
import {
  Scale,
  Info,
} from 'lucide-react';
import { FairnessResponse } from '../types';
import { api } from '../services/api';
import { InfoTooltip } from '../components/InfoTooltip';

export const FairnessMonitorView: React.FC = () => {
  const [fairnessData, setFairnessData] = useState<FairnessResponse | null>(null);

  useEffect(() => {
    let isMounted = true;
    api.getFairness().then((res) => {
      if (isMounted) setFairnessData(res);
    });
    return () => { isMounted = false; };
  }, []);

  if (!fairnessData) {
    return (
      <div className="py-20 text-center text-sm text-[#A1A1AA]">
        <div className="w-8 h-8 border-2 border-[#FF7A1A] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        Loading synthetic fairness audit telemetry...
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Title & Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#F5F5F5] flex items-center gap-2">
              <Scale className="w-5 h-5 text-[#FF7A1A]" />
              Fairness & Bias Governance Monitor
            </h1>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded uppercase tracking-wider bg-[#332015] text-[#FF7A1A] border border-[#75401F]">
              Fairness Status: MONITOR
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#A1A1AA] mt-0.5">
            Algorithmic disparate impact audits evaluated across synthetic demographic and firm-maturity evaluation partitions.
          </p>
        </div>

        <div className="text-xs text-[#A1A1AA] font-mono flex items-center gap-2">
          <span>Parity Benchmark: 80% Four-Fifths Standard</span>
        </div>
      </div>

      {/* Mandatory Regulatory & Ethics Notice */}
      <div className="p-4 rounded-xl bg-[#332015] border border-[#75401F] space-y-2 shadow-fin-sm">
        <div className="flex items-center gap-2 text-xs font-bold text-[#FF7A1A] uppercase tracking-wide">
          <Info className="w-4 h-4 text-[#FF7A1A]" />
          <span>Fairness Audit Methodology Notice</span>
        </div>
        <p className="text-xs text-[#F5F5F5] leading-relaxed font-medium">
          "{fairnessData.explanation}"
        </p>
        <p className="text-[11px] text-[#A1A1AA] italic">
          "{fairnessData.disclaimer}"
        </p>
      </div>

      {/* Audit Cohort Cards */}
      <div className="space-y-6">
        {fairnessData.cohorts.map((cohort, cIdx) => (
          <div key={cIdx} className="bg-[#171719] border border-[#303035] rounded-xl p-6 space-y-4 shadow-fin-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#303035] pb-3">
              <div>
                <h3 className="text-sm font-bold text-[#F5F5F5] flex items-center gap-2">
                  <span>{cohort.partition_type}</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#332015] text-[#FF7A1A] border border-[#75401F]">
                    Disparate Impact Ratio: {cohort.disparate_impact_ratio}
                  </span>
                </h3>
                <p className="text-xs text-[#A1A1AA] mt-0.5">{cohort.assessment}</p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold px-2.5 py-1 rounded bg-[#132E25] text-[#22A477] border border-[#1A533E]">
                  {cohort.status}
                </span>
              </div>
            </div>

            {/* Comparative Columns between Group A and Group B */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {cohort.groups.map((group, gIdx) => (
                <div key={gIdx} className="p-4 rounded-xl bg-[#141416] border border-[#303035] space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-[#F5F5F5]">{group.group_name}</div>
                      <div className="text-[10px] text-[#A1A1AA]">{group.group_label}</div>
                    </div>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#1E1E21] text-[#A1A1AA] border border-[#303035]">
                      N = {group.sample_size}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    {/* Recommendation Rate */}
                    <div className="p-2.5 rounded-lg bg-[#1E1E21] border border-[#303035] shadow-xs">
                      <div className="flex items-center justify-between text-[11px] text-[#A1A1AA]">
                        <span>Recommendation Rate</span>
                        <InfoTooltip text="Proportion of synthetic applicants recommended for standard or expedited underwriting." />
                      </div>
                      <div className="text-lg font-bold font-mono text-[#22A477] tabular-nums mt-1">
                        {group.recommendation_rate}%
                      </div>
                    </div>

                    {/* Average Predicted Risk */}
                    <div className="p-2.5 rounded-lg bg-[#1E1E21] border border-[#303035] shadow-xs">
                      <div className="flex items-center justify-between text-[11px] text-[#A1A1AA]">
                        <span>Avg. Predicted Risk</span>
                        <InfoTooltip text="Mean model score assigned across this synthetic audit partition." />
                      </div>
                      <div className="text-lg font-bold font-mono text-[#F5F5F5] tabular-nums mt-1">
                        {group.average_risk_score}
                      </div>
                    </div>

                    {/* False Positive Rate */}
                    <div className="p-2.5 rounded-lg bg-[#1E1E21] border border-[#303035] shadow-xs">
                      <div className="flex items-center justify-between text-[11px] text-[#A1A1AA]">
                        <span>False Positive Rate (FPR)</span>
                        <InfoTooltip text="Rate at which solvent enterprises are classified as high risk." />
                      </div>
                      <div className="text-lg font-bold font-mono text-[#E8A23A] tabular-nums mt-1">
                        {group.false_positive_rate}%
                      </div>
                    </div>

                    {/* False Negative Rate */}
                    <div className="p-2.5 rounded-lg bg-[#1E1E21] border border-[#303035] shadow-xs">
                      <div className="flex items-center justify-between text-[11px] text-[#A1A1AA]">
                        <span>False Negative Rate (FNR)</span>
                        <InfoTooltip text="Rate at which vulnerable enterprises are classified as low risk." />
                      </div>
                      <div className="text-lg font-bold font-mono text-[#EF5350] tabular-nums mt-1">
                        {group.false_negative_rate}%
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Compliance / Explainability Callout */}
      <div className="bg-[#171719] border border-[#303035] rounded-xl p-5 space-y-2 shadow-fin-sm">
        <h4 className="text-xs font-bold uppercase tracking-wider text-[#F5F5F5]">
          Governance & Continuous Auditing Standards
        </h4>
        <p className="text-xs text-[#A1A1AA] leading-relaxed">
          In production fintech environments, fair lending regulations (such as ECOA, RBI Fair Lending Codes, and Basel Supervisory Standards) mandate that non-financial variables (such as geography or firm age) do not artificially constrain credit flow. CrediLens continuously monitors parity ratios and triggers alert flags when statistical parity drops below 80%.
        </p>
      </div>
    </div>
  );
};
