import {
  MSME,
  OverviewData,
  RiskExplanation,
  CashFlowResponse,
  SimulationResponse,
  SimulationInputs,
  LoanImpactResponse,
  FairnessResponse,
  ModelMetricsResponse,
  CreditIntelligenceReport,
  ChatResponse
} from '../types';

export const FALLBACK_PRIMARY_MSMES: MSME[] = [
  {
    msme_id: 'MSME-1042',
    business_name: 'Metro Auto Parts',
    sector: 'Automotive Components',
    business_age: 6.8,
    city: 'Pune',
    region: 'Region A',
    annual_revenue: 98500000,
    monthly_revenue: 8200000,
    cash_inflow: 8100000,
    cash_outflow: 7300000,
    revenue_growth: -8.2,
    cashflow_volatility: 68.0,
    invoice_frequency: 78,
    payment_delay_days: 28,
    debt_ratio: 0.44,
    dscr: 1.24,
    customer_concentration: 'Moderate',
    supplier_concentration: 'Low',
    business_activity: 81,
    transaction_consistency: 74,
    revenue_stability: 72,
    cash_flow_stability: 61,
    invoice_consistency: 78,
    payment_behavior: 64,
    transaction_volatility: 'High',
    traditional_credit_score: 648,
    risk_score: 68,
    probability_of_default: 18.7,
    risk_segment: 'MODERATE',
    cash_reserve: 4200000,
    loan_exposure: 3500000,
    cash_flow_health: 'Watch',
    trend: 'deteriorating',
    recent_alert: 'Risk increased from 61 → 68'
  },
  {
    msme_id: 'MSME-1001',
    business_name: 'Sharma Electricals',
    sector: 'Electricals & Electronics',
    business_age: 8.5,
    city: 'Ahmedabad',
    region: 'Region A',
    annual_revenue: 142000000,
    monthly_revenue: 11800000,
    cash_inflow: 12100000,
    cash_outflow: 9800000,
    revenue_growth: 14.5,
    cashflow_volatility: 24.0,
    invoice_frequency: 92,
    payment_delay_days: 8,
    debt_ratio: 0.22,
    dscr: 2.15,
    customer_concentration: 'Low',
    supplier_concentration: 'Low',
    business_activity: 94,
    transaction_consistency: 91,
    revenue_stability: 92,
    cash_flow_stability: 88,
    invoice_consistency: 90,
    payment_behavior: 95,
    transaction_volatility: 'Low',
    traditional_credit_score: 765,
    risk_score: 26,
    probability_of_default: 4.1,
    risk_segment: 'LOW',
    cash_reserve: 9800000,
    loan_exposure: 5000000,
    cash_flow_health: 'Healthy',
    trend: 'improving',
    recent_alert: null
  },
  {
    msme_id: 'MSME-1002',
    business_name: 'GreenBasket Foods',
    sector: 'Food Processing & FMCG',
    business_age: 5.2,
    city: 'Bengaluru',
    region: 'Region B',
    annual_revenue: 86000000,
    monthly_revenue: 7100000,
    cash_inflow: 7300000,
    cash_outflow: 6200000,
    revenue_growth: 11.2,
    cashflow_volatility: 32.0,
    invoice_frequency: 88,
    payment_delay_days: 12,
    debt_ratio: 0.28,
    dscr: 1.85,
    customer_concentration: 'Low',
    supplier_concentration: 'Moderate',
    business_activity: 89,
    transaction_consistency: 86,
    revenue_stability: 85,
    cash_flow_stability: 82,
    invoice_consistency: 87,
    payment_behavior: 88,
    transaction_volatility: 'Low',
    traditional_credit_score: 725,
    risk_score: 34,
    probability_of_default: 6.8,
    risk_segment: 'LOW',
    cash_reserve: 6500000,
    loan_exposure: 2800000,
    cash_flow_health: 'Healthy',
    trend: 'stable',
    recent_alert: null
  },
  {
    msme_id: 'MSME-1003',
    business_name: 'Aarav Textiles',
    sector: 'Textiles & Apparel',
    business_age: 7.1,
    city: 'Surat',
    region: 'Region A',
    annual_revenue: 112000000,
    monthly_revenue: 9300000,
    cash_inflow: 9100000,
    cash_outflow: 8200000,
    revenue_growth: 3.8,
    cashflow_volatility: 45.0,
    invoice_frequency: 80,
    payment_delay_days: 19,
    debt_ratio: 0.36,
    dscr: 1.52,
    customer_concentration: 'Moderate',
    supplier_concentration: 'Moderate',
    business_activity: 82,
    transaction_consistency: 79,
    revenue_stability: 78,
    cash_flow_stability: 73,
    invoice_consistency: 81,
    payment_behavior: 76,
    transaction_volatility: 'Moderate',
    traditional_credit_score: 690,
    risk_score: 46,
    probability_of_default: 11.2,
    risk_segment: 'MODERATE',
    cash_reserve: 5100000,
    loan_exposure: 4200000,
    cash_flow_health: 'Healthy',
    trend: 'stable',
    recent_alert: null
  },
  {
    msme_id: 'MSME-1005',
    business_name: 'Sunrise Furniture',
    sector: 'Light Engineering & Tools',
    business_age: 4.5,
    city: 'Indore',
    region: 'Region A',
    annual_revenue: 64000000,
    monthly_revenue: 5300000,
    cash_inflow: 5200000,
    cash_outflow: 4700000,
    revenue_growth: 5.4,
    cashflow_volatility: 48.0,
    invoice_frequency: 75,
    payment_delay_days: 21,
    debt_ratio: 0.38,
    dscr: 1.42,
    customer_concentration: 'Moderate',
    supplier_concentration: 'Moderate',
    business_activity: 76,
    transaction_consistency: 73,
    revenue_stability: 74,
    cash_flow_stability: 69,
    invoice_consistency: 76,
    payment_behavior: 72,
    transaction_volatility: 'Moderate',
    traditional_credit_score: 675,
    risk_score: 52,
    probability_of_default: 13.5,
    risk_segment: 'MODERATE',
    cash_reserve: 3800000,
    loan_exposure: 2000000,
    cash_flow_health: 'Watch',
    trend: 'stable',
    recent_alert: null
  },
  {
    msme_id: 'MSME-1006',
    business_name: 'Nova Traders',
    sector: 'Logistics & Warehousing',
    business_age: 3.2,
    city: 'Hyderabad',
    region: 'Region B',
    annual_revenue: 78000000,
    monthly_revenue: 6500000,
    cash_inflow: 6100000,
    cash_outflow: 6400000,
    revenue_growth: -6.4,
    cashflow_volatility: 74.0,
    invoice_frequency: 65,
    payment_delay_days: 34,
    debt_ratio: 0.52,
    dscr: 1.08,
    customer_concentration: 'High',
    supplier_concentration: 'Moderate',
    business_activity: 68,
    transaction_consistency: 62,
    revenue_stability: 60,
    cash_flow_stability: 54,
    invoice_consistency: 65,
    payment_behavior: 58,
    transaction_volatility: 'High',
    traditional_credit_score: 610,
    risk_score: 74,
    probability_of_default: 24.5,
    risk_segment: 'HIGH',
    cash_reserve: 1900000,
    loan_exposure: 3200000,
    cash_flow_health: 'Critical',
    trend: 'deteriorating',
    recent_alert: 'Cash-flow warning: Outflow exceeded inflow for 2 consecutive cycles'
  },
  {
    msme_id: 'MSME-1007',
    business_name: 'KJ Textiles',
    sector: 'Textiles & Apparel',
    business_age: 9.4,
    city: 'Coimbatore',
    region: 'Region B',
    annual_revenue: 105000000,
    monthly_revenue: 8700000,
    cash_inflow: 7900000,
    cash_outflow: 8600000,
    revenue_growth: -11.5,
    cashflow_volatility: 76.0,
    invoice_frequency: 62,
    payment_delay_days: 38,
    debt_ratio: 0.58,
    dscr: 0.95,
    customer_concentration: 'High',
    supplier_concentration: 'High',
    business_activity: 64,
    transaction_consistency: 58,
    revenue_stability: 56,
    cash_flow_stability: 50,
    invoice_consistency: 61,
    payment_behavior: 52,
    transaction_volatility: 'High',
    traditional_credit_score: 585,
    risk_score: 82,
    probability_of_default: 32.8,
    risk_segment: 'HIGH',
    cash_reserve: 1200000,
    loan_exposure: 4800000,
    cash_flow_health: 'Critical',
    trend: 'deteriorating',
    recent_alert: 'Revenue trend deteriorating: -11.5% YoY contraction'
  },
  {
    msme_id: 'MSME-1008',
    business_name: 'Urban Packaging',
    sector: 'Packaging & Paper',
    business_age: 6.1,
    city: 'Chennai',
    region: 'Region B',
    annual_revenue: 72000000,
    monthly_revenue: 6000000,
    cash_inflow: 6100000,
    cash_outflow: 5500000,
    revenue_growth: 4.2,
    cashflow_volatility: 42.0,
    invoice_frequency: 82,
    payment_delay_days: 16,
    debt_ratio: 0.32,
    dscr: 1.68,
    customer_concentration: 'Moderate',
    supplier_concentration: 'Low',
    business_activity: 80,
    transaction_consistency: 78,
    revenue_stability: 80,
    cash_flow_stability: 75,
    invoice_consistency: 82,
    payment_behavior: 80,
    transaction_volatility: 'Moderate',
    traditional_credit_score: 710,
    risk_score: 42,
    probability_of_default: 9.4,
    risk_segment: 'MODERATE',
    cash_reserve: 4900000,
    loan_exposure: 2400000,
    cash_flow_health: 'Healthy',
    trend: 'stable',
    recent_alert: null
  },
  {
    msme_id: 'MSME-1009',
    business_name: 'FreshRoute Foods',
    sector: 'Food Processing & FMCG',
    business_age: 3.8,
    city: 'Pune',
    region: 'Region A',
    annual_revenue: 58000000,
    monthly_revenue: 4800000,
    cash_inflow: 4900000,
    cash_outflow: 4300000,
    revenue_growth: 8.7,
    cashflow_volatility: 38.0,
    invoice_frequency: 85,
    payment_delay_days: 14,
    debt_ratio: 0.30,
    dscr: 1.74,
    customer_concentration: 'Low',
    supplier_concentration: 'Moderate',
    business_activity: 85,
    transaction_consistency: 82,
    revenue_stability: 82,
    cash_flow_stability: 78,
    invoice_consistency: 84,
    payment_behavior: 84,
    transaction_volatility: 'Moderate',
    traditional_credit_score: 715,
    risk_score: 38,
    probability_of_default: 8.1,
    risk_segment: 'LOW',
    cash_reserve: 4100000,
    loan_exposure: 1800000,
    cash_flow_health: 'Healthy',
    trend: 'improving',
    recent_alert: null
  },
  {
    msme_id: 'MSME-1010',
    business_name: 'Bharat Tools',
    sector: 'Light Engineering & Tools',
    business_age: 11.2,
    city: 'Ludhiana',
    region: 'Region A',
    annual_revenue: 168000000,
    monthly_revenue: 14000000,
    cash_inflow: 14300000,
    cash_outflow: 11500000,
    revenue_growth: 9.8,
    cashflow_volatility: 26.0,
    invoice_frequency: 90,
    payment_delay_days: 10,
    debt_ratio: 0.25,
    dscr: 2.05,
    customer_concentration: 'Low',
    supplier_concentration: 'Low',
    business_activity: 92,
    transaction_consistency: 89,
    revenue_stability: 90,
    cash_flow_stability: 86,
    invoice_consistency: 89,
    payment_behavior: 92,
    transaction_volatility: 'Low',
    traditional_credit_score: 750,
    risk_score: 28,
    probability_of_default: 4.8,
    risk_segment: 'LOW',
    cash_reserve: 11200000,
    loan_exposure: 6000000,
    cash_flow_health: 'Healthy',
    trend: 'stable',
    recent_alert: null
  }
];

// Generate deterministic remaining 117 records to reach exactly 127
export function buildDeterministicDataset(): MSME[] {
  const result: MSME[] = [...FALLBACK_PRIMARY_MSMES];
  const targetLow = 54;
  const targetMod = 49;
  const targetHigh = 24;

  let currentLow = result.filter(m => m.risk_score < 40).length;
  let currentMod = result.filter(m => m.risk_score >= 40 && m.risk_score < 70).length;
  let currentHigh = result.filter(m => m.risk_score >= 70).length;

  const names = [
    'Apex Technologies', 'Zenith Logistics', 'Vanguard Precision', 'Kaveri Polymers', 'Paramount Spun',
    'Sterling Pumps', 'Godavari Agro', 'Royal Castings', 'Shakti Forgings', 'Trident Bio',
    'Delta Electricals', 'Sai Enterprises', 'Pioneer Tooling', 'Narmada Packaging', 'Falcon Solar',
    'Surya Gears', 'Kohinoor Weaving', 'Navkar Cables', 'Arihant Chemicals', 'Mahalaxmi Metals',
    'Balaji Auto', 'Anand Engineering', 'Riddhi Steels', 'Siddhant Pharma', 'Vikas Motors',
    'Pragati Pack', 'Ganga Mills', 'Indus Fasteners', 'Om Shanti Fabrics', 'BlueHorizon Freight'
  ];

  const sectors = [
    'Automotive Components', 'Textiles & Apparel', 'Food Processing & FMCG',
    'Electricals & Electronics', 'Light Engineering & Tools', 'Packaging & Paper',
    'Chemicals & Polymers', 'Healthcare & Pharma Supplies', 'Logistics & Warehousing',
    'Renewable & Solar Equipment'
  ];

  const regions = [
    { city: 'Pune', region: 'Region A' },
    { city: 'Surat', region: 'Region A' },
    { city: 'Coimbatore', region: 'Region B' },
    { city: 'Ludhiana', region: 'Region A' },
    { city: 'Hyderabad', region: 'Region B' },
    { city: 'Ahmedabad', region: 'Region A' },
    { city: 'Bengaluru', region: 'Region B' },
    { city: 'Chennai', region: 'Region B' }
  ];

  let idCounter = 1011;

  function addSynthetic(bucket: 'LOW' | 'MODERATE' | 'HIGH') {
    const idx = (idCounter - 1011) % names.length;
    const sIdx = (idCounter * 3) % sectors.length;
    const rIdx = (idCounter * 7) % regions.length;
    const name = `${names[idx]} #${idCounter - 1000}`;
    const msme_id = `MSME-${idCounter}`;
    idCounter++;

    let risk_score = 30;
    let pd = 5.0;
    let rev_growth = 8.0;
    let cf_volatility = 30.0;
    let delay_days = 12;
    let dscr = 1.9;
    let debt_ratio = 0.25;
    let health: 'Healthy' | 'Watch' | 'Critical' = 'Healthy';
    let trend: 'improving' | 'stable' | 'deteriorating' = 'stable';
    let rev_stab = 88;
    let cf_stab = 85;

    if (bucket === 'LOW') {
      risk_score = 20 + ((idCounter * 7) % 19); // 20-38
      pd = Number((risk_score * 0.2 + 0.5).toFixed(1));
      rev_growth = Number((6 + ((idCounter * 11) % 14)).toFixed(1));
      cf_volatility = Number((18 + ((idCounter * 5) % 16)).toFixed(1));
      delay_days = 7 + (idCounter % 8);
      dscr = Number((1.75 + (idCounter % 8) * 0.1).toFixed(2));
      debt_ratio = Number((0.18 + (idCounter % 5) * 0.03).toFixed(2));
      health = 'Healthy';
      trend = idCounter % 2 === 0 ? 'improving' : 'stable';
      rev_stab = 84 + (idCounter % 12);
      cf_stab = 82 + (idCounter % 13);
    } else if (bucket === 'MODERATE') {
      risk_score = 42 + ((idCounter * 13) % 26); // 42-67
      pd = Number((risk_score * 0.28 + 0.8).toFixed(1));
      rev_growth = Number((-2 + ((idCounter * 9) % 10)).toFixed(1));
      cf_volatility = Number((42 + ((idCounter * 7) % 22)).toFixed(1));
      delay_days = 18 + (idCounter % 12);
      dscr = Number((1.22 + (idCounter % 6) * 0.07).toFixed(2));
      debt_ratio = Number((0.34 + (idCounter % 5) * 0.03).toFixed(2));
      health = risk_score > 58 ? 'Watch' : 'Healthy';
      trend = idCounter % 3 === 0 ? 'deteriorating' : 'stable';
      rev_stab = 68 + (idCounter % 12);
      cf_stab = 64 + (idCounter % 13);
    } else {
      risk_score = 71 + ((idCounter * 11) % 20); // 71-90
      pd = Number((risk_score * 0.38 + 1.2).toFixed(1));
      rev_growth = Number((-14 + (idCounter % 8)).toFixed(1));
      cf_volatility = Number((70 + (idCounter % 20)).toFixed(1));
      delay_days = 32 + (idCounter % 20);
      dscr = Number((0.85 + (idCounter % 5) * 0.05).toFixed(2));
      debt_ratio = Number((0.52 + (idCounter % 5) * 0.04).toFixed(2));
      health = 'Critical';
      trend = 'deteriorating';
      rev_stab = 50 + (idCounter % 12);
      cf_stab = 46 + (idCounter % 12);
    }

    const ann_rev = 40000000 + (idCounter % 15) * 8000000;
    const mo_rev = Math.round(ann_rev / 12);
    const inflow = Math.round(mo_rev * (bucket === 'LOW' ? 1.05 : bucket === 'MODERATE' ? 0.98 : 0.92));
    const outflow = Math.round(mo_rev * (bucket === 'LOW' ? 0.88 : bucket === 'MODERATE' ? 0.95 : 1.05));

    result.push({
      msme_id,
      business_name: name,
      sector: sectors[sIdx],
      business_age: Number((2.0 + (idCounter % 12) * 1.1).toFixed(1)),
      city: regions[rIdx].city,
      region: regions[rIdx].region,
      annual_revenue: ann_rev,
      monthly_revenue: mo_rev,
      cash_inflow: inflow,
      cash_outflow: outflow,
      revenue_growth: rev_growth,
      cashflow_volatility: cf_volatility,
      invoice_frequency: 60 + (idCounter % 35),
      payment_delay_days: delay_days,
      debt_ratio,
      dscr,
      customer_concentration: bucket === 'HIGH' ? 'High' : bucket === 'MODERATE' ? 'Moderate' : 'Low',
      supplier_concentration: bucket === 'HIGH' ? 'High' : 'Moderate',
      business_activity: bucket === 'LOW' ? 90 : bucket === 'MODERATE' ? 76 : 60,
      transaction_consistency: bucket === 'LOW' ? 88 : bucket === 'MODERATE' ? 72 : 56,
      revenue_stability: rev_stab,
      cash_flow_stability: cf_stab,
      invoice_consistency: bucket === 'LOW' ? 90 : bucket === 'MODERATE' ? 76 : 62,
      payment_behavior: bucket === 'LOW' ? 92 : bucket === 'MODERATE' ? 72 : 55,
      transaction_volatility: bucket === 'LOW' ? 'Low' : bucket === 'MODERATE' ? 'Moderate' : 'High',
      traditional_credit_score: bucket === 'LOW' ? 760 : bucket === 'MODERATE' ? 665 : 590,
      risk_score,
      probability_of_default: pd,
      risk_segment: bucket,
      cash_reserve: Math.round(mo_rev * (bucket === 'LOW' ? 0.9 : bucket === 'MODERATE' ? 0.45 : 0.2)),
      loan_exposure: Math.round(ann_rev * 0.08),
      cash_flow_health: health,
      trend,
      recent_alert: null
    });
  }

  while (currentLow < targetLow) {
    addSynthetic('LOW');
    currentLow++;
  }
  while (currentMod < targetMod) {
    addSynthetic('MODERATE');
    currentMod++;
  }
  while (currentHigh < targetHigh) {
    addSynthetic('HIGH');
    currentHigh++;
  }

  return result;
}

export const SEEDED_DATASET = buildDeterministicDataset();

export const FALLBACK_OVERVIEW: OverviewData = {
  kpis: {
    total_msmes: 127,
    low_risk: 54,
    moderate_risk: 49,
    high_risk: 24,
    average_risk_score: 57.4,
    portfolio_at_risk: 18.6
  },
  risk_distribution: [
    { name: 'Low Risk', value: 54, color: '#22A477', range: '0-39' },
    { name: 'Moderate Risk', value: 49, color: '#E8A23A', range: '40-69' },
    { name: 'High Risk', value: 24, color: '#EF5350', range: '70-100' }
  ],
  risk_trend: [
    { month: 'May', avg_risk: 55.2, portfolio_at_risk: 16.8, high_risk_count: 21 },
    { month: 'Jun', avg_risk: 55.8, portfolio_at_risk: 17.1, high_risk_count: 22 },
    { month: 'Jul', avg_risk: 56.4, portfolio_at_risk: 17.5, high_risk_count: 22 },
    { month: 'Aug', avg_risk: 56.9, portfolio_at_risk: 17.9, high_risk_count: 23 },
    { month: 'Sep', avg_risk: 57.1, portfolio_at_risk: 18.2, high_risk_count: 23 },
    { month: 'Oct', avg_risk: 57.4, portfolio_at_risk: 18.6, high_risk_count: 24 }
  ],
  cash_flow_health: {
    healthy: 68,
    watch: 38,
    critical: 21
  },
  top_risk_drivers: [
    { driver: 'Cash-flow volatility', prevalence: 42, avg_impact: '+18 pts', severity: 'High' },
    { driver: 'Revenue decline', prevalence: 36, avg_impact: '+15 pts', severity: 'High' },
    { driver: 'Debt burden', prevalence: 31, avg_impact: '+12 pts', severity: 'Medium' },
    { driver: 'Payment delays', prevalence: 28, avg_impact: '+10 pts', severity: 'Medium' },
    { driver: 'Customer concentration', prevalence: 22, avg_impact: '+7 pts', severity: 'Medium' }
  ],
  recent_alerts: [
    {
      id: 1,
      msme_id: 'MSME-1042',
      business_name: 'Metro Auto Parts',
      sector: 'Automotive Components',
      alert: 'Risk increased from 61 → 68',
      severity: 'high',
      category: 'Score Degradation',
      timestamp: '2 hours ago'
    },
    {
      id: 2,
      msme_id: 'MSME-1006',
      business_name: 'Nova Traders',
      sector: 'Logistics & Warehousing',
      alert: 'Cash-flow warning: Outflow exceeded inflow for 2 consecutive cycles',
      severity: 'high',
      category: 'Liquidity Alert',
      timestamp: '5 hours ago'
    },
    {
      id: 3,
      msme_id: 'MSME-1007',
      business_name: 'KJ Textiles',
      sector: 'Textiles & Apparel',
      alert: 'Revenue trend deteriorating: -11.5% YoY contraction',
      severity: 'critical',
      category: 'Solvency Alert',
      timestamp: '1 day ago'
    }
  ],
  demo_mode: true,
  system_status: 'All systems operational'
};

export const METRO_EXPLANATION: RiskExplanation = {
  model_name: 'CrediLens Risk Engine v1.0',
  method: 'Model Explanation — Demo Model',
  disclaimer: "The explanation shows which business signals contributed most to the model's predicted risk.",
  base_value: 50.0,
  predicted_score: 68,
  risk_increasing: [
    { factor: 'Cash-flow volatility', contribution: 18, detail: 'High month-over-month inflow/outflow fluctuation over last 6 months' },
    { factor: 'Revenue decline', contribution: 15, detail: 'YoY contraction of -8.2% in primary component line' },
    { factor: 'Debt burden', contribution: 12, detail: 'Debt-to-revenue ratio elevated at 0.44' },
    { factor: 'Payment delays', contribution: 10, detail: 'Average receivables turnaround slowed to 28 days' },
    { factor: 'Supplier concentration', contribution: 6, detail: 'Moderate dependence on single tier-2 raw material distributor' }
  ],
  risk_reducing: [
    { factor: 'Business activity', contribution: -11, detail: 'Consistent weekly digital invoice & e-way bill generation' },
    { factor: 'Stable transaction frequency', contribution: -8, detail: 'High repeat customer counterparty density' },
    { factor: 'Improved supplier payments', contribution: -5, detail: 'Zero vendor defaults over trailing 12 months' }
  ]
};

export const METRO_CASHFLOW: CashFlowResponse = {
  series: [
    { month: 'Jul', inflow: 8.5, outflow: 7.0, net: 1.5, type: 'actual', confidence_low: 1.5, confidence_high: 1.5 },
    { month: 'Aug', inflow: 8.3, outflow: 7.1, net: 1.2, type: 'actual', confidence_low: 1.2, confidence_high: 1.2 },
    { month: 'Sep', inflow: 8.2, outflow: 7.0, net: 1.2, type: 'actual', confidence_low: 1.2, confidence_high: 1.2 },
    { month: 'Oct', inflow: 8.4, outflow: 6.9, net: 1.5, type: 'actual', confidence_low: 1.5, confidence_high: 1.5 },
    { month: 'Nov', inflow: 8.1, outflow: 7.3, net: 0.8, type: 'actual', confidence_low: 0.8, confidence_high: 0.8 },
    { month: 'Dec', inflow: 7.2, outflow: 7.6, net: -0.4, type: 'forecast', confidence_low: -0.8, confidence_high: 0.0 },
    { month: 'Jan', inflow: 7.8, outflow: 7.1, net: 0.7, type: 'forecast', confidence_low: 0.2, confidence_high: 1.2 },
    { month: 'Feb', inflow: 8.6, outflow: 7.2, net: 1.4, type: 'forecast', confidence_low: 0.9, confidence_high: 1.9 },
    { month: 'Mar', inflow: 9.1, outflow: 7.4, net: 1.7, type: 'forecast', confidence_low: 1.1, confidence_high: 2.3 }
  ],
  table_data: [
    { month: 'Oct', inflow: '₹8.4L', outflow: '₹6.9L', net: '₹1.5L', status: 'Positive' },
    { month: 'Nov', inflow: '₹8.1L', outflow: '₹7.3L', net: '₹0.8L', status: 'Positive' },
    { month: 'Dec', inflow: '₹7.2L', outflow: '₹7.6L', net: '-₹0.4L', status: 'Deficit Warning' },
    { month: 'Jan', inflow: '₹7.8L', outflow: '₹7.1L', net: '₹0.7L', status: 'Recovering' },
    { month: 'Feb', inflow: '₹8.6L', outflow: '₹7.2L', net: '₹1.4L', status: 'Positive' },
    { month: 'Mar', inflow: '₹9.1L', outflow: '₹7.4L', net: '₹1.7L', status: 'Positive' }
  ],
  forecast_insight: 'Cash pressure is expected in December due to seasonal revenue decline and increased operating expenses.',
  burn_runway: '2.8 months under current net margin trend',
  min_reserve_month: 'December (-₹0.4L net cash flow)',
  methodology: 'ARIMA-Adjusted Cash Trend Forecast with Working Capital Seasonality'
};

export const FALLBACK_FAIRNESS: FairnessResponse = {
  fairness_status: 'MONITOR',
  audit_timestamp: 'Real-time Synthetic Audit',
  disclaimer: 'Fairness audit based on the current synthetic demonstration dataset. Do not use protected/sensitive personal characteristics for actual lending decisions.',
  explanation: 'The monitor compares model behavior across synthetic groups to identify potential disparities.',
  cohorts: [
    {
      partition_type: 'Regional Cohort Audit',
      groups: [
        {
          group_name: 'Group A (Region A)',
          group_label: 'Synthetic Region A',
          sample_size: 68,
          recommendation_rate: 71.0,
          average_risk_score: 42.0,
          false_positive_rate: 8.2,
          false_negative_rate: 5.4
        },
        {
          group_name: 'Group B (Region B)',
          group_label: 'Synthetic Region B',
          sample_size: 59,
          recommendation_rate: 68.0,
          average_risk_score: 45.0,
          false_positive_rate: 9.1,
          false_negative_rate: 6.1
        }
      ],
      disparate_impact_ratio: 0.958,
      parity_threshold: 0.80,
      status: 'Within Parity (0.96 > 0.80)',
      assessment: 'Recommendation rates across synthetic regional clusters remain within the four-fifths fairness threshold.'
    },
    {
      partition_type: 'Firm Maturity Cohort Audit',
      groups: [
        {
          group_name: 'Business Age < 5 Years',
          group_label: 'Younger MSMEs (< 5 yrs)',
          sample_size: 47,
          recommendation_rate: 64.5,
          average_risk_score: 52.8,
          false_positive_rate: 9.4,
          false_negative_rate: 6.8
        },
        {
          group_name: 'Business Age ≥ 5 Years',
          group_label: 'Established MSMEs (≥ 5 yrs)',
          sample_size: 80,
          recommendation_rate: 73.2,
          average_risk_score: 43.6,
          false_positive_rate: 7.9,
          false_negative_rate: 4.9
        }
      ],
      disparate_impact_ratio: 0.881,
      parity_threshold: 0.80,
      status: 'Monitored Parity (0.88 > 0.80)',
      assessment: 'Younger enterprises show slightly higher variance in cash volatility; compensated by invoice consistency features.'
    }
  ]
};

export const FALLBACK_MODEL_METRICS: ModelMetricsResponse = {
  model_version: 'CrediLens Risk Engine v1.0',
  model_type: 'Gradient Boosting Classifier',
  features_count: 18,
  training_records: '2,500 synthetic records',
  metrics: {
    roc_auc: 0.86,
    precision: 0.79,
    recall: 0.74,
    f1: 0.76,
    training_records: 2500,
    model_version: 'v1.0-gbc',
    is_synthetic: true,
    status: 'Operational'
  },
  feature_importances: [
    { feature: 'Cash Flow Volatility', importance: 0.26, category: 'Alternative Cash Flow' },
    { feature: 'Revenue Trend', importance: 0.21, category: 'Growth & Scale' },
    { feature: 'Debt-to-Cash Ratio', importance: 0.17, category: 'Solvency' },
    { feature: 'Payment Delays', importance: 0.14, category: 'Counterparty Behavior' },
    { feature: 'Invoice Consistency', importance: 0.12, category: 'Transaction Density' },
    { feature: 'Business Activity', importance: 0.10, category: 'Operational Signal' }
  ],
  disclaimer: 'DEMO/SYNTHETIC MODEL METRICS: Evaluated on synthetic enterprise validation split.'
};

// Deterministic stress simulation in TypeScript fallback
export function simulateStressFallback(inputs: SimulationInputs, msme: MSME): SimulationResponse {
  const isMetro = msme.msme_id === 'MSME-1042';

  let risk_score = 68;
  let probability_of_default = 18.7;
  let cash_reserve = 4.2;
  let dscr = 1.24;
  let risk_segment = 'MODERATE';
  let stress_result = 'The selected scenario increases financial pressure and moves the borrower into a higher-risk segment.';
  let scenario_name = 'Custom Scenario';

  // Check presets
  if (isMetro && Math.abs(inputs.revenue_change - (-10)) < 0.1 && Math.abs(inputs.cost_change - 8) < 0.1 && Math.abs(inputs.interest_change - 2) < 0.1 && Math.abs(inputs.payment_delay_days - 15) < 0.1) {
    // Moderate stress exact prompt specs
    scenario_name = 'Moderate Stress';
    risk_score = 72;
    probability_of_default = 21.8;
    cash_reserve = 3.1;
    dscr = 1.12;
    risk_segment = 'MODERATE-HIGH';
    stress_result = 'The selected scenario increases financial pressure and moves the borrower into a higher-risk segment.';
  } else if (isMetro && Math.abs(inputs.revenue_change - (-20)) < 0.1 && Math.abs(inputs.cost_change - 15) < 0.1 && Math.abs(inputs.interest_change - 4) < 0.1 && Math.abs(inputs.payment_delay_days - 30) < 0.1) {
    // Severe stress exact prompt specs
    scenario_name = 'Severe Stress';
    risk_score = 84;
    probability_of_default = 34.6;
    cash_reserve = 1.4;
    dscr = 0.91;
    risk_segment = 'HIGH';
    stress_result = 'The selected scenario creates severe liquidity stress, breaching debt coverage covenants (DSCR < 1.0x).';
  } else if (isMetro && Math.abs(inputs.revenue_change - 3) < 0.1 && Math.abs(inputs.cost_change - 2) < 0.1 && Math.abs(inputs.interest_change - 0) < 0.1 && Math.abs(inputs.payment_delay_days - 0) < 0.1) {
    // Stable economy
    scenario_name = 'Stable Economy';
    risk_score = 64;
    probability_of_default = 16.2;
    cash_reserve = 4.6;
    dscr = 1.31;
    risk_segment = 'MODERATE';
    stress_result = 'The business operates within stable parameters with positive cash generation.';
  } else {
    // Dynamic formula
    const baseScore = msme.risk_score;
    const revImpact = -inputs.revenue_change * 0.45;
    const costImpact = inputs.cost_change * 0.3;
    const intImpact = inputs.interest_change * 1.5;
    const delayImpact = inputs.payment_delay_days * 0.25;

    const delta = revImpact + costImpact + intImpact + delayImpact;
    risk_score = Math.min(95, Math.max(15, Math.round(baseScore + delta * 0.6)));
    probability_of_default = Number((risk_score * 0.38).toFixed(1));
    dscr = Math.max(0.4, Number((msme.dscr * (1 - (inputs.cost_change + Math.abs(inputs.revenue_change)) * 0.008)).toFixed(2)));
    const currReserve = isMetro ? 4.2 : msme.cash_reserve / 100000;
    cash_reserve = Math.max(0.5, Number((currReserve - (inputs.payment_delay_days * 0.05 + inputs.cost_change * 0.04)).toFixed(1)));
    risk_segment = risk_score >= 70 ? 'HIGH' : risk_score >= 40 ? 'MODERATE' : 'LOW';
    stress_result = risk_score > baseScore + 6 
      ? 'The selected scenario increases financial pressure and moves the borrower into a higher-risk segment.'
      : 'The borrower exhibits operational resilience under current parametric adjustments.';
  }

  return {
    msme_id: msme.msme_id,
    business_name: msme.business_name,
    current_state: {
      risk_score: msme.risk_score,
      probability_of_default: msme.probability_of_default,
      cash_reserve: isMetro ? 4.2 : msme.cash_reserve / 100000,
      dscr: msme.dscr,
      risk_segment: msme.risk_segment
    },
    simulation_inputs: inputs,
    simulated_state: {
      scenario_name,
      risk_score,
      probability_of_default,
      cash_reserve,
      dscr,
      risk_segment,
      stress_result,
      dscr_status: dscr < 1.15 ? 'Vulnerable' : 'Adequate',
      liquidity_strain: `Receivables impact: ₹${(inputs.payment_delay_days * 0.08).toFixed(2)}L working capital drag`
    }
  };
}

// Deterministic loan impact calculation fallback
export function calculateLoanImpactFallback(
  msme: MSME,
  loanAmount: number,
  interestRate: number,
  tenureMonths: number
): LoanImpactResponse {
  const isMetro = msme.msme_id === 'MSME-1042';

  const r = (interestRate / 100) / 12;
  const n = tenureMonths;
  const emi = r > 0 ? (loanAmount * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1) : loanAmount / n;

  if (isMetro && Math.abs(loanAmount - 1000000) < 1000 && Math.abs(interestRate - 12) < 0.1 && tenureMonths === 24) {
    return {
      loan_amount: loanAmount,
      interest_rate: interestRate,
      tenure_months: tenureMonths,
      estimated_emi: Math.round(emi),
      formatted_emi: `₹${Math.round(emi).toLocaleString('en-IN')}`,
      current: {
        risk_score: 68,
        dscr: 1.24,
        cash_reserve: 4.2,
        risk_segment: 'MODERATE'
      },
      after_loan: {
        risk_score: 73,
        dscr: 1.09,
        cash_reserve: 2.8,
        risk_segment: 'MODERATE-HIGH'
      },
      delta: {
        risk_score: 5,
        dscr: -0.15,
        cash_reserve: -1.4
      },
      underwriting_note: 'Proposed debt facility compresses DSCR to 1.09x, approaching the 1.10x floor. Recommend credit enhancement or personal guarantee.'
    };
  }

  const currReserve = isMetro ? 4.2 : msme.cash_reserve / 100000;
  const newDscr = Number(Math.max(0.5, msme.dscr - (loanAmount / msme.annual_revenue) * 1.4).toFixed(2));
  const newReserve = Number(Math.max(0.5, currReserve - (emi * 3) / 100000).toFixed(1));
  const newScore = Math.min(95, Math.round(msme.risk_score + (msme.dscr - newDscr) * 28));

  return {
    loan_amount: loanAmount,
    interest_rate: interestRate,
    tenure_months: tenureMonths,
    estimated_emi: Math.round(emi),
    formatted_emi: `₹${Math.round(emi).toLocaleString('en-IN')}`,
    current: {
      risk_score: msme.risk_score,
      dscr: msme.dscr,
      cash_reserve: currReserve,
      risk_segment: msme.risk_segment
    },
    after_loan: {
      risk_score: newScore,
      dscr: newDscr,
      cash_reserve: newReserve,
      risk_segment: newScore >= 70 ? 'HIGH' : newScore >= 40 ? 'MODERATE' : 'LOW'
    },
    delta: {
      risk_score: newScore - msme.risk_score,
      dscr: Number((newDscr - msme.dscr).toFixed(2)),
      cash_reserve: Number((newReserve - currReserve).toFixed(1))
    },
    underwriting_note: `DSCR shifts to ${newDscr}x with an incremental monthly EMI commitment of ₹${Math.round(emi).toLocaleString('en-IN')}.`
  };
}

// Generate Credit Intelligence Report fallback
export function generateReportFallback(msme: MSME): CreditIntelligenceReport {
  const isMetro = msme.msme_id === 'MSME-1042';

  return {
    report_id: `REP-${msme.msme_id}-2026`,
    generated_at: 'September 30, 2026',
    business_name: msme.business_name,
    msme_id: msme.msme_id,
    sector: msme.sector,
    business_age: `${msme.business_age} Years`,
    risk_score: `${msme.risk_score}/100`,
    risk_segment: isMetro ? 'Moderate-High' : msme.risk_segment,
    probability_of_default: `${msme.probability_of_default}%`,
    dscr: `${msme.dscr}x`,
    primary_risk_drivers: [
      '1. Cash-flow volatility (MoM fluctuation in operating reserves)',
      isMetro ? '2. Revenue decline (-8.2% YoY trend in core products)' : '2. Revenue trend deceleration',
      '3. Debt burden (Elevated debt-to-revenue servicing ratio)'
    ],
    positive_signals: [
      '1. Stable transactions (High repeat counterparty density)',
      '2. Business continuity (Active e-way bills and operational history)',
      '3. Improving supplier payments (Zero trade defaults recorded)'
    ],
    cash_flow_outlook: msme.cash_flow_health,
    cash_flow_insight: isMetro 
      ? 'Cash pressure is expected in December due to seasonal revenue decline and increased operating expenses.'
      : 'Operating cash flow reflects seasonal buffer depletion in Q3 before projected recovery.',
    stress_test_summary: isMetro 
      ? 'Moderate Stress → Elevated Risk (DSCR compresses to 1.12x; Risk Score +4)'
      : 'Stress simulations show moderate margin sensitivity under increased working capital delays.',
    decision_support: 'Enhanced underwriting review',
    decision_guidance: 'Recommended for decision support with collateral enhancement or structured working capital limits. Do not execute automatic approval/rejection.',
    disclaimer: 'DEMONSTRATION REPORT: Generated using synthetic alternative data signals and predictive machine learning models. Designed exclusively as a human-in-the-loop decision support system.'
  };
}

export function sendChatFallback(message: string, currentBorrower: MSME): ChatResponse {
  const msgLower = message.toLowerCase().trim();
  const disclaimer = "This assistant explains synthetic demonstration data and model outputs. It does not make lending decisions.";

  // Check if query targets a specific MSME
  let target = currentBorrower;
  for (const m of SEEDED_DATASET) {
    if (msgLower.includes(m.business_name.toLowerCase()) || msgLower.includes(m.msme_id.toLowerCase())) {
      target = m;
      break;
    }
  }

  const isMetro = target.msme_id === 'MSME-1042';
  const sources = [`${target.business_name} Profile (${target.msme_id})`];

  // 1. Why risky / factors / score
  if (['why', 'score', 'risky', 'factor', 'contributor', 'increase', 'reduce', 'explanation'].some(k => msgLower.includes(k)) &&
      !['fairness', 'model', 'auc'].some(k => msgLower.includes(k))) {
    sources.push('CrediLens Risk Engine Attribution');
    const reply = `**${target.business_name} (${target.msme_id})** has an assigned risk score of **${target.risk_score}/100** (${target.risk_segment} Risk) with an estimated **${target.probability_of_default}% Probability of Default**.\n\n` +
      `### Primary Risk-Increasing Drivers:\n` +
      `  • **Cash-flow volatility** (+18 pts): High month-over-month inflow/outflow fluctuation over last 6 months\n` +
      `  • **Revenue decline** (+15 pts): YoY contraction of ${target.revenue_growth}% in primary component line\n` +
      `  • **Debt burden** (+12 pts): Debt ratio at ${target.debt_ratio} with debt-servicing pressure\n` +
      `  • **Payment delays** (+10 pts): Receivables cycle slowed to ${target.payment_delay_days} days\n\n` +
      `### Operational Mitigants:\n` +
      `  • **Business activity** (-11 pts): Consistent digital invoice generation\n` +
      `  • **Stable transaction frequency** (-8 pts): High repeat counterparty density\n` +
      `  • **Improved supplier payments** (-5 pts): Zero trade defaults recorded\n\n` +
      `**Underwriting Assessment**: While operational throughput remains resilient, elevated cash-flow volatility places the borrower in the **${target.cash_flow_health}** category, warranting enhanced underwriting review.`;

    return { reply, data_sources: sources, mode: 'demo', borrower_id: target.msme_id, disclaimer };
  }

  // 2. DSCR / Debt
  if (['dscr', 'debt', 'coverage', 'servicing'].some(k => msgLower.includes(k))) {
    sources.push('Solvency & Coverage Analysis');
    const reply = `**Debt Service Coverage Ratio (DSCR)** measures an enterprise's ability to cover scheduled principal and interest payments from operating cash flow.\n\n` +
      `• **Current DSCR for ${target.business_name}**: **${target.dscr}x** (Operating cash buffer: ${target.dscr < 1.15 ? 'Compressed' : 'Adequate'}).\n` +
      `• **Regulatory & Commercial Benchmark**: Commercial lenders typically target a floor of **1.25x** for unsecured commercial lines.\n` +
      `• **Significance**: At ${target.dscr}x, operating cash margins can cover debt obligations, but sensitivity tests show that an 8% cost hike compresses DSCR to 1.12x, near the conservative 1.10x floor.`;

    return { reply, data_sources: sources, mode: 'demo', borrower_id: target.msme_id, disclaimer };
  }

  // 3. Cash Flow / Forecast / December
  if (['cash flow', 'cash-flow', 'forecast', 'december', 'liquidity', 'runway', 'inflow'].some(k => msgLower.includes(k))) {
    sources.push('Cash Flow Forecasting Engine');
    const reply = `**Cash Flow Forecast for ${target.business_name}**:\n\n` +
      `> *"${METRO_CASHFLOW.forecast_insight}"*\n\n` +
      `**6-Month Trajectory (₹ Lakhs)**:\n` +
      `  • **Oct**: Inflow ₹8.4L | Outflow ₹6.9L | Net **₹1.5L** (Positive)\n` +
      `  • **Nov**: Inflow ₹8.1L | Outflow ₹7.3L | Net **₹0.8L** (Positive)\n` +
      `  • **Dec**: Inflow ₹7.2L | Outflow ₹7.6L | Net **-₹0.4L** (Deficit Trough)\n` +
      `  • **Jan**: Inflow ₹7.8L | Outflow ₹7.1L | Net **₹0.7L** (Recovering)\n` +
      `  • **Feb**: Inflow ₹8.6L | Outflow ₹7.2L | Net **₹1.4L** (Positive)\n` +
      `  • **Mar**: Inflow ₹9.1L | Outflow ₹7.4L | Net **₹1.7L** (Positive)\n\n` +
      `• **Trough Month**: December (-₹0.4L net cash flow)\n` +
      `• **Liquidity Runway**: 2.8 months under current net margin trend`;

    return { reply, data_sources: sources, mode: 'demo', borrower_id: target.msme_id, disclaimer };
  }

  // 4. What-If / Stress / Moderate / Severe
  if (['what-if', 'what if', 'stress', 'simulation', 'moderate stress', 'severe stress', 'scenario'].some(k => msgLower.includes(k))) {
    sources.push('What-If Economic Stress Simulator');
    const isSevere = msgLower.includes('severe');
    const simScore = isSevere ? 84 : 72;
    const simPd = isSevere ? 34.6 : 21.8;
    const simDscr = isSevere ? 0.91 : 1.12;
    const simReserve = isSevere ? 1.4 : 3.1;
    const scenName = isSevere ? 'Severe Stress (-20% Rev, +15% Cost, +4% Int, +30d Delay)' : 'Moderate Stress (-10% Rev, +8% Cost, +2% Int, +15d Delay)';

    const reply = `### What-If Lab Simulation Results for ${target.business_name}\n` +
      `**Scenario Tested**: ${scenName}\n\n` +
      `| Metric | Baseline | Stress Scenario | Impact |\n` +
      `| :--- | :--- | :--- | :--- |\n` +
      `| **Risk Score** | ${target.risk_score} | **${simScore}** | +${simScore - target.risk_score} pts |\n` +
      `| **Prob. of Default (PD)** | ${target.probability_of_default}% | **${simPd}%** | +${(simPd - target.probability_of_default).toFixed(1)}% |\n` +
      `| **DSCR** | ${target.dscr}x | **${simDscr}x** | ${(simDscr - target.dscr).toFixed(2)}x |\n` +
      `| **Cash Reserve** | ₹4.2L | **₹${simReserve}L** | -₹${(4.2 - simReserve).toFixed(1)}L |\n\n` +
      `> **Stress Result**: *"The selected scenario increases financial pressure and moves the borrower into a higher-risk segment."*`;

    return { reply, data_sources: sources, mode: 'demo', borrower_id: target.msme_id, disclaimer };
  }

  // 5. Highest Risk / Portfolio
  if (['highest risk', 'top risk', 'riskiest', 'portfolio', 'overview', 'which msme'].some(k => msgLower.includes(k))) {
    sources.push('Portfolio Registry (127 MSMEs)');
    const reply = `### Portfolio Risk Summary (127 MSMEs)\n` +
      `• **Total MSMEs**: 127\n` +
      `• **Low Risk (0-39)**: 54 MSMEs (42.5%)\n` +
      `• **Moderate Risk (40-69)**: 49 MSMEs (38.6%)\n` +
      `• **High Risk (70-100)**: 24 MSMEs (18.9%)\n` +
      `• **Average Risk Score**: 57.4 / 100\n` +
      `• **Portfolio at Risk (PAR)**: 18.6%\n\n` +
      `**Top Flagged High-Risk Borrowers**:\n` +
      `  1. **KJ Textiles** (MSME-1007) — Score: **82**, PD: 32.8% (Revenue trend deteriorating: -11.5% YoY)\n` +
      `  2. **Nova Traders** (MSME-1006) — Score: **74**, PD: 24.5% (Cash-flow warning: Outflows exceeded inflows)\n` +
      `  3. **Metro Auto Parts** (MSME-1042) — Score: **68**, PD: 18.7% (Moderate-High Risk, elevated volatility)`;

    return { reply, data_sources: sources, mode: 'demo', borrower_id: target.msme_id, disclaimer };
  }

  // 6. Model / Performance / ROC-AUC
  if (['model', 'performance', 'auc', 'roc', 'f1', 'accuracy', 'precision', 'recall'].some(k => msgLower.includes(k))) {
    sources.push('CrediLens Risk Engine Observability');
    const reply = `### Model Performance Observability\n` +
      `• **Engine Version**: CrediLens Risk Engine v1.0\n` +
      `• **Model Architecture**: Gradient Boosting Classifier (GBC)\n` +
      `• **Training Dataset**: 2,500 synthetic MSME validation records\n\n` +
      `**Validation Performance**:\n` +
      `• **ROC-AUC**: **0.86**\n` +
      `• **Precision**: **0.79**\n` +
      `• **Recall**: **0.74**\n` +
      `• **F1-Score**: **0.76**\n\n` +
      `**Top Features by Gini Importance**:\n` +
      `  • Cash Flow Volatility: **26%**\n` +
      `  • Revenue Trend: **21%**\n` +
      `  • Debt-to-Cash Ratio: **17%**\n` +
      `  • Payment Delays: **14%**\n` +
      `  • Invoice Consistency: **12%**\n` +
      `  • Business Activity: **10%**`;

    return { reply, data_sources: sources, mode: 'demo', borrower_id: target.msme_id, disclaimer };
  }

  // 7. Fairness / Bias
  if (['fairness', 'bias', 'parity', 'audit', 'cohort'].some(k => msgLower.includes(k))) {
    sources.push('Fairness & Bias Monitor');
    const reply = `### Fairness & Bias Audit Summary\n` +
      `**Fairness Status**: **MONITOR**\n\n` +
      `• **Regional Cohort Audit**:\n` +
      `  - Group A (Western/Northern): Rec Rate 71%, Avg Risk 42, FPR 8.2%\n` +
      `  - Group B (Southern/Eastern): Rec Rate 68%, Avg Risk 45, FPR 9.1%\n` +
      `  - **Disparate Impact Ratio**: **0.958** (Well above the 0.80 parity threshold)\n\n` +
      `• **Firm Maturity Cohort Audit**:\n` +
      `  - Business Age < 5 Years: Rec Rate 64.5%, Avg Risk 52.8\n` +
      `  - Business Age ≥ 5 Years: Rec Rate 73.2%, Avg Risk 43.6\n` +
      `  - **Disparate Impact Ratio**: **0.881** (Within monitored tolerance)\n\n` +
      `*Notice: Fairness audits are evaluated across synthetic evaluation partitions. Protected personal characteristics are strictly excluded.*`;

    return { reply, data_sources: sources, mode: 'demo', borrower_id: target.msme_id, disclaimer };
  }

  // Default contextual summary
  const reply = `I am analyzing **${target.business_name} (${target.msme_id})** in the **${target.sector}** sector.\n\n` +
    `• **Risk Score**: **${target.risk_score}/100** (${target.risk_segment} Risk)\n` +
    `• **Probability of Default**: **${target.probability_of_default}%**\n` +
    `• **Debt Service Coverage (DSCR)**: **${target.dscr}x**\n` +
    `• **Cash Flow Health**: **${target.cash_flow_health}**\n\n` +
    `Feel free to ask me:\n` +
    `• *"Why is this borrower risky?"*\n` +
    `• *"Explain the cash-flow forecast."*\n` +
    `• *"What happens under moderate stress?"*\n` +
    `• *"What does DSCR mean for this business?"*\n` +
    `• *"Which MSMEs have the highest risk?"*\n` +
    `• *"Explain the model's performance."*\n` +
    `• *"Summarize the fairness audit."*`;

  return { reply, data_sources: sources, mode: 'demo', borrower_id: target.msme_id, disclaimer };
}

// ================= FINANCIAL INTEGRATIONS FALLBACK DATA =================

import {
  IntegrationSummaryResponse,
  FinancialTransaction,
  SyncRun
} from '../types';

export const FALLBACK_INTEGRATIONS_SUMMARY: IntegrationSummaryResponse = {
  total_integrations: 3,
  connected_integrations: 1,
  awaiting_configuration: 2,
  last_successful_sync: new Date().toISOString(),
  total_imported_transactions: 3,
  overall_health: 'HEALTHY',
  integrations: [
    {
      connection_id: 'conn_razorpay_demo',
      provider: 'razorpay',
      display_name: 'Razorpay Payment Gateway',
      category: 'PAYMENT',
      environment: 'SANDBOX',
      status: 'CONNECTED',
      config_metadata: {
        configured: true,
        mode: 'test',
        masked_key_id: 'rzp_test_••••••••3456',
        api_endpoint: 'https://api.razorpay.com/v1',
        auth_type: 'HTTP Basic Auth'
      },
      last_tested_at: new Date().toISOString(),
      last_synced_at: new Date().toISOString(),
      error_message: null,
      supported_operations: ['configure', 'test_connection', 'sync_data', 'view_transactions', 'view_sync_history'],
      stats: {
        total_records: 2,
        total_amount: 2000.0,
        currency: 'INR',
        status_breakdown: { captured: 2 },
        last_sync_duration_ms: 320
      }
    },
    {
      connection_id: 'conn_bank_aa_demo',
      provider: 'bank_aa',
      display_name: 'Bank Account Aggregator',
      category: 'BANK',
      environment: 'SANDBOX',
      status: 'NOT_CONNECTED',
      config_metadata: {
        configured: false,
        aa_provider: 'sahamati_rebit',
        architecture: 'ReBIT / Sahamati Consent Specification',
        supported_fi_types: ['DEPOSIT', 'TERM_DEPOSIT'],
        requires_consent: true
      },
      last_tested_at: null,
      last_synced_at: null,
      error_message: 'Awaiting provider onboarding. Requires authorized partner credentials (Setu / Finvu / OneMoney).',
      supported_operations: ['configure_provider', 'start_consent_flow', 'check_consent_status', 'sync_bank_data', 'view_transactions', 'view_sync_history'],
      stats: {
        total_records: 0,
        total_amount: 0.0,
        currency: 'INR',
        status_breakdown: {},
        last_sync_duration_ms: null
      }
    },
    {
      connection_id: 'conn_gst_demo',
      provider: 'gst',
      display_name: 'GST Business Data (GSP)',
      category: 'TAX',
      environment: 'SANDBOX',
      status: 'NOT_CONNECTED',
      config_metadata: {
        configured: false,
        provider_type: 'Authorized GST Suvidha Provider (GSP)',
        supported_returns: ['GSTR-1 (Outward B2B Invoices)', 'GSTR-3B (Monthly Summary)'],
        requires_otp_session: true
      },
      last_tested_at: null,
      last_synced_at: null,
      error_message: 'GST Suvidha Provider connection awaiting setup. Accessing private tax returns requires GSP authorization.',
      supported_operations: ['configure_provider', 'test_connection', 'sync_gst_data', 'view_transactions', 'view_sync_history'],
      stats: {
        total_records: 0,
        total_amount: 0.0,
        currency: 'INR',
        status_breakdown: {},
        last_sync_duration_ms: null
      }
    }
  ]
};

export const FALLBACK_FINANCIAL_TRANSACTIONS: FinancialTransaction[] = [
  {
    transaction_id: 'tx_rzp_demo_01',
    provider: 'razorpay',
    external_id: 'pay_test_98A1B2C3D4E5',
    msme_id: 'MSME-1042',
    transaction_date: '2026-03-27T14:32:00Z',
    amount: 750.0,
    currency: 'INR',
    status: 'captured',
    direction: 'INFLOW',
    payment_method: 'upi',
    payer_email: 'buyer.procurement@auto-ancillary.in',
    payer_contact: '+919876543210',
    description: 'Component Supply Settlement (Invoice INV-2026-104)',
    source_environment: 'SANDBOX',
    provenance: 'RAZORPAY_SANDBOX_API',
    sync_run_id: 'sync_rzp_demo_run1',
    created_at: '2026-03-27T14:32:05Z'
  },
  {
    transaction_id: 'tx_rzp_demo_02',
    provider: 'razorpay',
    external_id: 'pay_test_77K8L9M0N1P2',
    msme_id: 'MSME-1042',
    transaction_date: '2026-03-26T11:15:00Z',
    amount: 1250.0,
    currency: 'INR',
    status: 'captured',
    direction: 'INFLOW',
    payment_method: 'card',
    payer_email: 'finance@mahindra-vendor.com',
    payer_contact: '+919811223344',
    description: 'Precision Gear Shaft Sample Payment',
    source_environment: 'SANDBOX',
    provenance: 'RAZORPAY_SANDBOX_API',
    sync_run_id: 'sync_rzp_demo_run1',
    created_at: '2026-03-26T11:15:10Z'
  }
];

export const FALLBACK_SYNC_RUNS: SyncRun[] = [
  {
    sync_run_id: 'sync_rzp_demo_run1',
    connection_id: 'conn_razorpay_demo',
    provider: 'razorpay',
    status: 'SUCCESS',
    records_retrieved: 2,
    records_inserted: 2,
    records_updated: 0,
    records_skipped: 0,
    error_message: null,
    started_at: '2026-03-27T14:35:00Z',
    completed_at: '2026-03-27T14:35:02Z',
    batch_id: 'batch_rzp_demo_001',
    duration_seconds: 2.1
  }
];


