export type RiskSegment = 'LOW' | 'MODERATE' | 'HIGH' | 'Moderate-High';
export type CashFlowHealth = 'Healthy' | 'Watch' | 'Critical';
export type TrendDirection = 'improving' | 'stable' | 'deteriorating';

export interface MSME {
  msme_id: string;
  business_name: string;
  sector: string;
  business_age: number;
  city: string;
  region: string;
  annual_revenue: number;
  monthly_revenue: number;
  cash_inflow: number;
  cash_outflow: number;
  revenue_growth: number;
  cashflow_volatility: number;
  invoice_frequency: number;
  payment_delay_days: number;
  debt_ratio: number;
  dscr: number;
  customer_concentration: string;
  supplier_concentration: string;
  business_activity: number;
  transaction_consistency: number;
  revenue_stability: number;
  cash_flow_stability: number;
  invoice_consistency: number;
  payment_behavior: number;
  transaction_volatility: string;
  traditional_credit_score: number;
  risk_score: number;
  probability_of_default: number;
  risk_segment: RiskSegment;
  cash_reserve: number;
  loan_exposure: number;
  cash_flow_health: CashFlowHealth;
  trend: TrendDirection;
  recent_alert?: string | null;
}

export interface OverviewKPIs {
  total_msmes: number;
  low_risk: number;
  moderate_risk: number;
  high_risk: number;
  average_risk_score: number;
  portfolio_at_risk: number;
}

export interface RiskDistributionItem {
  name: string;
  value: number;
  color: string;
  range: string;
}

export interface RiskTrendItem {
  month: string;
  avg_risk: number;
  portfolio_at_risk: number;
  high_risk_count: number;
}

export interface TopRiskDriver {
  driver: string;
  prevalence: number;
  avg_impact: string;
  severity: 'High' | 'Medium' | 'Low';
}

export interface RiskAlert {
  id: number;
  msme_id: string;
  business_name: string;
  sector: string;
  alert: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  timestamp: string;
}

export interface OverviewData {
  kpis: OverviewKPIs;
  risk_distribution: RiskDistributionItem[];
  risk_trend: RiskTrendItem[];
  cash_flow_health: {
    healthy: number;
    watch: number;
    critical: number;
  };
  top_risk_drivers: TopRiskDriver[];
  recent_alerts: RiskAlert[];
  demo_mode: boolean;
  system_status: string;
}

export interface FactorContribution {
  factor: string;
  contribution: number;
  detail: string;
  description?: string;
}

export interface RiskExplanation {
  model_name: string;
  method: string;
  disclaimer: string;
  base_value: number;
  predicted_score: number;
  risk_increasing: FactorContribution[];
  risk_reducing: FactorContribution[];
}

export interface CashFlowPoint {
  month: string;
  inflow: number;
  outflow: number;
  net: number;
  type: 'actual' | 'forecast';
  confidence_low?: number;
  confidence_high?: number;
}

export interface CashFlowTableItem {
  month: string;
  inflow: string;
  outflow: string;
  net: string;
  status: string;
}

export interface CashFlowResponse {
  series: CashFlowPoint[];
  table_data: CashFlowTableItem[];
  forecast_insight: string;
  burn_runway: string;
  min_reserve_month: string;
  methodology: string;
}

export interface SimulationInputs {
  msme_id: string;
  revenue_change: number;
  cost_change: number;
  interest_change: number;
  payment_delay_days: number;
  loan_amount?: number;
}

export interface SimulationResult {
  scenario_name: string;
  risk_score: number;
  probability_of_default: number;
  cash_reserve: number;
  dscr: number;
  risk_segment: string;
  stress_result: string;
  dscr_status: string;
  liquidity_strain: string;
}

export interface SimulationResponse {
  msme_id: string;
  business_name: string;
  current_state: {
    risk_score: number;
    probability_of_default: number;
    cash_reserve: number;
    dscr: number;
    risk_segment: string;
  };
  simulation_inputs: SimulationInputs;
  simulated_state: SimulationResult;
}

export interface LoanImpactResponse {
  loan_amount: number;
  interest_rate: number;
  tenure_months: number;
  estimated_emi: number;
  formatted_emi: string;
  current: {
    risk_score: number;
    dscr: number;
    cash_reserve: number;
    risk_segment: string;
  };
  after_loan: {
    risk_score: number;
    dscr: number;
    cash_reserve: number;
    risk_segment: string;
  };
  delta: {
    risk_score: number;
    dscr: number;
    cash_reserve: number;
  };
  underwriting_note: string;
}

export interface FairnessGroup {
  group_name: string;
  group_label: string;
  sample_size: number;
  recommendation_rate: number;
  average_risk_score: number;
  false_positive_rate: number;
  false_negative_rate: number;
}

export interface FairnessCohort {
  partition_type: string;
  groups: FairnessGroup[];
  disparate_impact_ratio: number;
  parity_threshold: number;
  status: string;
  assessment: string;
}

export interface FairnessResponse {
  fairness_status: string;
  audit_timestamp: string;
  disclaimer: string;
  explanation: string;
  cohorts: FairnessCohort[];
}

export interface ModelMetricsResponse {
  model_version: string;
  model_type: string;
  features_count: number;
  training_records: string;
  metrics: {
    roc_auc: number;
    precision: number;
    recall: number;
    f1: number;
    training_records: number;
    model_version: string;
    is_synthetic: boolean;
    status: string;
  };
  feature_importances: {
    feature: string;
    importance: number;
    category: string;
  }[];
  disclaimer: string;
}

export interface CreditIntelligenceReport {
  report_id: string;
  generated_at: string;
  business_name: string;
  msme_id: string;
  sector: string;
  business_age: string;
  risk_score: string;
  risk_segment: string;
  probability_of_default: string;
  dscr: string;
  primary_risk_drivers: string[];
  positive_signals: string[];
  cash_flow_outlook: string;
  cash_flow_insight: string;
  stress_test_summary: string;
  decision_support: string;
  decision_guidance: string;
  disclaimer: string;
}

export type ActiveTab = 
  | 'landing'
  | 'overview' 
  | 'portfolio' 
  | 'borrower-analysis' 
  | 'cash-flow' 
  | 'what-if-lab' 
  | 'segmentation' 
  | 'fairness-monitor' 
  | 'model-monitor'
  | 'data-connections'
  | 'data-import'
  | 'data-management';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  data_sources?: string[];
  mode?: 'ai' | 'demo';
  isError?: boolean;
}

export interface ChatResponse {
  reply: string;
  data_sources: string[];
  mode: 'ai' | 'demo';
  borrower_id?: string;
  disclaimer: string;
}

export interface SafeUser {
  user_id: string;
  full_name: string;
  email: string;
  organization?: string | null;
  account_status: string;
  created_at: string;
}

export interface AuthResponse {
  user: SafeUser;
  access_token: string;
  token_type: string;
  message: string;
}

export interface RegisterPayload {
  full_name: string;
  email: string;
  organization?: string;
  password: string;
  confirm_password: string;
  agree_terms: boolean;
}

export interface LoginPayload {
  email: string;
  password: string;
  remember_me?: boolean;
}

export interface RegisterInitiateResponse {
  status: 'pending_verification';
  email: string;
  masked_email: string;
  message: string;
  resend_cooldown_seconds: number;
  expires_in_minutes: number;
}

export interface VerifyRegistrationOtpPayload {
  email: string;
  otp: string;
}

export interface ResendOtpPayload {
  email: string;
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface ForgotPasswordResponse {
  status: 'pending_verification';
  email: string;
  masked_email: string;
  message: string;
  resend_cooldown_seconds: number;
  expires_in_minutes: number;
}

export interface VerifyResetOtpPayload {
  email: string;
  otp: string;
}

export interface VerifyResetOtpResponse {
  reset_token: string;
  message: string;
}

export interface ResetPasswordPayload {
  reset_token: string;
  new_password: string;
  confirm_password: string;
}

export interface StandardMessageResponse {
  message: string;
}

// ================= FINANCIAL DATA INTEGRATION HUB TYPES =================

export type IntegrationCategory = 'PAYMENT' | 'BANK' | 'TAX';
export type IntegrationEnvironment = 'SANDBOX' | 'DEMO' | 'LIVE';
export type IntegrationStatus =
  | 'NOT_CONFIGURED'
  | 'NOT_CONNECTED'
  | 'CONFIGURED'
  | 'TESTING'
  | 'CONNECTED'
  | 'SYNCING'
  | 'SYNCED'
  | 'AWAITING_CONSENT'
  | 'CONSENT_EXPIRED'
  | 'ERROR';

export type SyncStatus = 'STARTED' | 'SUCCESS' | 'PARTIAL' | 'FAILED';
export type TransactionDirection = 'INFLOW' | 'OUTFLOW' | 'CREDIT' | 'DEBIT';

export interface DataConnectionStats {
  total_records: number;
  total_amount: number;
  currency: string;
  status_breakdown: Record<string, number>;
  last_sync_duration_ms?: number | null;
}

export interface DataConnection {
  connection_id: string;
  provider: string;
  display_name: string;
  category: IntegrationCategory;
  environment: IntegrationEnvironment;
  status: IntegrationStatus;
  config_metadata: Record<string, any>;
  last_tested_at?: string | null;
  last_synced_at?: string | null;
  error_message?: string | null;
  supported_operations: string[];
  stats: DataConnectionStats;
}

export interface IntegrationSummaryResponse {
  total_integrations: number;
  connected_integrations: number;
  awaiting_configuration: number;
  last_successful_sync?: string | null;
  total_imported_transactions: number;
  overall_health: 'HEALTHY' | 'DEGRADED' | 'ACTION_REQUIRED' | string;
  integrations: DataConnection[];
}

export interface SyncRun {
  sync_run_id: string;
  connection_id: string;
  provider: string;
  status: SyncStatus;
  records_retrieved: number;
  records_inserted: number;
  records_updated: number;
  records_skipped: number;
  error_message?: string | null;
  started_at: string;
  completed_at?: string | null;
  batch_id: string;
  duration_seconds?: number | null;
}

export interface FinancialTransaction {
  transaction_id: string;
  provider: string;
  external_id: string;
  msme_id?: string | null;
  transaction_date: string;
  amount: number;
  currency: string;
  status: string;
  direction: TransactionDirection;
  payment_method?: string | null;
  payer_email?: string | null;
  payer_contact?: string | null;
  description?: string | null;
  source_environment: IntegrationEnvironment;
  provenance: string;
  sync_run_id?: string | null;
  debit_amount?: number | null;
  credit_amount?: number | null;
  balance?: number | null;
  transaction_type?: string | null;
  validation_status?: string | null;
  file_id?: string | null;
  source?: string | null;
  created_at: string;
}

export interface TransactionsListResponse {
  total: number;
  page: number;
  limit: number;
  transactions: FinancialTransaction[];
  summary: {
    total_amount?: number;
    inflow_count?: number;
    outflow_count?: number;
    successful_count?: number;
  };
}

export interface TestConnectionResponse {
  provider: string;
  success: boolean;
  status: IntegrationStatus;
  message: string;
  tested_at: string;
  details?: Record<string, any> | null;
}

export interface SyncResponse {
  provider: string;
  success: boolean;
  status: IntegrationStatus;
  sync_run: SyncRun;
  message: string;
}

export interface ConfigureProviderPayload {
  environment?: string;
  credentials: Record<string, string>;
}

export interface ConfigureProviderResponse {
  provider: string;
  status: IntegrationStatus;
  message: string;
  config_metadata: Record<string, any>;
}

export interface BankConsentRequestPayload {
  customer_identifier: string;
  msme_id?: string;
  data_scopes?: string[];
  date_range_months?: number;
}

export interface BankConsentResponse {
  consent_id: string;
  provider: string;
  customer_identifier?: string;
  consent_handle: string;
  status: string;
  consent_url?: string | null;
  expires_at: string;
  data_scopes: string[];
  message: string;
}

export type DatasetType =
  | 'BANK_TRANSACTIONS'
  | 'REVENUE_EXPENSES'
  | 'INVOICES'
  | 'LOAN_REPAYMENTS'
  | 'GST_SUMMARY'
  | 'CUSTOM';

export type FileImportStatus =
  | 'PENDING_REVIEW'
  | 'IMPORTED'
  | 'PARTIALLY_IMPORTED'
  | 'REJECTED'
  | 'FAILED';

export interface ImportedFile {
  file_id: string;
  filename: string;
  file_type: string;
  file_size_bytes: number;
  dataset_type: DatasetType;
  total_rows: number;
  valid_rows: number;
  invalid_rows: number;
  duplicate_rows: number;
  warnings_count: number;
  status: FileImportStatus;
  msme_id?: string | null;
  error_report?: Array<{
    row_number: number;
    column?: string;
    raw_value?: string;
    error_type: string;
    message: string;
  }>;
  column_mapping?: Record<string, string>;
  imported_at?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface FilePreviewResult {
  filename: string;
  file_size_bytes: number;
  total_rows_estimate: number;
  detected_columns: string[];
  sample_rows: Record<string, any>[];
  suggested_mapping: Record<string, string>;
  dataset_type: DatasetType;
  credilens_fields: Array<{
    key: string;
    label: string;
    required: boolean;
    description: string;
  }>;
}

export interface FileValidationResult {
  file_id: string;
  filename: string;
  total_rows: number;
  valid_rows: number;
  invalid_rows: number;
  duplicate_rows: number;
  warnings_count: number;
  status: string;
  errors: Array<{
    row_number: number;
    column?: string;
    raw_value?: string;
    error_type: string;
    message: string;
  }>;
  total_errors: number;
  warnings: Array<{
    row_number: number;
    column?: string;
    message: string;
  }>;
  preview_valid_rows: any[];
  can_import: boolean;
}

export interface ImportExecutionResult {
  file_id: string;
  status: string;
  records_inserted: number;
  records_skipped: number;
  message: string;
}

export interface DataManagementSummary {
  total_providers: number;
  connected_providers: number;
  total_imported_files: number;
  total_transactions: number;
  provider_transactions: number;
  imported_file_transactions: number;
  last_sync_time?: string | null;
  last_import_time?: string | null;
  recent_activity: Array<{
    id: string;
    activity_type: 'PROVIDER_SYNC' | 'FILE_IMPORT';
    source_name: string;
    status: string;
    count: number;
    timestamp: string;
    details?: string;
  }>;
  data_quality: {
    valid_rate: number;
    valid_records: number;
    total_records: number;
    status: 'EXCELLENT' | 'GOOD' | 'NEEDS_ATTENTION';
  };
}


