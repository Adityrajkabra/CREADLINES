import React, { useState } from 'react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';
import { MSME } from '../types';
import { ArrowRight } from 'lucide-react';
import { InfoTooltip } from '../components/InfoTooltip';

interface SegmentationViewProps {
  msmes: MSME[];
  onSelectBorrower: (msme: MSME) => void;
}

export const SegmentationView: React.FC<SegmentationViewProps> = ({
  msmes,
  onSelectBorrower
}) => {
  const [selectedBubble, setSelectedBubble] = useState<MSME | null>(
    msmes.find(m => m.msme_id === 'MSME-1042') || msmes[0]
  );

  const lowCount = msmes.filter(m => m.risk_segment === 'LOW').length;
  const modCount = msmes.filter(m => m.risk_segment === 'MODERATE').length;
  const highCount = msmes.filter(m => m.risk_segment === 'HIGH').length;

  // Prepare scatter data
  const scatterData = msmes.map((m) => ({
    x: m.revenue_stability,
    y: m.cash_flow_stability,
    z: Math.round(m.loan_exposure / 100000), // in Lakhs
    business_name: m.business_name,
    msme_id: m.msme_id,
    sector: m.sector,
    risk_score: m.risk_score,
    risk_segment: m.risk_segment,
    raw: m
  }));

  const handleScatterClick = (e: any) => {
    if (e && e.raw) {
      setSelectedBubble(e.raw);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#F5F5F5] flex items-center gap-2">
            Portfolio Risk Segmentation Matrix
          </h1>
          <p className="text-xs sm:text-sm text-[#A1A1AA] mt-0.5">
            2D clustering across alternative signals: Revenue Stability vs Cash Flow Stability (Bubble size = Loan Exposure)
          </p>
        </div>

        {/* Risk bucket summary pills */}
        <div className="flex items-center gap-2 text-xs">
          <div className="px-3 py-1.5 rounded-lg bg-[#132E25] border border-[#1A533E] text-[#22A477] font-semibold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#22A477]" />
            <span>LOW: {lowCount} MSMEs</span>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-[#332410] border border-[#6B4A15] text-[#E8A23A] font-semibold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#E8A23A]" />
            <span>MODERATE: {modCount} MSMEs</span>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-[#331515] border border-[#6B1F1F] text-[#EF5350] font-semibold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#EF5350]" />
            <span>HIGH: {highCount} MSMEs</span>
          </div>
        </div>
      </div>

      {/* Main Scatter / Bubble Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Scatter Plot (8 cols) */}
        <div className="lg:col-span-8 bg-[#171719] border border-[#303035] rounded-xl p-5 space-y-4 flex flex-col justify-between shadow-fin-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[#F5F5F5]">
                Alternative Stability Quadrant
              </h3>
              <p className="text-[11px] text-[#A1A1AA] mt-0.5">
                Click any bubble to inspect borrower financials
              </p>
            </div>
            <InfoTooltip
              title="Stability Quadrant"
              text="X-axis: 12-month Revenue Stability score. Y-axis: Cash Flow Stability index. Bubble size represents approved Loan Exposure."
            />
          </div>

          <div className="h-96 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#303035" />
                <XAxis
                  type="number"
                  dataKey="x"
                  name="Revenue Stability"
                  unit="%"
                  domain={[40, 100]}
                  stroke="#71717A"
                  fontSize={11}
                  label={{ value: 'Revenue Stability (%) →', position: 'bottom', offset: -5, fill: '#A1A1AA', fontSize: 11 }}
                />
                <YAxis
                  type="number"
                  dataKey="y"
                  name="Cash Flow Stability"
                  unit="%"
                  domain={[35, 100]}
                  stroke="#71717A"
                  fontSize={11}
                  label={{ value: 'Cash Flow Stability (%) →', angle: -90, position: 'left', offset: 15, fill: '#A1A1AA', fontSize: 11 }}
                />
                <ZAxis type="number" dataKey="z" range={[40, 320]} name="Exposure (₹L)" />
                <RechartsTooltip
                  cursor={{ strokeDasharray: '3 3', stroke: '#75401F' }}
                  content={({ payload }) => {
                    if (!payload || !payload.length) return null;
                    const data = payload[0].payload;
                    return (
                      <div className="p-3 space-y-1 bg-[#1E1E21] border border-[#303035] rounded-lg shadow-2xl text-xs text-[#F5F5F5]">
                        <div className="font-bold text-[#F5F5F5] flex items-center gap-1.5">
                          {data.business_name}
                          <span className="text-[10px] text-[#FF7A1A] font-mono">({data.msme_id})</span>
                        </div>
                        <div className="text-[11px] text-[#A1A1AA]">{data.sector}</div>
                        <div className="pt-1 text-[11px] grid grid-cols-2 gap-x-2 text-[#F5F5F5]">
                          <div>Rev Stability: <strong>{data.x}%</strong></div>
                          <div>CF Stability: <strong>{data.y}%</strong></div>
                          <div>
                            Risk Score:{' '}
                            <strong
                              className={
                                data.risk_score >= 70
                                  ? 'text-[#EF5350]'
                                  : data.risk_score >= 40
                                  ? 'text-[#E8A23A]'
                                  : 'text-[#22A477]'
                              }
                            >
                              {data.risk_score}
                            </strong>
                          </div>
                          <div>Exposure: <strong>₹{data.z}L</strong></div>
                        </div>
                      </div>
                    );
                  }}
                />
                <Scatter name="MSMEs" data={scatterData} onClick={handleScatterClick}>
                  {scatterData.map((entry, index) => {
                    const color =
                      entry.risk_segment === 'LOW'
                        ? '#22A477'
                        : entry.risk_segment === 'MODERATE'
                        ? '#E8A23A'
                        : '#EF5350';
                    return (
                      <Cell
                        key={`cell-${index}`}
                        fill={color}
                        fillOpacity={0.85}
                        stroke="#171719"
                        strokeWidth={1.5}
                      />
                    );
                  })}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center justify-between text-xs text-[#71717A] border-t border-[#303035] pt-2 px-1">
            <span>Bottom Left: High Vulnerability Quadrant</span>
            <span>Top Right: Resilient Credit Growth Quadrant</span>
          </div>
        </div>

        {/* Selected Bubble Details Panel (4 cols) */}
        <div className="lg:col-span-4 bg-[#171719] border border-[#303035] rounded-xl p-5 flex flex-col justify-between space-y-4 shadow-fin-sm">
          {selectedBubble ? (
            <>
              <div>
                <div className="text-[11px] uppercase font-bold text-[#71717A] tracking-wider">
                  Inspected Enterprise
                </div>
                <h4 className="text-lg font-bold text-[#F5F5F5] mt-1">
                  {selectedBubble.business_name}
                </h4>
                <div className="text-xs text-[#A1A1AA] font-mono mt-0.5">
                  {selectedBubble.msme_id} • {selectedBubble.city}
                </div>
                <div className="text-xs text-[#F5F5F5] font-medium mt-1">
                  {selectedBubble.sector}
                </div>

                <div className="mt-4 p-3.5 rounded-lg bg-[#141416] border border-[#303035] space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#A1A1AA]">Risk Score:</span>
                    <span
                      className={`text-sm font-bold font-mono px-2 py-0.5 rounded border tabular-nums ${
                        selectedBubble.risk_score >= 70
                          ? 'bg-[#331515] text-[#EF5350] border-[#6B1F1F]'
                          : selectedBubble.risk_score >= 40
                          ? 'bg-[#332410] text-[#E8A23A] border-[#6B4A15]'
                          : 'bg-[#132E25] text-[#22A477] border-[#1A533E]'
                      }`}
                    >
                      {selectedBubble.risk_score} / 100 ({selectedBubble.risk_segment})
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#A1A1AA]">Probability of Default:</span>
                    <span className="font-mono text-[#F5F5F5] font-semibold tabular-nums">{selectedBubble.probability_of_default}%</span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#A1A1AA]">Revenue Stability:</span>
                    <span className="font-mono text-[#F5F5F5] font-semibold tabular-nums">{selectedBubble.revenue_stability}%</span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#A1A1AA]">Cash Flow Stability:</span>
                    <span className="font-mono text-[#F5F5F5] font-semibold tabular-nums">{selectedBubble.cash_flow_stability}%</span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#A1A1AA]">DSCR:</span>
                    <span className="font-mono text-[#F5F5F5] font-semibold tabular-nums">{selectedBubble.dscr}x</span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#A1A1AA]">Loan Exposure:</span>
                    <span className="font-mono text-[#FF7A1A] font-bold tabular-nums">
                      ₹{(selectedBubble.loan_exposure / 100000).toFixed(1)}L
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => onSelectBorrower(selectedBubble)}
                className="w-full py-2.5 bg-[#FF7A1A] hover:bg-[#FF8F3D] active:bg-[#C2410C] text-[#0D0D0F] rounded-lg text-xs font-bold flex items-center justify-center gap-2 shadow-fin-sm transition-all cursor-pointer"
              >
                <span>Open Full Borrower Analysis</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </>
          ) : (
            <div className="py-20 text-center text-[#71717A] text-xs">
              Click any bubble in the matrix to view enterprise details.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
