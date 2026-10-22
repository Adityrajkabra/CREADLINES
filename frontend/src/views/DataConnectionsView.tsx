import React, { useState, useEffect } from 'react';
import {
  Database,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ExternalLink,
  ShieldCheck,
  CreditCard,
  Landmark,
  FileSpreadsheet,
  Search,
  Filter,
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  Layers,
  Lock,
  Eye,
  EyeOff,
  Sliders,
  Check,
  Copy,
  Info,
  Calendar,
  AlertCircle,
  UploadCloud
} from 'lucide-react';
import { api } from '../services/api';
import {
  DataConnection,
  IntegrationSummaryResponse,
  FinancialTransaction,
  SyncRun,
  TransactionsListResponse,
  TestConnectionResponse,
  ActiveTab
} from '../types';

interface DataConnectionsViewProps {
  onNavigateTab?: (tab: ActiveTab) => void;
}

export const DataConnectionsView: React.FC<DataConnectionsViewProps> = ({ onNavigateTab }) => {
  // State
  const [summary, setSummary] = useState<IntegrationSummaryResponse | null>(null);
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [txTotal, setTxTotal] = useState<number>(0);
  const [txSummary, setTxSummary] = useState<any>({});
  const [syncHistory, setSyncHistory] = useState<SyncRun[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'transactions' | 'history' | 'architecture'>('transactions');

  // Filters
  const [providerFilter, setProviderFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals & In-flight Actions
  const [testingProvider, setTestingProvider] = useState<string | null>(null);
  const [syncingProvider, setSyncingProvider] = useState<string | null>(null);
  const [actionAlert, setActionAlert] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // Config Modal State
  const [configModalProvider, setConfigModalProvider] = useState<DataConnection | null>(null);
  const [configKeyId, setConfigKeyId] = useState<string>('');
  const [configKeySecret, setConfigKeySecret] = useState<string>('');
  const [configEnv, setConfigEnv] = useState<string>('SANDBOX');
  const [showConfigSecret, setShowConfigSecret] = useState<boolean>(false);
  const [isSavingConfig, setIsSavingConfig] = useState<boolean>(false);

  // Bank Consent Modal State
  const [isConsentModalOpen, setIsConsentModalOpen] = useState<boolean>(false);
  const [consentCustomer, setConsentCustomer] = useState<string>('9876543210@sahamati');
  const [consentMonths, setConsentMonths] = useState<number>(12);
  const [consentScopes, setConsentScopes] = useState<string[]>(['TRANSACTIONS', 'PROFILE', 'SUMMARY']);
  const [isDispatchingConsent, setIsDispatchingConsent] = useState<boolean>(false);
  const [consentResult, setConsentResult] = useState<any | null>(null);

  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Initial Fetch
  const loadDashboardData = async (showLoadingSpinner = true) => {
    if (showLoadingSpinner) setIsLoading(true);
    try {
      const [sumRes, txRes, rzpHist, bankHist, gstHist] = await Promise.all([
        api.getIntegrationsSummary(),
        api.getFinancialTransactions({
          provider: providerFilter === 'all' ? undefined : providerFilter,
          status: statusFilter === 'all' ? undefined : statusFilter,
          search: searchQuery.trim() || undefined,
          limit: 100
        }),
        api.getProviderSyncHistory('razorpay', 15),
        api.getProviderSyncHistory('bank_aa', 10),
        api.getProviderSyncHistory('gst', 10)
      ]);

      setSummary(sumRes);
      setTransactions(txRes.transactions || []);
      setTxTotal(txRes.total || 0);
      setTxSummary(txRes.summary || {});

      // Combine and sort sync history
      const allHist = [...rzpHist, ...bankHist, ...gstHist].sort(
        (a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
      );
      setSyncHistory(allHist);
    } catch (err: any) {
      console.error('Failed to load integration hub data:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboardData(true);
  }, [providerFilter, statusFilter]);

  // Debounced Search
  useEffect(() => {
    const handler = setTimeout(() => {
      loadDashboardData(false);
    }, 350);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Handle Refresh
  const handleRefresh = () => {
    setIsRefreshing(true);
    loadDashboardData(false);
  };

  // Handle Test Connection
  const handleTestConnection = async (provider: string) => {
    setTestingProvider(provider);
    setActionAlert(null);
    try {
      const res: TestConnectionResponse = await api.testProviderConnection(provider);
      if (res.success) {
        setActionAlert({ type: 'success', message: `${res.message}` });
      } else {
        setActionAlert({ type: 'error', message: `${res.message}` });
      }
      await loadDashboardData(false);
    } catch (err: any) {
      setActionAlert({ type: 'error', message: err.message || `Failed to test ${provider} connection.` });
    } finally {
      setTestingProvider(null);
    }
  };

  // Handle Sync Payments
  const handleSyncData = async (provider: string, demo = false) => {
    setSyncingProvider(provider);
    setActionAlert(null);
    try {
      const res = await api.syncProviderData(provider, { demo_mode: demo, msme_id: 'MSME-1042' });
      if (res.success) {
        setActionAlert({ type: 'success', message: res.message });
      } else {
        setActionAlert({ type: 'error', message: res.message });
      }
      await loadDashboardData(false);
    } catch (err: any) {
      setActionAlert({ type: 'error', message: err.message || `Failed to sync ${provider} data.` });
    } finally {
      setSyncingProvider(null);
    }
  };

  // Open Configure Modal
  const openConfigModal = (conn: DataConnection) => {
    setConfigModalProvider(conn);
    setConfigKeyId('');
    setConfigKeySecret('');
    setConfigEnv(conn.environment);
    setShowConfigSecret(false);
    setActionAlert(null);
  };

  // Save Config
  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!configModalProvider) return;
    setIsSavingConfig(true);
    setActionAlert(null);

    try {
      const payload: any = {
        environment: configEnv,
        credentials: {
          key_id: configKeyId.trim(),
          key_secret: configKeySecret.trim()
        }
      };

      const res = await api.configureProvider(configModalProvider.provider, payload);
      setActionAlert({ type: 'success', message: `Successfully updated ${configModalProvider.display_name} configuration.` });
      setConfigModalProvider(null);
      await loadDashboardData(false);
    } catch (err: any) {
      setActionAlert({ type: 'error', message: err.message || 'Failed to update credentials.' });
    } finally {
      setIsSavingConfig(false);
    }
  };

  // Handle Consent Dispatch
  const handleDispatchConsent = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsDispatchingConsent(true);
    try {
      const res = await api.initiateBankConsent({
        customer_identifier: consentCustomer.trim(),
        msme_id: 'MSME-1042',
        data_scopes: consentScopes,
        date_range_months: consentMonths
      });
      setConsentResult(res);
      setActionAlert({ type: 'success', message: res.message });
      await loadDashboardData(false);
    } catch (err: any) {
      setActionAlert({ type: 'error', message: err.message || 'Consent dispatch failed.' });
    } finally {
      setIsDispatchingConsent(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Helper for Status Badge
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'CONNECTED':
      case 'SYNCED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-[#142B21] text-[#22A477] border border-[#1A4533]">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {status}
          </span>
        );
      case 'CONFIGURED':
      case 'TESTING':
      case 'SYNCING':
      case 'AWAITING_CONSENT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-[#332015] text-[#FF7A1A] border border-[#75401F]">
            <Clock className="w-3.5 h-3.5 animate-spin" />
            {status.replace('_', ' ')}
          </span>
        );
      case 'ERROR':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-[#2C1717] text-[#EF5350] border border-[#522525]">
            <XCircle className="w-3.5 h-3.5" />
            ERROR
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-[#1E1E21] text-[#71717A] border border-[#303035]">
            <AlertCircle className="w-3.5 h-3.5" />
            {status.replace('_', ' ')}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* View Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-[#303035] pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#1E1E21] border border-[#303035] flex items-center justify-center text-[#FF7A1A]">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-[#F5F5F5]">Data Connections Hub</h1>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-[#332015] text-[#FF7A1A] border border-[#75401F]">
                  Multi-Provider Sandbox
                </span>
              </div>
              <p className="text-xs text-[#A1A1AA] mt-0.5">
                Live sandbox and provider-independent integration adapters for Razorpay, Bank Account Aggregators, and GST.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {onNavigateTab && (
            <button
              onClick={() => onNavigateTab('data-import')}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#1E1E21] hover:bg-[#28282D] text-[#F5F5F5] border border-[#303035] transition-all"
            >
              <UploadCloud className="w-3.5 h-3.5 text-[#FF7A1A]" />
              <span>Import Financial Data</span>
            </button>
          )}
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg bg-[#1E1E21] hover:bg-[#28282D] text-[#F5F5F5] border border-[#303035] transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#FF7A1A] ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh Telemetry
          </button>
        </div>
      </div>

      {/* Action Notification Alert */}
      {actionAlert && (
        <div
          className={`p-4 rounded-xl border flex items-start gap-3 transition-all ${
            actionAlert.type === 'success'
              ? 'bg-[#142B21] border-[#1A4533] text-[#22A477]'
              : actionAlert.type === 'error'
              ? 'bg-[#2C1717] border-[#522525] text-[#EF5350]'
              : 'bg-[#1E1E21] border-[#303035] text-[#F5F5F5]'
          }`}
        >
          {actionAlert.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
          ) : actionAlert.type === 'error' ? (
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          ) : (
            <Info className="w-5 h-5 shrink-0 mt-0.5 text-[#FF7A1A]" />
          )}
          <div className="flex-1 text-xs font-medium">{actionAlert.message}</div>
          <button
            onClick={() => setActionAlert(null)}
            className="text-[#71717A] hover:text-[#F5F5F5] text-xs font-mono"
          >
            ✕
          </button>
        </div>
      )}

      {/* Dashboard Summary KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3.5 rounded-xl bg-[#171719] border border-[#303035]">
          <div className="text-[11px] font-medium text-[#71717A]">Total Integrations</div>
          <div className="text-xl font-bold font-mono text-[#F5F5F5] mt-1">
            {summary ? summary.total_integrations : 3}
          </div>
          <div className="text-[10px] text-[#A1A1AA] mt-1">Payment, Bank, GST</div>
        </div>

        <div className="p-3.5 rounded-xl bg-[#171719] border border-[#303035]">
          <div className="text-[11px] font-medium text-[#71717A]">Connected</div>
          <div className="text-xl font-bold font-mono text-[#22A477] mt-1">
            {summary ? summary.connected_integrations : 0}
          </div>
          <div className="text-[10px] text-[#A1A1AA] mt-1">Active Handshakes</div>
        </div>

        <div className="p-3.5 rounded-xl bg-[#171719] border border-[#303035]">
          <div className="text-[11px] font-medium text-[#71717A]">Awaiting Setup</div>
          <div className="text-xl font-bold font-mono text-[#FF7A1A] mt-1">
            {summary ? summary.awaiting_configuration : 3}
          </div>
          <div className="text-[10px] text-[#A1A1AA] mt-1">Credentials Required</div>
        </div>

        <div className="p-3.5 rounded-xl bg-[#171719] border border-[#303035]">
          <div className="text-[11px] font-medium text-[#71717A]">Imported Records</div>
          <div className="text-xl font-bold font-mono text-[#F5F5F5] mt-1">
            {summary ? summary.total_imported_transactions : txTotal}
          </div>
          <div className="text-[10px] text-[#A1A1AA] mt-1">Normalized Transactions</div>
        </div>

        <div className="p-3.5 rounded-xl bg-[#171719] border border-[#303035]">
          <div className="text-[11px] font-medium text-[#71717A]">Last Successful Sync</div>
          <div className="text-xs font-semibold text-[#F5F5F5] mt-1.5 truncate">
            {summary?.last_successful_sync
              ? new Date(summary.last_successful_sync).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
              : 'Never'}
          </div>
          <div className="text-[10px] text-[#71717A] mt-1">
            {summary?.last_successful_sync
              ? new Date(summary.last_successful_sync).toLocaleDateString([], { month: 'short', day: 'numeric' })
              : 'Awaiting sync'}
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-[#171719] border border-[#303035]">
          <div className="text-[11px] font-medium text-[#71717A]">Integration Health</div>
          <div className="mt-1.5">
            {summary?.overall_health === 'HEALTHY' ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-[#142B21] text-[#22A477] border border-[#1A4533]">
                <Check className="w-3 h-3" /> HEALTHY
              </span>
            ) : summary?.overall_health === 'DEGRADED' ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-[#332015] text-[#E8A23A] border border-[#75401F]">
                <AlertTriangle className="w-3 h-3" /> DEGRADED
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-[#1E1E21] text-[#A1A1AA] border border-[#303035]">
                <Info className="w-3 h-3" /> ACTION REQ.
              </span>
            )}
          </div>
          <div className="text-[10px] text-[#71717A] mt-1">Adapter Health</div>
        </div>
      </div>

      {/* Integration Provider Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* CARD A: Razorpay */}
        {(() => {
          const rzp = summary?.integrations.find(i => i.provider === 'razorpay');
          return (
            <div className="rounded-xl bg-[#171719] border border-[#303035] p-5 flex flex-col justify-between hover:border-[#45454C] transition-all relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#FF7A1A]/5 rounded-bl-full pointer-events-none" />

              <div>
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#1E1E21] border border-[#303035] flex items-center justify-center text-[#FF7A1A]">
                      <CreditCard className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-sm font-bold text-[#F5F5F5]">Razorpay Gateway</h2>
                      </div>
                      <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-[#332015] text-[#FF7A1A] border border-[#75401F]">
                        TEST MODE (SANDBOX)
                      </span>
                    </div>
                  </div>
                  {renderStatusBadge(rzp?.status || 'NOT_CONFIGURED')}
                </div>

                <p className="text-xs text-[#A1A1AA] mt-3">
                  Retrieves test-mode customer settlements, cards, UPI transactions, and payment statuses via official REST API.
                </p>

                {/* Metrics Details */}
                <div className="mt-4 pt-3 border-t border-[#252528] grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-[#141416] p-2.5 rounded-lg border border-[#252528]">
                    <span className="text-[10px] text-[#71717A] block">Imported Records</span>
                    <span className="text-sm font-bold font-mono text-[#F5F5F5]">
                      {rzp?.stats.total_records || 0} Payments
                    </span>
                  </div>
                  <div className="bg-[#141416] p-2.5 rounded-lg border border-[#252528]">
                    <span className="text-[10px] text-[#71717A] block">Total Amount</span>
                    <span className="text-sm font-bold font-mono text-[#22A477]">
                      ₹{(rzp?.stats.total_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* Configuration Metadata */}
                <div className="mt-3 text-[11px] text-[#71717A] space-y-1 font-mono">
                  <div className="flex justify-between">
                    <span>Key ID:</span>
                    <span className="text-[#A1A1AA]">{rzp?.config_metadata?.masked_key_id || 'Not configured'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Last Synced:</span>
                    <span className="text-[#A1A1AA]">
                      {rzp?.last_synced_at ? new Date(rzp.last_synced_at).toLocaleTimeString() : 'Never'}
                    </span>
                  </div>
                </div>

                {rzp?.error_message && (
                  <div className="mt-3 p-2 rounded bg-[#2C1717] border border-[#522525] text-[11px] text-[#EF5350]">
                    {rzp.error_message}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="mt-5 pt-4 border-t border-[#252528] flex flex-wrap items-center gap-2">
                <button
                  onClick={() => rzp && openConfigModal(rzp)}
                  className="px-2.5 py-1.5 rounded-lg bg-[#1E1E21] hover:bg-[#28282D] text-[#F5F5F5] border border-[#303035] text-xs font-medium transition-colors"
                >
                  Configure
                </button>
                <button
                  onClick={() => handleTestConnection('razorpay')}
                  disabled={testingProvider === 'razorpay'}
                  className="px-2.5 py-1.5 rounded-lg bg-[#1E1E21] hover:bg-[#28282D] text-[#F5F5F5] border border-[#303035] text-xs font-medium transition-colors disabled:opacity-50"
                >
                  {testingProvider === 'razorpay' ? 'Testing...' : 'Test Connection'}
                </button>
                <button
                  onClick={() => handleSyncData('razorpay')}
                  disabled={syncingProvider === 'razorpay'}
                  className="px-3 py-1.5 rounded-lg bg-[#FF7A1A] hover:bg-[#FF8F3D] text-[#0D0D0F] text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50 ml-auto"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${syncingProvider === 'razorpay' ? 'animate-spin' : ''}`} />
                  {syncingProvider === 'razorpay' ? 'Syncing...' : 'Sync Payments'}
                </button>
              </div>
            </div>
          );
        })()}

        {/* CARD B: Bank Account Aggregator */}
        {(() => {
          const bank = summary?.integrations.find(i => i.provider === 'bank_aa');
          return (
            <div className="rounded-xl bg-[#171719] border border-[#303035] p-5 flex flex-col justify-between hover:border-[#45454C] transition-all relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-bl-full pointer-events-none" />

              <div>
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#1E1E21] border border-[#303035] flex items-center justify-center text-blue-400">
                      <Landmark className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-sm font-bold text-[#F5F5F5]">Account Aggregator</h2>
                      </div>
                      <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-[#162238] text-blue-400 border border-[#1E3A8A]">
                        ReBIT / Sahamati AA
                      </span>
                    </div>
                  </div>
                  {renderStatusBadge(bank?.status || 'NOT_CONNECTED')}
                </div>

                <p className="text-xs text-[#A1A1AA] mt-3">
                  Consent-driven bank statement data ingestion. Direct financial institution verification without credential scraping.
                </p>

                {/* Metrics Details */}
                <div className="mt-4 pt-3 border-t border-[#252528] grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-[#141416] p-2.5 rounded-lg border border-[#252528]">
                    <span className="text-[10px] text-[#71717A] block">Consent Status</span>
                    <span className="text-xs font-bold text-[#A1A1AA]">
                      {bank?.status === 'AWAITING_CONSENT' ? 'Pending Approval' : 'Awaiting Request'}
                    </span>
                  </div>
                  <div className="bg-[#141416] p-2.5 rounded-lg border border-[#252528]">
                    <span className="text-[10px] text-[#71717A] block">Supported Scopes</span>
                    <span className="text-xs font-bold text-[#A1A1AA]">Deposit, Term, Inflow</span>
                  </div>
                </div>

                {/* Configuration Metadata */}
                <div className="mt-3 text-[11px] text-[#71717A] space-y-1 font-mono">
                  <div className="flex justify-between">
                    <span>Partner Gateway:</span>
                    <span className="text-[#A1A1AA]">{bank?.config_metadata?.aa_provider || 'Sahamati Protocol'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Client ID:</span>
                    <span className="text-[#A1A1AA]">{bank?.config_metadata?.masked_client_id || 'Awaiting Partner'}</span>
                  </div>
                </div>

                <div className="mt-3 p-2 rounded bg-[#161618] border border-[#28282C] text-[11px] text-[#71717A] flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#22A477] shrink-0" />
                  <span>Zero password/PIN storage. Strictly consent-governed.</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-5 pt-4 border-t border-[#252528] flex flex-wrap items-center gap-2">
                <button
                  onClick={() => bank && openConfigModal(bank)}
                  className="px-2.5 py-1.5 rounded-lg bg-[#1E1E21] hover:bg-[#28282D] text-[#F5F5F5] border border-[#303035] text-xs font-medium transition-colors"
                >
                  Configure
                </button>
                <button
                  onClick={() => setIsConsentModalOpen(true)}
                  className="px-2.5 py-1.5 rounded-lg bg-[#1E1E21] hover:bg-[#28282D] text-[#F5F5F5] border border-[#303035] text-xs font-medium transition-colors"
                >
                  Start Consent Flow
                </button>
                <button
                  onClick={() => handleSyncData('bank_aa', true)}
                  disabled={syncingProvider === 'bank_aa'}
                  className="px-3 py-1.5 rounded-lg bg-[#1E1E21] hover:bg-[#28282D] text-[#FF7A1A] border border-[#75401F] text-xs font-bold transition-all ml-auto disabled:opacity-50"
                  title="Loads demonstration ReBIT bank statement records"
                >
                  {syncingProvider === 'bank_aa' ? 'Syncing...' : 'Sync (Demo)'}
                </button>
              </div>
            </div>
          );
        })()}

        {/* CARD C: GST Business Data */}
        {(() => {
          const gst = summary?.integrations.find(i => i.provider === 'gst');
          return (
            <div className="rounded-xl bg-[#171719] border border-[#303035] p-5 flex flex-col justify-between hover:border-[#45454C] transition-all relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-bl-full pointer-events-none" />

              <div>
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#1E1E21] border border-[#303035] flex items-center justify-center text-purple-400">
                      <FileSpreadsheet className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-sm font-bold text-[#F5F5F5]">GST Business Data</h2>
                      </div>
                      <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-[#271836] text-purple-400 border border-[#581C87]">
                        GSP GATEWAY
                      </span>
                    </div>
                  </div>
                  {renderStatusBadge(gst?.status || 'NOT_CONNECTED')}
                </div>

                <p className="text-xs text-[#A1A1AA] mt-3">
                  Direct outward sales invoice (GSTR-1 B2B) and filing summary (GSTR-3B) verification via authorized GST Suvidha Providers.
                </p>

                {/* Metrics Details */}
                <div className="mt-4 pt-3 border-t border-[#252528] grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-[#141416] p-2.5 rounded-lg border border-[#252528]">
                    <span className="text-[10px] text-[#71717A] block">Authorized Returns</span>
                    <span className="text-xs font-bold text-[#A1A1AA]">GSTR-1, GSTR-3B</span>
                  </div>
                  <div className="bg-[#141416] p-2.5 rounded-lg border border-[#252528]">
                    <span className="text-[10px] text-[#71717A] block">Auth Mechanism</span>
                    <span className="text-xs font-bold text-[#A1A1AA]">Taxpayer OTP Session</span>
                  </div>
                </div>

                {/* Configuration Metadata */}
                <div className="mt-3 text-[11px] text-[#71717A] space-y-1 font-mono">
                  <div className="flex justify-between">
                    <span>GSP Provider:</span>
                    <span className="text-[#A1A1AA]">{gst?.config_metadata?.provider_type || 'Awaiting Onboarding'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Client ID:</span>
                    <span className="text-[#A1A1AA]">{gst?.config_metadata?.masked_client_id || 'Not configured'}</span>
                  </div>
                </div>

                <div className="mt-3 p-2 rounded bg-[#161618] border border-[#28282C] text-[11px] text-[#71717A] flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  <span>Public GSTIN lookup does not grant private return access.</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-5 pt-4 border-t border-[#252528] flex flex-wrap items-center gap-2">
                <button
                  onClick={() => gst && openConfigModal(gst)}
                  className="px-2.5 py-1.5 rounded-lg bg-[#1E1E21] hover:bg-[#28282D] text-[#F5F5F5] border border-[#303035] text-xs font-medium transition-colors"
                >
                  Configure
                </button>
                <button
                  onClick={() => handleTestConnection('gst')}
                  disabled={testingProvider === 'gst'}
                  className="px-2.5 py-1.5 rounded-lg bg-[#1E1E21] hover:bg-[#28282D] text-[#F5F5F5] border border-[#303035] text-xs font-medium transition-colors disabled:opacity-50"
                >
                  {testingProvider === 'gst' ? 'Testing...' : 'Test Connection'}
                </button>
                <button
                  onClick={() => handleSyncData('gst', true)}
                  disabled={syncingProvider === 'gst'}
                  className="px-3 py-1.5 rounded-lg bg-[#1E1E21] hover:bg-[#28282D] text-purple-400 border border-[#581C87] text-xs font-bold transition-all ml-auto disabled:opacity-50"
                  title="Loads demonstration GSTR-1 B2B invoices"
                >
                  {syncingProvider === 'gst' ? 'Syncing...' : 'Sync (Demo)'}
                </button>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Main Tabbed Area */}
      <div className="rounded-xl bg-[#171719] border border-[#303035] overflow-hidden">
        {/* Navigation Tabs Header */}
        <div className="flex border-b border-[#303035] bg-[#141416] px-4">
          <button
            onClick={() => setActiveTab('transactions')}
            className={`px-4 py-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'transactions'
                ? 'border-[#FF7A1A] text-[#FF7A1A]'
                : 'border-transparent text-[#71717A] hover:text-[#F5F5F5]'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            Imported Transactions
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-[#1E1E21] text-[#A1A1AA]">
              {txTotal}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'history'
                ? 'border-[#FF7A1A] text-[#FF7A1A]'
                : 'border-transparent text-[#71717A] hover:text-[#F5F5F5]'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Synchronization History
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-[#1E1E21] text-[#A1A1AA]">
              {syncHistory.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('architecture')}
            className={`px-4 py-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'architecture'
                ? 'border-[#FF7A1A] text-[#FF7A1A]'
                : 'border-transparent text-[#71717A] hover:text-[#F5F5F5]'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Fintech Architecture & Compliance
          </button>
        </div>

        {/* TAB 1: TRANSACTIONS TABLE */}
        {activeTab === 'transactions' && (
          <div className="p-5 space-y-4">
            {/* Filter Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-1 max-w-md">
                <div className="relative w-full">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#71717A]" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by Payment ID, Payer, Narration..."
                    className="w-full bg-[#141416] border border-[#303035] rounded-lg pl-9 pr-3 py-1.5 text-xs text-[#F5F5F5] placeholder-[#71717A] focus:border-[#FF7A1A] outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={providerFilter}
                  onChange={(e) => setProviderFilter(e.target.value)}
                  className="bg-[#141416] border border-[#303035] text-[#A1A1AA] rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-[#FF7A1A]"
                >
                  <option value="all">All Data Sources</option>
                  <option value="razorpay">Razorpay Gateway</option>
                  <option value="bank_aa">Bank Account Aggregator</option>
                  <option value="gst">GST Business Data</option>
                  <option value="file_import">Uploaded Files (CSV/Excel)</option>
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-[#141416] border border-[#303035] text-[#A1A1AA] rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-[#FF7A1A]"
                >
                  <option value="all">All Statuses</option>
                  <option value="captured">Captured / Success</option>
                  <option value="authorized">Authorized</option>
                  <option value="failed">Failed</option>
                  <option value="filed">Filed</option>
                </select>
              </div>
            </div>

            {/* Transactions Data Table */}
            {transactions.length === 0 ? (
              <div className="py-16 text-center border border-dashed border-[#303035] rounded-xl bg-[#141416]/50 p-6">
                <CreditCard className="w-10 h-10 text-[#71717A] mx-auto mb-3 opacity-60" />
                <h3 className="text-sm font-bold text-[#F5F5F5]">No test payments found</h3>
                <p className="text-xs text-[#A1A1AA] max-w-md mx-auto mt-1">
                  No test payments found. Create a test transaction using the Razorpay-supported test workflow, then synchronize again.
                </p>
                <div className="mt-4 flex items-center justify-center gap-3">
                  <button
                    onClick={() => handleSyncData('razorpay')}
                    className="px-3.5 py-2 rounded-lg bg-[#FF7A1A] hover:bg-[#FF8F3D] text-[#0D0D0F] text-xs font-bold transition-all flex items-center gap-1.5 shadow"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Synchronize Razorpay Now
                  </button>
                  {summary?.integrations.find(i => i.provider === 'razorpay') && (
                    <button
                      onClick={() => openConfigModal(summary.integrations.find(i => i.provider === 'razorpay')!)}
                      className="px-3.5 py-2 rounded-lg bg-[#1E1E21] hover:bg-[#28282D] text-[#F5F5F5] border border-[#303035] text-xs font-medium"
                    >
                      Configure Test Keys
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-[#303035]">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#141416] text-[#71717A] border-b border-[#303035] uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Date & Time</th>
                      <th className="px-4 py-3 font-semibold">Provider & Provenance</th>
                      <th className="px-4 py-3 font-semibold">Transaction ID</th>
                      <th className="px-4 py-3 font-semibold">Payer / Counterparty</th>
                      <th className="px-4 py-3 font-semibold">Description</th>
                      <th className="px-4 py-3 font-semibold text-right">Amount</th>
                      <th className="px-4 py-3 font-semibold">Direction</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#252528] bg-[#171719]">
                    {transactions.map((tx) => (
                      <tr key={tx.transaction_id} className="hover:bg-[#1E1E21]/60 transition-colors">
                        <td className="px-4 py-3 text-[#A1A1AA] font-mono whitespace-nowrap">
                          {new Date(tx.transaction_date).toLocaleString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {tx.provider === 'file_import' || tx.source === 'FILE_IMPORT' ? (
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-[#FF7A1A] uppercase text-[11px] flex items-center gap-1">
                                <FileSpreadsheet className="w-3.5 h-3.5" /> File Import
                              </span>
                              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded border bg-[#332015] text-[#FF7A1A] border-[#75401F]">
                                FILE_UPLOAD
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-[#F5F5F5] uppercase text-[11px]">
                                {tx.provider === 'razorpay' ? 'Razorpay' : tx.provider === 'bank_aa' ? 'Bank AA' : 'GST'}
                              </span>
                              <span
                                className={`text-[9px] font-mono px-1.5 py-0.2 rounded border ${
                                  tx.source_environment === 'SANDBOX'
                                    ? 'bg-[#332015] text-[#FF7A1A] border-[#75401F]'
                                    : 'bg-[#1E1E21] text-[#A1A1AA] border-[#303035]'
                                }`}
                              >
                                {tx.source_environment}
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono text-[11px] text-[#A1A1AA] whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <span>{tx.external_id}</span>
                            <button
                              onClick={() => copyToClipboard(tx.external_id)}
                              className="text-[#71717A] hover:text-[#F5F5F5] p-0.5"
                              title="Copy transaction ID"
                            >
                              {copiedId === tx.external_id ? (
                                <Check className="w-3 h-3 text-[#22A477]" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-[#F5F5F5]">
                          <div className="truncate max-w-[180px]" title={tx.payer_email || tx.payer_contact || 'N/A'}>
                            {tx.payer_email || tx.payer_contact || 'Merchant Settlement'}
                          </div>
                          {tx.payment_method && (
                            <span className="text-[10px] text-[#71717A] uppercase font-mono">
                              via {tx.payment_method}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-[#A1A1AA] max-w-xs truncate" title={tx.description || ''}>
                          {tx.description || 'Settlement Transaction'}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-[#F5F5F5] whitespace-nowrap">
                          ₹{tx.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {tx.direction === 'INFLOW' ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#22A477] bg-[#142B21] px-2 py-0.5 rounded border border-[#1A4533]">
                              <ArrowDownLeft className="w-3 h-3" /> INFLOW
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#E8A23A] bg-[#332015] px-2 py-0.5 rounded border border-[#75401F]">
                              <ArrowUpRight className="w-3 h-3" /> OUTFLOW
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              tx.status === 'captured' || tx.status === 'SUCCESS' || tx.status === 'filed'
                                ? 'bg-[#142B21] text-[#22A477] border border-[#1A4533]'
                                : tx.status === 'authorized'
                                ? 'bg-[#332015] text-[#FF7A1A] border border-[#75401F]'
                                : 'bg-[#2C1717] text-[#EF5350] border border-[#522525]'
                            }`}
                          >
                            {tx.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: SYNC HISTORY AUDIT LOG */}
        {activeTab === 'history' && (
          <div className="p-5">
            {syncHistory.length === 0 ? (
              <div className="py-12 text-center text-[#71717A] text-xs">
                No synchronization runs recorded yet. Click "Sync" on any integration card to trigger a sync run.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-[#303035]">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#141416] text-[#71717A] border-b border-[#303035] uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Started At</th>
                      <th className="px-4 py-3 font-semibold">Provider</th>
                      <th className="px-4 py-3 font-semibold">Batch Correlation ID</th>
                      <th className="px-4 py-3 font-semibold text-center">Retrieved</th>
                      <th className="px-4 py-3 font-semibold text-center">Inserted</th>
                      <th className="px-4 py-3 font-semibold text-center">Updated</th>
                      <th className="px-4 py-3 font-semibold">Duration</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#252528] bg-[#171719]">
                    {syncHistory.map((run) => (
                      <tr key={run.sync_run_id} className="hover:bg-[#1E1E21]/60 transition-colors">
                        <td className="px-4 py-3 text-[#A1A1AA] font-mono whitespace-nowrap">
                          {new Date(run.started_at).toLocaleString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit'
                          })}
                        </td>
                        <td className="px-4 py-3 font-semibold text-[#F5F5F5] uppercase text-[11px]">
                          {run.provider === 'razorpay' ? 'Razorpay' : run.provider === 'bank_aa' ? 'Bank AA' : 'GST'}
                        </td>
                        <td className="px-4 py-3 font-mono text-[11px] text-[#71717A]">
                          {run.batch_id}
                        </td>
                        <td className="px-4 py-3 font-mono font-bold text-center text-[#F5F5F5]">
                          {run.records_retrieved}
                        </td>
                        <td className="px-4 py-3 font-mono font-bold text-center text-[#22A477]">
                          {run.records_inserted}
                        </td>
                        <td className="px-4 py-3 font-mono text-center text-[#A1A1AA]">
                          {run.records_updated}
                        </td>
                        <td className="px-4 py-3 text-[#A1A1AA] font-mono">
                          {run.duration_seconds !== null && run.duration_seconds !== undefined
                            ? `${run.duration_seconds}s`
                            : 'In-flight'}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              run.status === 'SUCCESS'
                                ? 'bg-[#142B21] text-[#22A477] border border-[#1A4533]'
                                : run.status === 'PARTIAL'
                                ? 'bg-[#332015] text-[#FF7A1A] border border-[#75401F]'
                                : 'bg-[#2C1717] text-[#EF5350] border border-[#522525]'
                            }`}
                          >
                            {run.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: FINTECH ARCHITECTURE & COMPLIANCE */}
        {activeTab === 'architecture' && (
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-[#141416] p-5 rounded-xl border border-[#303035] space-y-3">
                <div className="flex items-center gap-2.5 text-[#FF7A1A] font-bold text-sm">
                  <CreditCard className="w-5 h-5" />
                  Razorpay Sandbox Architecture
                </div>
                <p className="text-xs text-[#A1A1AA] leading-relaxed">
                  Integrates with official Razorpay Payments v1 API. Handles Basic Auth credentials securely, executes paginated settlement ingestion, validates HMAC-SHA256 webhook signatures, and ensures idempotent storage by <code className="text-[#FF7A1A] bg-[#221510] px-1 rounded">(provider, external_id)</code>.
                </p>
                <div className="pt-2 border-t border-[#252528] text-[11px] text-[#71717A] space-y-1">
                  <div>• Sub-unit conversion (paise to INR)</div>
                  <div>• Duplicate transaction rejection</div>
                  <div>• Real-time webhook listener support</div>
                </div>
              </div>

              <div className="bg-[#141416] p-5 rounded-xl border border-[#303035] space-y-3">
                <div className="flex items-center gap-2.5 text-blue-400 font-bold text-sm">
                  <Landmark className="w-5 h-5" />
                  ReBIT / Sahamati AA Framework
                </div>
                <p className="text-xs text-[#A1A1AA] leading-relaxed">
                  Follows RBI NBFC-AA master directions. Provides provider-independent consent management (Setu, Finvu, OneMoney). Borrower explicit authorization is verified prior to pulling encrypted financial data sessions.
                </p>
                <div className="pt-2 border-t border-[#252528] text-[11px] text-[#71717A] space-y-1">
                  <div>• Zero credential or internet banking scraping</div>
                  <div>• Granular consent lifetime (15m to 30d)</div>
                  <div>• Strictly tagged DEMO sandbox records</div>
                </div>
              </div>

              <div className="bg-[#141416] p-5 rounded-xl border border-[#303035] space-y-3">
                <div className="flex items-center gap-2.5 text-purple-400 font-bold text-sm">
                  <FileSpreadsheet className="w-5 h-5" />
                  GST Suvidha Provider (GSP) Protocol
                </div>
                <p className="text-xs text-[#A1A1AA] leading-relaxed">
                  Connects to authorized GSPs (Masters India, ClearTax, Vayana) for GSTR-1 outward B2B invoice telemetry. Enforces compliance: public GSTIN search is decoupled from private return access, which requires authorized GSP onboarding.
                </p>
                <div className="pt-2 border-t border-[#252528] text-[11px] text-[#71717A] space-y-1">
                  <div>• Direct e-Invoice & B2B outward verification</div>
                  <div>• Taxpayer OTP session requirement</div>
                  <div>• Reconciliation against loan repayments</div>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#1E1E21] border border-[#303035] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-6 h-6 text-[#22A477]" />
                <div>
                  <div className="text-xs font-bold text-[#F5F5F5]">Data Governance & Decision Support Safeguards</div>
                  <div className="text-[11px] text-[#A1A1AA]">
                    External financial telemetry is segregated into provenance-labeled records. Raw sandbox data is never used to silently re-score ML models without underwriting audit.
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MODAL 1: CONFIGURE PROVIDER CREDENTIALS */}
      {configModalProvider && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-[#171719] border border-[#303035] rounded-2xl p-6 shadow-2xl relative space-y-5">
            <div className="flex items-start justify-between border-b border-[#252528] pb-4">
              <div>
                <h3 className="text-base font-bold text-[#F5F5F5]">
                  Configure {configModalProvider.display_name}
                </h3>
                <p className="text-xs text-[#A1A1AA] mt-0.5">
                  Update API keys and environment settings securely in the backend.
                </p>
              </div>
              <button
                onClick={() => setConfigModalProvider(null)}
                className="text-[#71717A] hover:text-[#F5F5F5] text-sm p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveConfig} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-[#A1A1AA] block mb-1">
                  Target Environment
                </label>
                <select
                  value={configEnv}
                  onChange={(e) => setConfigEnv(e.target.value)}
                  className="w-full bg-[#141416] border border-[#303035] rounded-lg px-3 py-2 text-xs text-[#F5F5F5] outline-none focus:border-[#FF7A1A]"
                >
                  <option value="SANDBOX">SANDBOX (Test Mode)</option>
                  <option value="DEMO">DEMO (Offline Fallback)</option>
                  <option value="LIVE">LIVE (Production)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#A1A1AA] block mb-1">
                  {configModalProvider.provider === 'razorpay'
                    ? 'Razorpay Key ID (rzp_test_...)'
                    : 'Client ID / API Username'}
                </label>
                <input
                  type="text"
                  value={configKeyId}
                  onChange={(e) => setConfigKeyId(e.target.value)}
                  placeholder={
                    configModalProvider.provider === 'razorpay'
                      ? 'rzp_test_YourKeyHere'
                      : 'client_id_here'
                  }
                  required
                  className="w-full bg-[#141416] border border-[#303035] rounded-lg px-3 py-2 text-xs text-[#F5F5F5] font-mono outline-none focus:border-[#FF7A1A]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#A1A1AA] block mb-1">
                  {configModalProvider.provider === 'razorpay'
                    ? 'Razorpay Key Secret'
                    : 'Client Secret / Token'}
                </label>
                <div className="relative">
                  <input
                    type={showConfigSecret ? 'text' : 'password'}
                    value={configKeySecret}
                    onChange={(e) => setConfigKeySecret(e.target.value)}
                    placeholder="Enter secret key..."
                    required
                    className="w-full bg-[#141416] border border-[#303035] rounded-lg pl-3 pr-10 py-2 text-xs text-[#F5F5F5] font-mono outline-none focus:border-[#FF7A1A]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfigSecret(!showConfigSecret)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#71717A] hover:text-[#F5F5F5]"
                  >
                    {showConfigSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <span className="text-[10px] text-[#71717A] mt-1 block">
                  Secrets are hashed and stored in backend database. Never returned in browser responses.
                </span>
              </div>

              <div className="pt-3 border-t border-[#252528] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setConfigModalProvider(null)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-[#A1A1AA] hover:text-[#F5F5F5]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingConfig}
                  className="px-4 py-2 rounded-lg bg-[#FF7A1A] hover:bg-[#FF8F3D] text-[#0D0D0F] text-xs font-bold transition-all shadow disabled:opacity-50 flex items-center gap-2"
                >
                  {isSavingConfig ? 'Saving...' : 'Save Configuration'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: BANK AA CONSENT INITIATION */}
      {isConsentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-[#171719] border border-[#303035] rounded-2xl p-6 shadow-2xl relative space-y-5">
            <div className="flex items-start justify-between border-b border-[#252528] pb-4">
              <div>
                <h3 className="text-base font-bold text-[#F5F5F5] flex items-center gap-2">
                  <Landmark className="w-5 h-5 text-blue-400" />
                  Initiate Account Aggregator Consent
                </h3>
                <p className="text-xs text-[#A1A1AA] mt-0.5">
                  Requests borrower authorization to retrieve bank statements via ReBIT standard.
                </p>
              </div>
              <button
                onClick={() => {
                  setIsConsentModalOpen(false);
                  setConsentResult(null);
                }}
                className="text-[#71717A] hover:text-[#F5F5F5] text-sm p-1"
              >
                ✕
              </button>
            </div>

            {consentResult ? (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-[#142B21] border border-[#1A4533] text-xs space-y-2">
                  <div className="flex items-center gap-2 font-bold text-[#22A477]">
                    <CheckCircle2 className="w-4 h-4" /> Consent Dispatched Successfully
                  </div>
                  <div className="text-[#A1A1AA] font-mono text-[11px] space-y-1">
                    <div>Consent Handle: {consentResult.consent_handle}</div>
                    <div>Status: {consentResult.status}</div>
                    <div>Expires At: {new Date(consentResult.expires_at).toLocaleDateString()}</div>
                  </div>
                </div>

                <p className="text-xs text-[#A1A1AA]">
                  The borrower must now approve the consent request on their Account Aggregator app (Anumati, OneMoney, Setu).
                </p>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => {
                      setIsConsentModalOpen(false);
                      setConsentResult(null);
                    }}
                    className="px-4 py-2 rounded-lg bg-[#FF7A1A] text-[#0D0D0F] text-xs font-bold"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleDispatchConsent} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-[#A1A1AA] block mb-1">
                    Customer Identifier (Mobile or AA VPA)
                  </label>
                  <input
                    type="text"
                    value={consentCustomer}
                    onChange={(e) => setConsentCustomer(e.target.value)}
                    placeholder="e.g. 9876543210@sahamati"
                    required
                    className="w-full bg-[#141416] border border-[#303035] rounded-lg px-3 py-2 text-xs text-[#F5F5F5] font-mono outline-none focus:border-[#FF7A1A]"
                  />
                  <span className="text-[10px] text-[#71717A] mt-1 block">
                    Underwriter specifies the MSME promoter mobile or AA handle.
                  </span>
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#A1A1AA] block mb-1">
                    Statement History Duration: {consentMonths} Months
                  </label>
                  <input
                    type="range"
                    min={3}
                    max={24}
                    step={3}
                    value={consentMonths}
                    onChange={(e) => setConsentMonths(Number(e.target.value))}
                    className="w-full accent-[#FF7A1A]"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#A1A1AA] block mb-2">
                    Financial Information Scopes
                  </label>
                  <div className="grid grid-cols-3 gap-2 text-xs font-mono">
                    {['TRANSACTIONS', 'PROFILE', 'SUMMARY'].map((scope) => (
                      <div
                        key={scope}
                        className="p-2 rounded bg-[#141416] border border-[#252528] text-center text-[#22A477] font-semibold text-[11px]"
                      >
                        ✓ {scope}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-[#252528] flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsConsentModalOpen(false)}
                    className="px-4 py-2 rounded-lg text-xs font-semibold text-[#A1A1AA] hover:text-[#F5F5F5]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isDispatchingConsent}
                    className="px-4 py-2 rounded-lg bg-[#FF7A1A] hover:bg-[#FF8F3D] text-[#0D0D0F] text-xs font-bold transition-all shadow disabled:opacity-50 flex items-center gap-2"
                  >
                    {isDispatchingConsent ? 'Dispatching...' : 'Dispatch Consent Request'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
