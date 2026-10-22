import {
  MSME,
  OverviewData,
  RiskExplanation,
  CashFlowResponse,
  SimulationInputs,
  SimulationResponse,
  LoanImpactResponse,
  FairnessResponse,
  ModelMetricsResponse,
  CreditIntelligenceReport,
  ChatResponse,
  SafeUser,
  AuthResponse,
  RegisterPayload,
  LoginPayload,
  RegisterInitiateResponse,
  VerifyRegistrationOtpPayload,
  ResendOtpPayload,
  ForgotPasswordPayload,
  ForgotPasswordResponse,
  VerifyResetOtpPayload,
  VerifyResetOtpResponse,
  ResetPasswordPayload,
  StandardMessageResponse,
  IntegrationSummaryResponse,
  DataConnection,
  TestConnectionResponse,
  SyncResponse,
  SyncRun,
  TransactionsListResponse,
  ConfigureProviderPayload,
  ConfigureProviderResponse,
  BankConsentRequestPayload,
  BankConsentResponse,
  ImportedFile,
  FilePreviewResult,
  FileValidationResult,
  ImportExecutionResult,
  DataManagementSummary
} from '../types';
import {
  SEEDED_DATASET,
  FALLBACK_OVERVIEW,
  METRO_EXPLANATION,
  METRO_CASHFLOW,
  FALLBACK_FAIRNESS,
  FALLBACK_MODEL_METRICS,
  simulateStressFallback,
  calculateLoanImpactFallback,
  generateReportFallback,
  sendChatFallback,
  FALLBACK_INTEGRATIONS_SUMMARY,
  FALLBACK_FINANCIAL_TRANSACTIONS,
  FALLBACK_SYNC_RUNS
} from '../data/fallbackData';

const getBaseUrl = (): string => {
  if (typeof window !== 'undefined') {
    // In Vite dev server (port 5173), use relative URL to leverage Vite's /api proxy
    if (window.location.port === '5173') {
      return '';
    }
    // Otherwise connect to backend host
    return `http://${window.location.hostname || '127.0.0.1'}:8000`;
  }
  return 'http://127.0.0.1:8000';
};

const BASE_URL = getBaseUrl();

class ApiService {
  public isFallbackMode = false;
  private listeners: ((fallback: boolean) => void)[] = [];

  public subscribeStatus(listener: (fallback: boolean) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private setFallback(value: boolean) {
    if (this.isFallbackMode !== value) {
      this.isFallbackMode = value;
      this.listeners.forEach(l => l(value));
    }
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 7000);

      const token = localStorage.getItem('credilens_token');
      const authHeaders: Record<string, string> = {};
      if (token) {
        authHeaders['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${BASE_URL}${endpoint}`, {
        ...options,
        credentials: 'include',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
          ...(options?.headers || {})
        }
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorMsg = `HTTP ${response.status}`;
        try {
          const errorJson = await response.json();
          if (errorJson && errorJson.detail) {
            errorMsg = typeof errorJson.detail === 'string'
              ? errorJson.detail
              : JSON.stringify(errorJson.detail);
          }
        } catch {
          // ignore json parse error
        }
        throw new Error(errorMsg);
      }

      this.setFallback(false);
      return await response.json();
    } catch (err: any) {
      // Gracefully switch to fallback mode
      this.setFallback(true);
      if (err.name === 'AbortError') {
        throw new Error('Connection timed out. The backend server at http://127.0.0.1:8000 is not responding.');
      }
      if (err.message === 'Failed to fetch' || err.message?.includes('NetworkError') || err.message?.includes('Load failed')) {
        throw new Error('Cannot connect to the backend server. Please make sure the backend is running at http://127.0.0.1:8000 (run `run_backend.bat` or `python -m uvicorn main:app`).');
      }
      throw err;
    }
  }

  async getOverview(): Promise<OverviewData> {
    try {
      return await this.request<OverviewData>('/api/overview');
    } catch {
      return FALLBACK_OVERVIEW;
    }
  }

  async getMSMEs(params?: {
    search?: string;
    sector?: string;
    risk_segment?: string;
    cash_flow_health?: string;
  }): Promise<{ count: number; total: number; msmes: MSME[] }> {
    try {
      const q = new URLSearchParams();
      if (params?.search) q.set('search', params.search);
      if (params?.sector) q.set('sector', params.sector);
      if (params?.risk_segment) q.set('risk_segment', params.risk_segment);
      if (params?.cash_flow_health) q.set('cash_flow_health', params.cash_flow_health);
      const url = `/api/msmes${q.toString() ? `?${q.toString()}` : ''}`;
      return await this.request<{ count: number; total: number; msmes: MSME[] }>(url);
    } catch {
      let filtered = [...SEEDED_DATASET];
      if (params?.search) {
        const s = params.search.toLowerCase();
        filtered = filtered.filter(
          m => m.business_name.toLowerCase().includes(s) ||
               m.msme_id.toLowerCase().includes(s) ||
               m.sector.toLowerCase().includes(s)
        );
      }
      if (params?.sector && params.sector !== 'All') {
        filtered = filtered.filter(m => m.sector === params.sector);
      }
      if (params?.risk_segment && params.risk_segment !== 'All') {
        filtered = filtered.filter(m => m.risk_segment.toUpperCase() === params.risk_segment!.toUpperCase());
      }
      if (params?.cash_flow_health && params.cash_flow_health !== 'All') {
        filtered = filtered.filter(m => m.cash_flow_health === params.cash_flow_health);
      }
      return {
        count: filtered.length,
        total: SEEDED_DATASET.length,
        msmes: filtered
      };
    }
  }

  async getMSME(id: string): Promise<{ msme: MSME; alternative_signals: any; is_synthetic: boolean }> {
    try {
      return await this.request<{ msme: MSME; alternative_signals: any; is_synthetic: boolean }>(`/api/msmes/${id}`);
    } catch {
      const msme = SEEDED_DATASET.find(m => m.msme_id === id) || SEEDED_DATASET[0];
      return {
        msme,
        is_synthetic: true,
        alternative_signals: {
          revenue_stability: { score: msme.revenue_stability, label: 'Revenue Stability', unit: '%', description: 'Volatility of monthly recurring top-line over 12 months.' },
          cash_flow_stability: { score: msme.cash_flow_stability, label: 'Cash Flow Stability', unit: '%', description: 'Based on monthly inflow/outflow consistency.' },
          invoice_consistency: { score: msme.invoice_consistency, label: 'Invoice Consistency', unit: '%', description: 'Frequency and timeliness of digital GST/e-invoice generation.' },
          payment_behavior: { score: msme.payment_behavior, label: 'Payment Behavior', unit: '%', description: 'Counterparty DSO and vendor payment punctuality score.' },
          business_activity: { score: msme.business_activity, label: 'Business Activity', unit: '%', description: 'Composite index of digital banking, e-way bills, and vendor volume.' },
          customer_concentration: { value: msme.customer_concentration, label: 'Customer Concentration', description: 'Revenue percentage contributed by top 3 buyers.' },
          supplier_concentration: { value: msme.supplier_concentration, label: 'Supplier Concentration', description: 'Input reliance across primary vendor base.' },
          transaction_volatility: { value: msme.transaction_volatility, label: 'Transaction Volatility', description: 'Standard deviation of periodic operating account throughput.' }
        }
      };
    }
  }

  async getMSMERisk(id: string): Promise<{ msme_id: string; business_name: string; risk_score: number; explanation: RiskExplanation }> {
    try {
      return await this.request<any>(`/api/msmes/${id}/risk`);
    } catch {
      const msme = SEEDED_DATASET.find(m => m.msme_id === id) || SEEDED_DATASET[0];
      return {
        msme_id: msme.msme_id,
        business_name: msme.business_name,
        risk_score: msme.risk_score,
        explanation: msme.msme_id === 'MSME-1042' ? METRO_EXPLANATION : {
          model_name: 'CrediLens Risk Engine v1.0',
          method: 'Model Explanation — Demo Model',
          disclaimer: "The explanation shows which business signals contributed most to the model's predicted risk.",
          base_value: 50.0,
          predicted_score: msme.risk_score,
          risk_increasing: [
            { factor: 'Cash-flow volatility', contribution: Math.round(msme.cashflow_volatility * 0.25), detail: `Volatility index at ${msme.cashflow_volatility}%` },
            { factor: 'Payment delays', contribution: Math.round(msme.payment_delay_days * 0.4), detail: `Receivables turnaround at ${msme.payment_delay_days} days` }
          ],
          risk_reducing: [
            { factor: 'Business activity', contribution: -Math.round(msme.business_activity * 0.12), detail: 'Operational activity index' },
            { factor: 'Transaction consistency', contribution: -Math.round(msme.transaction_consistency * 0.1), detail: 'Regular banking transactions' }
          ]
        }
      };
    }
  }

  async getCashFlow(id: string): Promise<CashFlowResponse> {
    try {
      return await this.request<CashFlowResponse>(`/api/msmes/${id}/cashflow`);
    } catch {
      return METRO_CASHFLOW;
    }
  }

  async simulateStress(inputs: SimulationInputs): Promise<SimulationResponse> {
    try {
      return await this.request<SimulationResponse>('/api/simulate', {
        method: 'POST',
        body: JSON.stringify(inputs)
      });
    } catch {
      const msme = SEEDED_DATASET.find(m => m.msme_id === inputs.msme_id) || SEEDED_DATASET[0];
      return simulateStressFallback(inputs, msme);
    }
  }

  async calculateLoanImpact(req: {
    msme_id: string;
    loan_amount: number;
    interest_rate: number;
    tenure_months: number;
  }): Promise<LoanImpactResponse> {
    try {
      return await this.request<LoanImpactResponse>('/api/loan-impact', {
        method: 'POST',
        body: JSON.stringify(req)
      });
    } catch {
      const msme = SEEDED_DATASET.find(m => m.msme_id === req.msme_id) || SEEDED_DATASET[0];
      return calculateLoanImpactFallback(msme, req.loan_amount, req.interest_rate, req.tenure_months);
    }
  }

  async getFairness(): Promise<FairnessResponse> {
    try {
      return await this.request<FairnessResponse>('/api/fairness');
    } catch {
      return FALLBACK_FAIRNESS;
    }
  }

  async getModelMetrics(): Promise<ModelMetricsResponse> {
    try {
      return await this.request<ModelMetricsResponse>('/api/model-metrics');
    } catch {
      return FALLBACK_MODEL_METRICS;
    }
  }

  async getReport(id: string): Promise<CreditIntelligenceReport> {
    try {
      return await this.request<CreditIntelligenceReport>(`/api/report/${id}`);
    } catch {
      const msme = SEEDED_DATASET.find(m => m.msme_id === id) || SEEDED_DATASET[0];
      return generateReportFallback(msme);
    }
  }

  async sendChatMessage(message: string, borrowerId?: string, currentBorrower?: MSME): Promise<ChatResponse> {
    try {
      return await this.request<ChatResponse>('/api/chat', {
        method: 'POST',
        body: JSON.stringify({ message, borrower_id: borrowerId })
      });
    } catch {
      const msme = (borrowerId ? SEEDED_DATASET.find(m => m.msme_id === borrowerId) : currentBorrower) || currentBorrower || SEEDED_DATASET[0];
      return sendChatFallback(message, msme);
    }
  }

  // Authentication & OTP Methods
  async register(payload: RegisterPayload): Promise<RegisterInitiateResponse> {
    return await this.request<RegisterInitiateResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async verifyRegistrationOtp(payload: VerifyRegistrationOtpPayload): Promise<AuthResponse> {
    const res = await this.request<AuthResponse>('/api/auth/verify-registration-otp', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    if (res && res.access_token) {
      localStorage.setItem('credilens_token', res.access_token);
      localStorage.setItem('credilens_user', JSON.stringify(res.user));
    }
    return res;
  }

  async resendRegistrationOtp(payload: ResendOtpPayload): Promise<RegisterInitiateResponse> {
    return await this.request<RegisterInitiateResponse>('/api/auth/resend-registration-otp', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async forgotPassword(payload: ForgotPasswordPayload): Promise<ForgotPasswordResponse> {
    return await this.request<ForgotPasswordResponse>('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async verifyResetOtp(payload: VerifyResetOtpPayload): Promise<VerifyResetOtpResponse> {
    return await this.request<VerifyResetOtpResponse>('/api/auth/verify-reset-otp', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async resendResetOtp(payload: ResendOtpPayload): Promise<ForgotPasswordResponse> {
    return await this.request<ForgotPasswordResponse>('/api/auth/resend-reset-otp', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async resetPassword(payload: ResetPasswordPayload): Promise<StandardMessageResponse> {
    return await this.request<StandardMessageResponse>('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async login(payload: LoginPayload): Promise<AuthResponse> {
    try {
      const res = await this.request<AuthResponse>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      if (res && res.access_token) {
        localStorage.setItem('credilens_token', res.access_token);
        localStorage.setItem('credilens_user', JSON.stringify(res.user));
      }
      return res;
    } catch (err: any) {
      // If backend network error/offline and demo credentials provided, provide reliable offline demo login
      const isNetworkError = err?.message?.includes('Failed to fetch') || err?.name === 'AbortError' || this.isFallbackMode;
      if (
        isNetworkError &&
        payload.email.toLowerCase().trim() === 'underwriter@credilens.internal' &&
        payload.password === 'CrediLens@2026'
      ) {
        const demoUser: SafeUser = {
          user_id: 'usr_demo_underwriter',
          full_name: 'Aditya Raj Kabra',
          email: 'underwriter@credilens.internal',
          organization: 'CrediLens Institutional Underwriting',
          account_status: 'active',
          created_at: new Date().toISOString()
        };
        const demoRes: AuthResponse = {
          user: demoUser,
          access_token: 'demo_session_token_' + Date.now(),
          token_type: 'bearer',
          message: 'Authenticated successfully in offline demo mode.'
        };
        localStorage.setItem('credilens_token', demoRes.access_token);
        localStorage.setItem('credilens_user', JSON.stringify(demoRes.user));
        return demoRes;
      }
      throw err;
    }
  }

  async logout(): Promise<void> {
    try {
      await this.request<{ message: string }>('/api/auth/logout', {
        method: 'POST'
      });
    } catch {
      // Ignore network errors during logout
    } finally {
      localStorage.removeItem('credilens_token');
      localStorage.removeItem('credilens_user');
    }
  }

  async getMe(): Promise<SafeUser> {
    const token = localStorage.getItem('credilens_token');
    if (!token) {
      throw new Error('No active session token');
    }

    if (token.startsWith('demo_session_token_')) {
      const cached = localStorage.getItem('credilens_user');
      if (cached) {
        return JSON.parse(cached);
      }
    }

    try {
      const res = await this.request<{ user: SafeUser }>('/api/auth/me');
      if (res && res.user) {
        localStorage.setItem('credilens_user', JSON.stringify(res.user));
        return res.user;
      }
      throw new Error('Invalid authentication response');
    } catch (err: any) {
      const cached = localStorage.getItem('credilens_user');
      if (cached && (err?.message?.includes('Failed to fetch') || this.isFallbackMode)) {
        return JSON.parse(cached);
      }
      // If token expired or rejected by server, clear local session
      if (err?.message?.includes('401') || err?.message?.includes('expired') || err?.message?.includes('credentials')) {
        localStorage.removeItem('credilens_token');
        localStorage.removeItem('credilens_user');
      }
      throw err;
    }
  }

  // ================= FINANCIAL INTEGRATIONS METHODS =================

  async getIntegrationsSummary(): Promise<IntegrationSummaryResponse> {
    try {
      return await this.request<IntegrationSummaryResponse>('/api/integrations');
    } catch {
      return FALLBACK_INTEGRATIONS_SUMMARY;
    }
  }

  async getProviderStatus(provider: string): Promise<DataConnection> {
    try {
      return await this.request<DataConnection>(`/api/integrations/${provider}/status`);
    } catch {
      const found = FALLBACK_INTEGRATIONS_SUMMARY.integrations.find(i => i.provider === provider);
      if (found) return found;
      throw new Error(`Provider ${provider} not found`);
    }
  }

  async testProviderConnection(provider: string): Promise<TestConnectionResponse> {
    try {
      return await this.request<TestConnectionResponse>(`/api/integrations/${provider}/test`, {
        method: 'POST'
      });
    } catch (err: any) {
      if (this.isFallbackMode) {
        return {
          provider,
          success: true,
          status: 'CONNECTED',
          message: `Handshake verified with ${provider} in offline demo mode.`,
          tested_at: new Date().toISOString()
        };
      }
      throw err;
    }
  }

  async syncProviderData(provider: string, options?: any): Promise<SyncResponse> {
    try {
      return await this.request<SyncResponse>(`/api/integrations/${provider}/sync`, {
        method: 'POST',
        body: JSON.stringify(options || {})
      });
    } catch (err: any) {
      if (this.isFallbackMode) {
        return {
          provider,
          success: true,
          status: 'SYNCED',
          sync_run: FALLBACK_SYNC_RUNS[0],
          message: `Synchronized demonstration records for ${provider}.`
        };
      }
      throw err;
    }
  }

  async getProviderSyncHistory(provider: string, limit: number = 20): Promise<SyncRun[]> {
    try {
      return await this.request<SyncRun[]>(`/api/integrations/${provider}/sync-history?limit=${limit}`);
    } catch {
      return FALLBACK_SYNC_RUNS.filter(r => r.provider === provider);
    }
  }

  async getFinancialTransactions(params?: {
    provider?: string;
    source?: string;
    msme_id?: string;
    file_id?: string;
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<TransactionsListResponse> {
    const q = new URLSearchParams();
    if (params?.provider) q.set('provider', params.provider);
    if (params?.source) q.set('source', params.source);
    if (params?.msme_id) q.set('msme_id', params.msme_id);
    if (params?.file_id) q.set('file_id', params.file_id);
    if (params?.status) q.set('status', params.status);
    if (params?.search) q.set('search', params.search);
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));

    const endpoint = `/api/integrations/transactions${q.toString() ? '?' + q.toString() : ''}`;
    try {
      return await this.request<TransactionsListResponse>(endpoint);
    } catch {
      let filtered = [...FALLBACK_FINANCIAL_TRANSACTIONS];
      if (params?.provider) {
        filtered = filtered.filter(t => t.provider === params.provider);
      }
      if (params?.source) {
        filtered = filtered.filter(t => (t.source || t.provider) === params.source);
      }
      if (params?.msme_id) {
        filtered = filtered.filter(t => t.msme_id === params.msme_id);
      }
      if (params?.status) {
        filtered = filtered.filter(t => t.status === params.status);
      }
      if (params?.search) {
        const s = params.search.toLowerCase();
        filtered = filtered.filter(t =>
          t.external_id.toLowerCase().includes(s) ||
          t.payer_email?.toLowerCase().includes(s) ||
          t.description?.toLowerCase().includes(s)
        );
      }
      return {
        total: filtered.length,
        page: params?.page || 1,
        limit: params?.limit || 50,
        transactions: filtered,
        summary: {
          total_amount: filtered.reduce((acc, c) => acc + c.amount, 0),
          inflow_count: filtered.filter(t => t.direction === 'INFLOW' || t.direction === 'CREDIT').length,
          outflow_count: filtered.filter(t => t.direction === 'OUTFLOW' || t.direction === 'DEBIT').length,
          successful_count: filtered.length
        }
      };
    }
  }

  async configureProvider(provider: string, payload: ConfigureProviderPayload): Promise<ConfigureProviderResponse> {
    return await this.request<ConfigureProviderResponse>(`/api/integrations/${provider}/configure`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async initiateBankConsent(payload: BankConsentRequestPayload): Promise<BankConsentResponse> {
    try {
      return await this.request<BankConsentResponse>('/api/integrations/bank/consent', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    } catch (err: any) {
      if (this.isFallbackMode) {
        return {
          consent_id: 'cst_demo_' + Date.now(),
          provider: 'bank_aa',
          customer_identifier: payload.customer_identifier,
          consent_handle: 'handle_demo_consent_' + Date.now(),
          status: 'PENDING_APPROVAL',
          consent_url: 'https://aa-sandbox.credilens.internal/consent/demo',
          expires_at: new Date(Date.now() + 86400000 * 30).toISOString(),
          data_scopes: payload.data_scopes || ['TRANSACTIONS', 'PROFILE'],
          message: `Consent request dispatched to ${payload.customer_identifier}. Awaiting borrower authorization.`
        };
      }
      throw err;
    }
  }

  async checkBankConsent(consentId: string): Promise<any> {
    try {
      return await this.request<any>(`/api/integrations/bank/consent/${consentId}`);
    } catch {
      return { consent_id: consentId, status: 'ACTIVE' };
    }
  }

  // ================= DATA MANAGEMENT & FILE IMPORTS =================

  async getDataManagementSummary(): Promise<DataManagementSummary> {
    try {
      return await this.request<DataManagementSummary>('/api/data-management/summary');
    } catch {
      return {
        total_providers: 3,
        connected_providers: 0,
        total_imported_files: 0,
        total_transactions: 14,
        provider_transactions: 14,
        imported_file_transactions: 0,
        last_sync_time: new Date().toISOString(),
        last_import_time: null,
        recent_activity: [
          {
            id: 'demo_sync_01',
            activity_type: 'PROVIDER_SYNC',
            source_name: 'Razorpay Sandbox',
            status: 'SUCCESS',
            count: 3,
            timestamp: new Date().toISOString(),
            details: 'Initial Sandbox Verification'
          }
        ],
        data_quality: {
          valid_rate: 100.0,
          valid_records: 14,
          total_records: 14,
          status: 'EXCELLENT'
        }
      };
    }
  }

  async previewImportFile(file: File): Promise<FilePreviewResult> {
    const formData = new FormData();
    formData.append('file', file);
    return await this.request<FilePreviewResult>('/api/imports/preview', {
      method: 'POST',
      body: formData
    });
  }

  async validateImportFile(
    file: File,
    columnMapping: Record<string, string>,
    datasetType: string,
    msmeId: string
  ): Promise<FileValidationResult> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('column_mapping', JSON.stringify(columnMapping));
    formData.append('dataset_type', datasetType);
    formData.append('msme_id', msmeId);

    return await this.request<FileValidationResult>('/api/imports/validate', {
      method: 'POST',
      body: formData
    });
  }

  async confirmFileImport(fileId: string): Promise<ImportExecutionResult> {
    return await this.request<ImportExecutionResult>(`/api/imports/${fileId}/confirm`, {
      method: 'POST'
    });
  }

  async listImportedFiles(msmeId?: string): Promise<ImportedFile[]> {
    const q = msmeId ? `?msme_id=${encodeURIComponent(msmeId)}` : '';
    try {
      return await this.request<ImportedFile[]>(`/api/imports${q}`);
    } catch {
      return [];
    }
  }

  async getImportedFileDetail(fileId: string): Promise<ImportedFile> {
    return await this.request<ImportedFile>(`/api/imports/${fileId}`);
  }

  async deleteImportedFile(fileId: string): Promise<{ success: boolean; message: string }> {
    return await this.request<{ success: boolean; message: string }>(`/api/imports/${fileId}`, {
      method: 'DELETE'
    });
  }

  async getMsmeDataSummary(msmeId: string): Promise<{
    msme_id: string;
    business_name: string;
    total_transactions: number;
    imported_files_count: number;
    recent_transactions: any[];
  }> {
    try {
      return await this.request<any>(`/api/msmes/${msmeId}/data-summary`);
    } catch {
      return {
        msme_id: msmeId,
        business_name: 'Metro Auto Parts',
        total_transactions: 0,
        imported_files_count: 0,
        recent_transactions: []
      };
    }
  }
}

export const api = new ApiService();

