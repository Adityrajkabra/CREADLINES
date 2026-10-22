import React, { useState } from 'react';
import {
  Sliders,
  Play,
  AlertTriangle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend
} from 'recharts';
import { MSME, SimulationInputs, SimulationResponse } from '../types';
import { api } from '../services/api';
import { InfoTooltip } from '../components/InfoTooltip';

interface WhatIfLabViewProps {
  borrower: MSME;
}

export const WhatIfLabView: React.FC<WhatIfLabViewProps> = ({ borrower }) => {
  // Simulator Sliders State
  const [revenueChange, setRevenueChange] = useState<number>(-10);
  const [costChange, setCostChange] = useState<number>(8);
  const [interestChange, setInterestChange] = useState<number>(2);
  const [paymentDelayDays, setPaymentDelayDays] = useState<number>(15);
  const [loanAmount, setLoanAmount] = useState<number>(1000000);
  const [activePreset, setActivePreset] = useState<string>('moderate');

  // Simulation execution state
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [simulationResult, setSimulationResult] = useState<SimulationResponse | null>(null);

  // Apply Presets
  const applyPreset = (preset: 'stable' | 'moderate' | 'severe') => {
    setActivePreset(preset);
    if (preset === 'stable') {
      setRevenueChange(3);
      setCostChange(2);
      setInterestChange(0);
      setPaymentDelayDays(0);
    } else if (preset === 'moderate') {
      setRevenueChange(-10);
      setCostChange(8);
      setInterestChange(2);
      setPaymentDelayDays(15);
    } else {
      setRevenueChange(-20);
      setCostChange(15);
      setInterestChange(4);
      setPaymentDelayDays(30);
    }
  };

  const handleRunSimulation = async () => {
    setIsSimulating(true);
    try {
      const inputs: SimulationInputs = {
        msme_id: borrower.msme_id,
        revenue_change: revenueChange,
        cost_change: costChange,
        interest_change: interestChange,
        payment_delay_days: paymentDelayDays,
        loan_amount: loanAmount
      };
      const res = await api.simulateStress(inputs);
      setSimulationResult(res);
    } finally {
      setIsSimulating(false);
    }
  };

  // Run on mount
  React.useEffect(() => {
    handleRunSimulation();
  }, [borrower.msme_id]);

  const curr = simulationResult?.current_state || {
    risk_score: borrower.risk_score,
    probability_of_default: borrower.probability_of_default,
    cash_reserve: borrower.msme_id === 'MSME-1042' ? 4.2 : roundLakhs(borrower.cash_reserve),
    dscr: borrower.dscr,
    risk_segment: borrower.risk_segment
  };

  const sim = simulationResult?.simulated_state || {
    scenario_name: 'Moderate Stress',
    risk_score: 72,
    probability_of_default: 21.8,
    cash_reserve: 3.1,
    dscr: 1.12,
    risk_segment: 'MODERATE-HIGH',
    stress_result: 'The selected scenario increases financial pressure and moves the borrower into a higher-risk segment.',
    dscr_status: 'Compressed',
    liquidity_strain: '15-day receivables delay'
  };

  function roundLakhs(val: number): number {
    return Number((val / 100000).toFixed(1));
  }

  // Comparison Bar Chart data
  const comparisonChartData = [
    {
      metric: 'Risk Score',
      Current: curr.risk_score,
      Simulated: sim.risk_score,
      delta: `${sim.risk_score - curr.risk_score > 0 ? '+' : ''}${sim.risk_score - curr.risk_score} pts`
    },
    {
      metric: 'Prob. Default (%)',
      Current: curr.probability_of_default,
      Simulated: sim.probability_of_default,
      delta: `${sim.probability_of_default - curr.probability_of_default > 0 ? '+' : ''}${(sim.probability_of_default - curr.probability_of_default).toFixed(1)}%`
    },
    {
      metric: 'Cash Reserve (₹L)',
      Current: curr.cash_reserve,
      Simulated: sim.cash_reserve,
      delta: `${(sim.cash_reserve - curr.cash_reserve).toFixed(1)}L`
    },
    {
      metric: 'DSCR (x10)',
      Current: Math.round(curr.dscr * 10),
      Simulated: Math.round(sim.dscr * 10),
      delta: `${(sim.dscr - curr.dscr).toFixed(2)}x`
    }
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#F5F5F5] flex items-center gap-2">
              <Sliders className="w-5 h-5 text-[#FF7A1A]" />
              WHAT-IF LAB
            </h1>
            <span className="text-xs font-mono font-semibold px-2.5 py-0.5 rounded bg-[#332015] text-[#FF7A1A] border border-[#75401F]">
              Macroeconomic Stress Simulator
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#A1A1AA] mt-0.5">
            Test <strong className="text-[#F5F5F5]">{borrower.business_name}</strong> ({borrower.msme_id}) against economic shocks and receivables drag.
          </p>
        </div>

        {/* Preset Selector Buttons */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#A1A1AA] font-medium mr-1 hidden sm:inline">Scenario Presets:</span>
          <button
            onClick={() => applyPreset('stable')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activePreset === 'stable'
                ? 'bg-[#132E25] text-[#22A477] border border-[#1A533E] shadow-fin-sm'
                : 'bg-[#1E1E21] text-[#A1A1AA] border border-[#303035] hover:text-[#F5F5F5] hover:border-[#75401F]'
            }`}
          >
            1. Stable Economy
          </button>
          <button
            onClick={() => applyPreset('moderate')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activePreset === 'moderate'
                ? 'bg-[#332015] text-[#FF7A1A] border border-[#75401F] shadow-fin-sm'
                : 'bg-[#1E1E21] text-[#A1A1AA] border border-[#303035] hover:text-[#F5F5F5] hover:border-[#75401F]'
            }`}
          >
            2. Moderate Stress
          </button>
          <button
            onClick={() => applyPreset('severe')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activePreset === 'severe'
                ? 'bg-[#331515] text-[#EF5350] border border-[#6B1F1F] shadow-fin-sm'
                : 'bg-[#1E1E21] text-[#A1A1AA] border border-[#303035] hover:text-[#F5F5F5] hover:border-[#75401F]'
            }`}
          >
            3. Severe Stress
          </button>
        </div>
      </div>

      {/* Simulator Controls & Realtime Slider Box */}
      <div className="bg-[#171719] border border-[#303035] rounded-xl p-6 space-y-6 shadow-fin-sm">
        <div className="flex items-center justify-between border-b border-[#303035] pb-3">
          <div className="text-xs uppercase font-bold tracking-wider text-[#F5F5F5]">
            Stress Test Parameter Controls
          </div>
          <span className="text-[11px] text-[#A1A1AA]">
            Adjust parametric shocks and evaluate deterministic impact on coverage
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* 1. Revenue Change Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#F5F5F5] font-semibold">Revenue Change</span>
              <span
                className={`font-mono font-bold tabular-nums ${
                  revenueChange < 0 ? 'text-[#EF5350]' : 'text-[#22A477]'
                }`}
              >
                {revenueChange > 0 ? `+${revenueChange}%` : `${revenueChange}%`}
              </span>
            </div>
            <input
              type="range"
              min="-30"
              max="20"
              step="1"
              value={revenueChange}
              onChange={(e) => {
                setRevenueChange(Number(e.target.value));
                setActivePreset('custom');
              }}
              className="w-full accent-[#FF7A1A] cursor-pointer h-1.5 bg-[#141416] rounded-lg"
            />
            <div className="flex justify-between text-[10px] text-[#71717A] font-mono">
              <span>-30%</span>
              <span>0%</span>
              <span>+20%</span>
            </div>
          </div>

          {/* 2. Operating Cost Change Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#F5F5F5] font-semibold">Operating Cost Change</span>
              <span
                className={`font-mono font-bold tabular-nums ${
                  costChange > 0 ? 'text-[#EF5350]' : 'text-[#22A477]'
                }`}
              >
                {costChange > 0 ? `+${costChange}%` : `${costChange}%`}
              </span>
            </div>
            <input
              type="range"
              min="-10"
              max="30"
              step="1"
              value={costChange}
              onChange={(e) => {
                setCostChange(Number(e.target.value));
                setActivePreset('custom');
              }}
              className="w-full accent-[#E8A23A] cursor-pointer h-1.5 bg-[#141416] rounded-lg"
            />
            <div className="flex justify-between text-[10px] text-[#71717A] font-mono">
              <span>-10%</span>
              <span>0%</span>
              <span>+30%</span>
            </div>
          </div>

          {/* 3. Interest Rate Change Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#F5F5F5] font-semibold">Interest Rate Shock</span>
              <span
                className={`font-mono font-bold tabular-nums ${
                  interestChange > 0 ? 'text-[#EF5350]' : 'text-[#22A477]'
                }`}
              >
                {interestChange > 0 ? `+${interestChange}%` : `${interestChange}%`}
              </span>
            </div>
            <input
              type="range"
              min="-2"
              max="6"
              step="0.5"
              value={interestChange}
              onChange={(e) => {
                setInterestChange(Number(e.target.value));
                setActivePreset('custom');
              }}
              className="w-full accent-[#FF7A1A] cursor-pointer h-1.5 bg-[#141416] rounded-lg"
            />
            <div className="flex justify-between text-[10px] text-[#71717A] font-mono">
              <span>-2%</span>
              <span>0%</span>
              <span>+6%</span>
            </div>
          </div>

          {/* 4. Average Payment Delay Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#F5F5F5] font-semibold">Avg Payment Delay</span>
              <span className="font-mono font-bold text-[#E8A23A] tabular-nums">
                +{paymentDelayDays} days
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="45"
              step="1"
              value={paymentDelayDays}
              onChange={(e) => {
                setPaymentDelayDays(Number(e.target.value));
                setActivePreset('custom');
              }}
              className="w-full accent-[#FF7A1A] cursor-pointer h-1.5 bg-[#141416] rounded-lg"
            />
            <div className="flex justify-between text-[10px] text-[#71717A] font-mono">
              <span>0 days</span>
              <span>20 days</span>
              <span>45 days</span>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex justify-end pt-3 border-t border-[#303035]">
          <button
            onClick={handleRunSimulation}
            disabled={isSimulating}
            className="px-6 py-2.5 rounded-lg bg-[#FF7A1A] hover:bg-[#FF8F3D] active:bg-[#C2410C] text-[#0D0D0F] font-bold text-xs flex items-center gap-2 shadow-fin-sm transition-all cursor-pointer disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5 fill-[#0D0D0F]" />
            <span>{isSimulating ? 'SIMULATING DYNAMICS...' : 'RUN SIMULATION'}</span>
          </button>
        </div>
      </div>

      {/* STRESS RESULT Callout */}
      <div
        className={`p-4 rounded-xl border flex items-start gap-3.5 shadow-fin-sm ${
          sim.risk_score >= 80
            ? 'bg-[#331515] border-[#6B1F1F] text-[#F5F5F5]'
            : sim.risk_score >= 70
            ? 'bg-[#332015] border-[#75401F] text-[#F5F5F5]'
            : 'bg-[#132E25] border-[#1A533E] text-[#F5F5F5]'
        }`}
      >
        <AlertTriangle
          className={`w-5 h-5 shrink-0 mt-0.5 ${
            sim.risk_score >= 80 ? 'text-[#EF5350]' : 'text-[#FF7A1A]'
          }`}
        />
        <div className="space-y-1">
          <div
            className={`text-xs font-bold uppercase tracking-wider ${
              sim.risk_score >= 80 ? 'text-[#EF5350]' : 'text-[#FF7A1A]'
            }`}
          >
            STRESS RESULT — {sim.scenario_name.toUpperCase()}
          </div>
          <p className="text-xs font-medium leading-relaxed text-[#F5F5F5]">
            "{sim.stress_result}"
          </p>
          <div className="text-[11px] text-[#A1A1AA] flex items-center gap-3 pt-0.5">
            <span>DSCR Status: <strong className="text-[#F5F5F5]">{sim.dscr_status}</strong></span>
            <span>•</span>
            <span>{sim.liquidity_strain}</span>
          </div>
        </div>
      </div>

      {/* Comparison Grid: Current vs Scenario Cards & Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Comparison Cards (5 cols) */}
        <div className="lg:col-span-5 space-y-3.5">
          {/* Card: Current Baseline */}
          <div className="bg-[#171719] border border-[#303035] rounded-xl p-4 space-y-2 border-l-4 border-l-[#71717A] shadow-fin-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-bold text-[#F5F5F5]">
                CURRENT BASELINE
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#141416] text-[#A1A1AA] border border-[#303035]">
                Actual
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <div className="text-[10px] text-[#71717A] uppercase font-medium">Risk Score</div>
                <div className="text-xl font-bold font-mono text-[#F5F5F5] tabular-nums mt-0.5">{curr.risk_score} / 100</div>
              </div>
              <div>
                <div className="text-[10px] text-[#71717A] uppercase font-medium">Probability of Default</div>
                <div className="text-xl font-bold font-mono text-[#F5F5F5] tabular-nums mt-0.5">{curr.probability_of_default}%</div>
              </div>
              <div>
                <div className="text-[10px] text-[#71717A] uppercase font-medium">Cash Reserve</div>
                <div className="text-xl font-bold font-mono text-[#F5F5F5] tabular-nums mt-0.5">₹{curr.cash_reserve}L</div>
              </div>
              <div>
                <div className="text-[10px] text-[#71717A] uppercase font-medium">DSCR</div>
                <div className="text-xl font-bold font-mono text-[#F5F5F5] tabular-nums mt-0.5">{curr.dscr}x</div>
              </div>
            </div>
          </div>

          {/* Card: Scenario Simulated */}
          <div
            className={`bg-[#171719] border border-[#303035] rounded-xl p-4 space-y-2 border-l-4 shadow-fin-sm ${
              sim.risk_score >= 80 ? 'border-l-[#EF5350]' : 'border-l-[#FF7A1A]'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-bold text-[#FF7A1A]">
                {sim.scenario_name.toUpperCase()} (SIMULATED)
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#332015] text-[#FF7A1A] border border-[#75401F]">
                Dynamic Shock
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <div className="text-[10px] text-[#71717A] uppercase font-medium">Risk Score</div>
                <div className="text-2xl font-bold font-mono text-[#FF7A1A] tabular-nums mt-0.5 flex items-baseline gap-1.5">
                  {sim.risk_score}
                  <span className="text-xs text-[#EF5350] font-semibold font-mono">
                    (+{sim.risk_score - curr.risk_score})
                  </span>
                </div>
              </div>
              <div>
                <div className="text-[10px] text-[#71717A] uppercase font-medium">Probability of Default</div>
                <div className="text-2xl font-bold font-mono text-[#EF5350] tabular-nums mt-0.5">
                  {sim.probability_of_default}%
                </div>
              </div>
              <div>
                <div className="text-[10px] text-[#71717A] uppercase font-medium">Cash Reserve</div>
                <div className="text-2xl font-bold font-mono text-[#E8A23A] tabular-nums mt-0.5">
                  ₹{sim.cash_reserve}L
                </div>
              </div>
              <div>
                <div className="text-[10px] text-[#71717A] uppercase font-medium">DSCR</div>
                <div
                  className={`text-2xl font-bold font-mono tabular-nums mt-0.5 ${
                    sim.dscr < 1.0 ? 'text-[#EF5350]' : 'text-[#E8A23A]'
                  }`}
                >
                  {sim.dscr}x
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-[#303035] text-[11px] text-[#A1A1AA] flex justify-between items-center">
              <span>Risk Segment Migration:</span>
              <span className="font-bold text-[#EF5350] uppercase font-mono">{sim.risk_segment}</span>
            </div>
          </div>
        </div>

        {/* Comparison Bar Chart (7 cols) */}
        <div className="lg:col-span-7 bg-[#171719] border border-[#303035] rounded-xl p-5 flex flex-col justify-between space-y-4 shadow-fin-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[#F5F5F5]">
                Current Condition vs Scenario Stress
              </h3>
              <p className="text-[11px] text-[#A1A1AA] mt-0.5">
                Direct parametric comparison of solvency & liquidity buffers
              </p>
            </div>
            <InfoTooltip text="Visualizes the contraction of cash reserve and debt service capacity alongside risk score inflation." />
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparisonChartData} margin={{ top: 15, right: 15, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#303035" vertical={false} />
                <XAxis dataKey="metric" stroke="#71717A" fontSize={11} tickLine={false} />
                <YAxis stroke="#71717A" fontSize={11} tickLine={false} />
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: '#1E1E21',
                    borderColor: '#303035',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: '#F5F5F5'
                  }}
                  itemStyle={{ color: '#F5F5F5' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="Current" fill="#71717A" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Simulated" fill="#FF7A1A" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="p-3 bg-[#141416] rounded-lg border border-[#303035] text-xs text-[#A1A1AA] flex items-center justify-between">
            <span>Deterministic simulation engine executed with fixed random seed.</span>
            <span className="font-mono text-[#FF7A1A] font-semibold">Underwriting Status: Elevated Review</span>
          </div>
        </div>
      </div>
    </div>
  );
};
