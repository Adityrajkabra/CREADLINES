import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Sliders
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip
} from 'recharts';
import { MSME, CashFlowResponse } from '../types';
import { api } from '../services/api';

interface CashFlowViewProps {
  borrower: MSME;
  onNavigateToWhatIf: () => void;
}

export const CashFlowView: React.FC<CashFlowViewProps> = ({
  borrower,
  onNavigateToWhatIf
}) => {
  const [cashflowData, setCashflowData] = useState<CashFlowResponse | null>(null);

  useEffect(() => {
    let isMounted = true;
    api.getCashFlow(borrower.msme_id).then((res) => {
      if (isMounted) setCashflowData(res);
    });
    return () => { isMounted = false; };
  }, [borrower.msme_id]);

  if (!cashflowData) {
    return (
      <div className="py-20 text-center text-sm text-[#A1A1AA]">
        <div className="w-8 h-8 border-2 border-[#FF7A1A] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        Loading predictive cash flow models...
      </div>
    );
  }

  // Pre-process series data for Recharts: separate actuals and forecast lines
  const chartData = cashflowData.series.map((item) => {
    return {
      month: item.month,
      inflow: item.inflow,
      outflow: item.outflow,
      actualNet: item.type === 'actual' ? item.net : null,
      forecastNet: item.type === 'forecast' ? item.net : (item.month === 'Nov' ? item.net : null),
      confidenceHigh: item.type === 'forecast' ? item.confidence_high : null,
      confidenceLow: item.type === 'forecast' ? item.confidence_low : null
    };
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#F5F5F5]">
              Cash Flow Forecast & Liquidity Runway
            </h1>
            <span className="text-xs font-mono font-semibold px-2.5 py-0.5 rounded bg-[#332015] text-[#FF7A1A] border border-[#75401F]">
              6-Month Horizon
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#A1A1AA] mt-0.5">
            Predictive working capital trajectory for <strong className="text-[#F5F5F5]">{borrower.business_name}</strong> ({borrower.msme_id})
          </p>
        </div>

        <button
          onClick={onNavigateToWhatIf}
          className="self-start sm:self-auto px-4 py-2 rounded-lg bg-[#FF7A1A] hover:bg-[#FF8F3D] active:bg-[#C2410C] text-[#0D0D0F] text-xs font-bold flex items-center gap-2 shadow-fin-sm transition-all cursor-pointer"
        >
          <Sliders className="w-4 h-4" />
          <span>Stress Test in What-If Lab</span>
        </button>
      </div>

      {/* FORECAST INSIGHT Alert Banner */}
      <div className="p-4 rounded-xl bg-[#332015] border border-[#75401F] flex items-start gap-3.5 shadow-fin-sm">
        <div className="p-2 rounded-lg bg-[#452718] text-[#FF7A1A] shrink-0 mt-0.5">
          <AlertTriangle className="w-5 h-5 text-[#FF7A1A]" />
        </div>
        <div className="space-y-1">
          <div className="text-xs font-bold uppercase tracking-wider text-[#FF7A1A]">
            FORECAST INSIGHT
          </div>
          <p className="text-xs font-medium text-[#F5F5F5] leading-relaxed">
            "{cashflowData.forecast_insight}"
          </p>
          <div className="flex flex-wrap items-center gap-4 text-[11px] text-[#A1A1AA] pt-1">
            <span>Projected Deficit Month: <strong className="text-[#EF5350]">{cashflowData.min_reserve_month}</strong></span>
            <span>•</span>
            <span>Liquidity Runway: <strong className="text-[#F5F5F5]">{cashflowData.burn_runway}</strong></span>
            <span>•</span>
            <span>Algorithm: <span className="font-mono text-[#A1A1AA]">{cashflowData.methodology}</span></span>
          </div>
        </div>
      </div>

      {/* Cash Flow Forecast Chart with Confidence Band */}
      <div className="bg-[#171719] border border-[#303035] rounded-xl p-6 space-y-4 shadow-fin-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#F5F5F5] flex items-center gap-2">
              Historical Actuals vs. 6-Month Predictive Forecast
            </h3>
            <p className="text-xs text-[#A1A1AA] mt-0.5">
              Monthly Inflows, Outflows, and Net Cash Generation with 90% confidence boundaries
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs text-[#A1A1AA]">
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-3 h-0.5 bg-[#60A5FA]" /> Historical Actuals
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-3 h-0.5 bg-[#FF7A1A] border-dashed" /> Predictive Forecast
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-3 h-3 bg-[#332015] border border-[#75401F] rounded-xs" /> Confidence Interval
            </span>
          </div>
        </div>

        <div className="h-80 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 20, right: 20, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#303035" vertical={false} />
              <XAxis dataKey="month" stroke="#71717A" fontSize={11} tickLine={false} />
              <YAxis stroke="#71717A" fontSize={11} tickLine={false} unit="L" />
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
                formatter={(val: any, name: any) => {
                  if (val === null || val === undefined) return ['', ''];
                  const labelMap: Record<string, string> = {
                    inflow: 'Cash Inflow (₹L)',
                    outflow: 'Cash Outflow (₹L)',
                    actualNet: 'Actual Net Cash Flow (₹L)',
                    forecastNet: 'Forecasted Net (₹L)',
                    confidenceHigh: 'Upper Bound (90% CI)',
                    confidenceLow: 'Lower Bound (90% CI)'
                  };
                  return [`₹${val}L`, labelMap[name] || name];
                }}
              />

              {/* Bar representation of Inflow and Outflow */}
              <Bar dataKey="inflow" fill="#22A477" fillOpacity={0.25} name="Cash Inflow (₹L)" radius={[2, 2, 0, 0]} />
              <Bar dataKey="outflow" fill="#EF5350" fillOpacity={0.25} name="Cash Outflow (₹L)" radius={[2, 2, 0, 0]} />

              {/* Forecast Upper and Lower Confidence Envelope */}
              <Line
                type="monotone"
                dataKey="confidenceHigh"
                stroke="#75401F"
                strokeDasharray="2 2"
                strokeWidth={1}
                dot={false}
                name="confidenceHigh"
              />
              <Line
                type="monotone"
                dataKey="confidenceLow"
                stroke="#75401F"
                strokeDasharray="2 2"
                strokeWidth={1}
                dot={false}
                name="confidenceLow"
              />

              {/* Actual Net Cash Flow line */}
              <Line
                type="monotone"
                dataKey="actualNet"
                stroke="#60A5FA"
                strokeWidth={3}
                dot={{ r: 4, fill: '#60A5FA' }}
                name="actualNet"
              />

              {/* Forecast Net Cash Flow line */}
              <Line
                type="monotone"
                dataKey="forecastNet"
                stroke="#FF7A1A"
                strokeWidth={3}
                strokeDasharray="4 4"
                dot={{ r: 4, fill: '#FF7A1A' }}
                name="forecastNet"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className="p-3 bg-[#141416] rounded-lg border border-[#303035] flex flex-col sm:flex-row items-center justify-between text-xs text-[#A1A1AA] gap-2">
          <span>Values expressed in Lakhs INR (₹L). Confidence bounds model seasonal variations and receivables turnaround.</span>
          <span className="font-mono text-[#F5F5F5] font-semibold">Net Flow Trough: Dec (-₹0.4L)</span>
        </div>
      </div>

      {/* Forecast Inflow, Outflow, Net Table */}
      <div className="bg-[#171719] border border-[#303035] rounded-xl overflow-hidden space-y-3 p-5 shadow-fin-sm">
        <div>
          <h3 className="text-sm font-bold text-[#F5F5F5]">
            6-Month Cash Flow Breakdown Table
          </h3>
          <p className="text-xs text-[#A1A1AA] mt-0.5">
            Deterministic table values highlighting seasonal pressure points
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#F5F5F5]">
            <thead className="bg-[#141416] text-[11px] uppercase tracking-wider text-[#A1A1AA] font-semibold border-b border-[#303035]">
              <tr>
                <th className="px-4 py-3">Month</th>
                <th className="px-4 py-3">Inflow</th>
                <th className="px-4 py-3">Outflow</th>
                <th className="px-4 py-3">Net Cash Flow</th>
                <th className="px-4 py-3">Liquidity Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#303035]">
              {cashflowData.table_data.map((row, idx) => {
                const isDeficit = row.net.startsWith('-');
                return (
                  <tr
                    key={idx}
                    className={`hover:bg-[#1E1E21] transition-colors ${
                      row.month === 'Dec' ? 'bg-[#331515]/40' : ''
                    }`}
                  >
                    <td className="px-4 py-3 font-semibold text-[#F5F5F5]">
                      {row.month}
                      {row.month === 'Dec' && (
                        <span className="ml-2 text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-[#331515] text-[#EF5350] border border-[#6B1F1F]">
                          Trough Month
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono font-medium text-[#22A477] tabular-nums">
                      {row.inflow}
                    </td>
                    <td className="px-4 py-3 font-mono font-medium text-[#A1A1AA] tabular-nums">
                      {row.outflow}
                    </td>
                    <td className="px-4 py-3 font-mono font-bold tabular-nums">
                      <span className={isDeficit ? 'text-[#EF5350]' : 'text-[#22A477]'}>
                        {row.net}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${
                          row.status === 'Deficit Warning'
                            ? 'bg-[#331515] text-[#EF5350] border-[#6B1F1F]'
                            : row.status === 'Recovering'
                            ? 'bg-[#332015] text-[#FF7A1A] border-[#75401F]'
                            : 'bg-[#132E25] text-[#22A477] border-[#1A533E]'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            row.status === 'Deficit Warning'
                              ? 'bg-[#EF5350] animate-pulse'
                              : row.status === 'Recovering'
                              ? 'bg-[#FF7A1A]'
                              : 'bg-[#22A477]'
                          }`}
                        />
                        {row.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
