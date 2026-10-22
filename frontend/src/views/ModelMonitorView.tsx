import React, { useState, useEffect } from 'react';
import {
  Cpu,
  Layers,
  Database,
  Info,
  GitBranch,
  BarChart3
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Cell
} from 'recharts';
import { ModelMetricsResponse } from '../types';
import { api } from '../services/api';
import { InfoTooltip } from '../components/InfoTooltip';

export const ModelMonitorView: React.FC = () => {
  const [modelMetrics, setModelMetrics] = useState<ModelMetricsResponse | null>(null);

  useEffect(() => {
    let isMounted = true;
    api.getModelMetrics().then((res) => {
      if (isMounted) setModelMetrics(res);
    });
    return () => { isMounted = false; };
  }, []);

  if (!modelMetrics) {
    return (
      <div className="py-20 text-center text-sm text-[#A1A1AA]">
        <div className="w-8 h-8 border-2 border-[#FF7A1A] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        Loading ML telemetry and feature weights...
      </div>
    );
  }

  const { metrics, feature_importances } = modelMetrics;

  const metricCards = [
    {
      label: 'ROC-AUC',
      value: metrics.roc_auc.toString(),
      sub: 'Area Under ROC Curve',
      color: 'text-[#FF7A1A]',
      accentBg: 'bg-[#332015] text-[#FF7A1A] border border-[#75401F]',
      tooltip: 'Discriminative capacity between defaulting and solvent MSMEs across evaluation splits.'
    },
    {
      label: 'Precision',
      value: metrics.precision.toString(),
      sub: 'True Default / Predicted Default',
      color: 'text-[#22A477]',
      accentBg: 'bg-[#132E25] text-[#22A477] border border-[#1A533E]',
      tooltip: 'Proportion of flagged high-risk entities that exhibited actual cash strain.'
    },
    {
      label: 'Recall',
      value: metrics.recall.toString(),
      sub: 'Sensitivity Rate',
      color: 'text-[#FF8F3D]',
      accentBg: 'bg-[#332015] text-[#FF8F3D] border border-[#75401F]',
      tooltip: 'Percentage of vulnerable entities accurately detected by the risk engine.'
    },
    {
      label: 'F1 Score',
      value: metrics.f1.toString(),
      sub: 'Harmonic Mean',
      color: 'text-[#E8A23A]',
      accentBg: 'bg-[#332410] text-[#E8A23A] border border-[#6B4A15]',
      tooltip: 'Balanced metric trading off precision and recall under non-uniform default distributions.'
    }
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#F5F5F5] flex items-center gap-2">
              <Cpu className="w-5 h-5 text-[#FF7A1A]" />
              Machine Learning Model Observability
            </h1>
            <span className="text-xs font-mono font-semibold px-2.5 py-0.5 rounded bg-[#132E25] text-[#22A477] border border-[#1A533E]">
              {metrics.status}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#A1A1AA] mt-0.5">
            Operational telemetry for <strong className="text-[#F5F5F5]">{modelMetrics.model_version}</strong> ({modelMetrics.model_type})
          </p>
        </div>

        <div className="text-xs text-[#A1A1AA] font-mono flex items-center gap-2">
          <span>Pipeline Status: Active</span>
        </div>
      </div>

      {/* Model Spec Overview Banner */}
      <div className="bg-[#171719] border border-[#303035] rounded-xl p-5 grid grid-cols-2 sm:grid-cols-4 gap-4 shadow-fin-sm">
        <div>
          <div className="text-[11px] text-[#71717A] uppercase font-semibold">Model Architecture</div>
          <div className="text-sm font-bold text-[#F5F5F5] mt-1 flex items-center gap-1.5">
            <GitBranch className="w-4 h-4 text-[#FF7A1A]" />
            {modelMetrics.model_type}
          </div>
          <div className="text-[10px] text-[#A1A1AA] font-mono mt-0.5">v1.0 Ensemble</div>
        </div>

        <div>
          <div className="text-[11px] text-[#71717A] uppercase font-semibold">Engine Version</div>
          <div className="text-sm font-bold text-[#F5F5F5] mt-1">{modelMetrics.model_version}</div>
          <div className="text-[10px] text-[#A1A1AA] font-mono mt-0.5">Release 2026.Q3</div>
        </div>

        <div>
          <div className="text-[11px] text-[#71717A] uppercase font-semibold">Feature Dimension</div>
          <div className="text-sm font-bold text-[#F5F5F5] mt-1 flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-[#22A477]" />
            {modelMetrics.features_count} Alternative Signals
          </div>
          <div className="text-[10px] text-[#A1A1AA] font-mono mt-0.5">Non-Bureau Signals</div>
        </div>

        <div>
          <div className="text-[11px] text-[#71717A] uppercase font-semibold">Training Corpus</div>
          <div className="text-sm font-bold text-[#F5F5F5] mt-1 flex items-center gap-1.5">
            <Database className="w-4 h-4 text-[#FF7A1A]" />
            {modelMetrics.training_records}
          </div>
          <div className="text-[10px] text-[#A1A1AA] font-mono mt-0.5">Synthetic Cross-Val</div>
        </div>
      </div>

      {/* 4 Performance Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {metricCards.map((m, idx) => (
          <div key={idx} className="bg-[#171719] border border-[#303035] rounded-xl p-4 space-y-2 flex flex-col justify-between shadow-fin-sm">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#A1A1AA] font-medium">{m.label}</span>
              <InfoTooltip text={m.tooltip} title={m.label} />
            </div>
            <div className={`text-3xl font-extrabold font-mono tracking-tight tabular-nums ${m.color}`}>
              {m.value}
            </div>
            <div className="text-[11px] text-[#71717A] font-mono">
              {m.sub}
            </div>
          </div>
        ))}
      </div>

      {/* Mandatory Disclaimer */}
      <div className="p-3 bg-[#332015] rounded-lg border border-[#75401F] text-[11px] text-[#A1A1AA] flex items-center gap-2 shadow-fin-sm">
        <Info className="w-4 h-4 text-[#FF7A1A] shrink-0" />
        <span>
          <strong className="text-[#F5F5F5]">IMPORTANT:</strong> {modelMetrics.disclaimer} Generated using deterministic Scikit-learn gradient boosting fit.
        </span>
      </div>

      {/* Feature Importance Section */}
      <div className="bg-[#171719] border border-[#303035] rounded-xl p-6 space-y-5 shadow-fin-sm">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#F5F5F5] flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-[#FF7A1A]" />
              Feature Importance Distribution
            </h3>
            <p className="text-xs text-[#A1A1AA] mt-0.5">
              Normalized Gini impurity reduction across top alternative business variables
            </p>
          </div>
          <InfoTooltip
            title="Feature Importance"
            text="Relative contribution of each operational variable to the gradient boosted decision trees."
          />
        </div>

        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              layout="vertical"
              data={feature_importances}
              margin={{ top: 5, right: 30, left: 90, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#303035" horizontal={false} />
              <XAxis type="number" stroke="#71717A" fontSize={11} domain={[0, 0.35]} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} />
              <YAxis
                dataKey="feature"
                type="category"
                stroke="#A1A1AA"
                fontSize={11}
                tickLine={false}
                width={140}
              />
              <RechartsTooltip
                contentStyle={{
                  backgroundColor: '#1E1E21',
                  borderColor: '#303035',
                  borderRadius: '8px',
                  fontSize: '12px',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
                  color: '#F5F5F5'
                }}
                itemStyle={{ color: '#F5F5F5' }}
                formatter={(val: any, _name: any, item: any) => [
                  `${(val * 100).toFixed(1)}% (Category: ${item.payload.category})`,
                  'Model Weight'
                ]}
              />
              <Bar dataKey="importance" fill="#FF7A1A" radius={[0, 4, 4, 0]}>
                {feature_importances.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={index === 0 ? '#FF7A1A' : index === 1 ? '#FF8F3D' : '#FDBA74'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-[#303035] text-xs text-[#F5F5F5]">
          <div className="p-3 rounded-lg bg-[#141416] border border-[#303035]">
            <span className="text-[#FF7A1A] font-bold block text-[11px]">Dominant Feature:</span>
            <span className="text-[#A1A1AA]">Cash Flow Volatility accounts for 26% of overall model split decisions.</span>
          </div>
          <div className="p-3 rounded-lg bg-[#141416] border border-[#303035]">
            <span className="text-[#22A477] font-bold block text-[11px]">Solvency Ratio:</span>
            <span className="text-[#A1A1AA]">Debt-to-Cash & DSCR account for 31% cumulative predictive weight.</span>
          </div>
          <div className="p-3 rounded-lg bg-[#141416] border border-[#303035]">
            <span className="text-[#E8A23A] font-bold block text-[11px]">Transaction Signals:</span>
            <span className="text-[#A1A1AA]">Invoice cadence and transaction consistency account for 22% weight.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
