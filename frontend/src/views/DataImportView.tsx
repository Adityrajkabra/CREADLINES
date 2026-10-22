import React, { useState, useEffect, useRef } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Download,
  Trash2,
  RefreshCw,
  Search,
  Filter,
  FileText,
  ShieldCheck,
  Building2,
  Calendar,
  Layers,
  ArrowRight,
  Database,
  Info,
  Clock,
  Sparkles,
  Check
} from 'lucide-react';
import {
  ImportedFile,
  FilePreviewResult,
  FileValidationResult,
  DatasetType,
  MSME,
  ActiveTab
} from '../types';
import { api } from '../services/api';

interface DataImportViewProps {
  selectedBorrower: MSME;
  onSelectBorrower?: (borrower: MSME) => void;
  allBorrowers?: MSME[];
  setActiveTab?: (tab: ActiveTab) => void;
}

const DATASET_TYPE_OPTIONS: { id: DatasetType; label: string; description: string }[] = [
  { id: 'BANK_TRANSACTIONS', label: 'Bank Transactions', description: 'Checking/current account statements with Debits, Credits, and Balances' },
  { id: 'REVENUE_EXPENSES', label: 'Revenue & Expenses', description: 'Accounting ledger tracking operational revenue, overhead, and operating costs' },
  { id: 'INVOICES', label: 'B2B Invoices & Bills', description: 'Commercial sales invoices, buyer receivables, and vendor payable vouchers' },
  { id: 'LOAN_REPAYMENTS', label: 'Loan Repayments', description: 'Debt repayment schedules, EMI debits, and interest amortization' },
  { id: 'GST_SUMMARY', label: 'GST Summary Returns', description: 'Monthly turnover, GSTR-1 outward supplies, and Input Tax Credit (ITC)' },
  { id: 'CUSTOM', label: 'Custom Financial Data', description: 'Generic multi-column financial journal or alternative transaction feed' },
];

const SAMPLE_CSV_CONTENT = `Transaction Date,Description,Debit,Credit,Balance,Reference,Counterparty
2026-03-01,Supplier Payment Auto Parts,45000,,120000,TXN_REF_101,Bosch Auto Spares
2026-03-02,Client Payment Inflow,,85000,205000,TXN_REF_102,Mahindra Workshop
2026-03-03,Utility Bill Electricity,12500,,192500,TXN_REF_103,State Power Corp
2026-03-04,Raw Material Castings,32000,,160500,TXN_REF_104,Precision Foundry
2026-03-05,Customer RTGS Transfer,,110000,270500,TXN_REF_105,Tata Motors Service
2026-03-06,Staff Salaries & Wages,65000,,205500,TXN_REF_106,CrediLens Payroll
2026-03-07,Duplicate Test Entry,12500,,193000,TXN_REF_103,State Power Corp
Invalid-Date,Faulty Row Demo,5000,,188000,TXN_REF_107,Demo Error Row
`;

export const DataImportView: React.FC<DataImportViewProps> = ({
  selectedBorrower,
  onSelectBorrower,
  allBorrowers = [],
  setActiveTab
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'upload' | 'history' | 'overview'>('upload');
  const [selectedMsmeId, setSelectedMsmeId] = useState<string>(selectedBorrower?.msme_id || 'MSME-1042');
  const [datasetType, setDatasetType] = useState<DatasetType>('BANK_TRANSACTIONS');

  // File upload & staging states
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState<boolean>(false);
  const [previewResult, setPreviewResult] = useState<FilePreviewResult | null>(null);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});

  // Validation states
  const [isValidating, setIsValidating] = useState<boolean>(false);
  const [validationResult, setValidationResult] = useState<FileValidationResult | null>(null);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [importSuccessMessage, setImportSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // History & Overview states
  const [importHistory, setImportHistory] = useState<ImportedFile[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);
  const [overviewSummary, setOverviewSummary] = useState<any>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadHistory();
    loadOverviewSummary();
  }, [selectedMsmeId]);

  const loadHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const data = await api.listImportedFiles();
      setImportHistory(data);
    } catch (err: any) {
      console.error('Failed to load import history', err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const loadOverviewSummary = async () => {
    try {
      const summary = await api.getDataManagementSummary();
      setOverviewSummary(summary);
    } catch (err) {
      console.error('Failed to load summary', err);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processSelectedFile(e.target.files[0]);
    }
  };

  const processSelectedFile = async (file: File) => {
    setSelectedFile(file);
    setErrorMessage(null);
    setImportSuccessMessage(null);
    setValidationResult(null);
    setIsLoadingPreview(true);

    try {
      const preview = await api.previewImportFile(file);
      setPreviewResult(preview);
      setColumnMapping(preview.suggested_mapping);
      if (preview.dataset_type) {
        setDatasetType(preview.dataset_type);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to inspect file. Ensure it is a valid CSV or Excel document.');
      setSelectedFile(null);
      setPreviewResult(null);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const loadSampleCSV = () => {
    const blob = new Blob([SAMPLE_CSV_CONTENT], { type: 'text/csv' });
    const sampleFile = new File([blob], 'metro_auto_parts_statement.csv', { type: 'text/csv' });
    processSelectedFile(sampleFile);
  };

  const handleRunValidation = async () => {
    if (!selectedFile || !previewResult) return;
    setIsValidating(true);
    setErrorMessage(null);

    try {
      const valRes = await api.validateImportFile(
        selectedFile,
        columnMapping,
        datasetType,
        selectedMsmeId
      );
      setValidationResult(valRes);
    } catch (err: any) {
      setErrorMessage(err.message || 'Validation failed. Please verify column mappings.');
    } finally {
      setIsValidating(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!validationResult) return;
    setIsImporting(true);
    setErrorMessage(null);

    try {
      const execRes = await api.confirmFileImport(validationResult.file_id);
      setImportSuccessMessage(
        `Successfully committed ${execRes.records_inserted} transactions into the unified financial data layer (${execRes.records_skipped} duplicates skipped).`
      );
      // Refresh history and overview
      loadHistory();
      loadOverviewSummary();
      // Reset staging
      setSelectedFile(null);
      setPreviewResult(null);
      setValidationResult(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to execute import. Please try again.');
    } finally {
      setIsImporting(false);
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    if (!window.confirm('Are you sure you want to rollback and delete this imported file and all its associated transactions?')) {
      return;
    }
    try {
      await api.deleteImportedFile(fileId);
      loadHistory();
      loadOverviewSummary();
    } catch (err: any) {
      alert(`Failed to delete file: ${err.message}`);
    }
  };

  const currentBorrowerObj = allBorrowers.find(b => b.msme_id === selectedMsmeId) || selectedBorrower;

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#171719] border border-[#303035] p-5 rounded-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#332015] text-[#FF7A1A] border border-[#75401F]">
              Data Management Hub
            </span>
            <span className="text-xs text-[#71717A]">•</span>
            <span className="text-xs text-[#A1A1AA] flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-[#22A477]" />
              Formula & Macro Injection Protected
            </span>
          </div>
          <h1 className="text-2xl font-bold text-[#F5F5F5] tracking-tight">
            Import Financial Data
          </h1>
          <p className="text-xs text-[#A1A1AA] mt-1 max-w-2xl">
            Upload CSV or Excel bank statements, accounting ledgers, invoices, and GST files.
            All records are validated, normalized, and unified with external provider feeds.
          </p>
        </div>

        {/* Quick Nav Switches */}
        <div className="flex items-center gap-2">
          {setActiveTab && (
            <button
              onClick={() => setActiveTab('data-connections')}
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#1E1E21] hover:bg-[#2A2A2E] border border-[#303035] text-[#F5F5F5] text-xs font-medium transition-colors"
            >
              <Database className="w-4 h-4 text-[#FF7A1A]" />
              <span>Connect Data Sources</span>
            </button>
          )}
          <button
            onClick={() => {
              loadHistory();
              loadOverviewSummary();
            }}
            className="p-2 rounded-lg bg-[#1E1E21] hover:bg-[#2A2A2E] border border-[#303035] text-[#A1A1AA] hover:text-[#F5F5F5] transition-colors"
            title="Refresh Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Top Summary Metrics Strip */}
      {overviewSummary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-[#171719] border border-[#303035] p-4 rounded-xl">
            <div className="text-[11px] text-[#A1A1AA] font-medium flex items-center justify-between">
              <span>Total Imported Files</span>
              <FileSpreadsheet className="w-4 h-4 text-[#FF7A1A]" />
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums text-[#F5F5F5] mt-1">
              {overviewSummary.total_imported_files}
            </div>
            <div className="text-[11px] text-[#71717A] mt-1">
              {overviewSummary.imported_file_transactions} file transactions
            </div>
          </div>

          <div className="bg-[#171719] border border-[#303035] p-4 rounded-xl">
            <div className="text-[11px] text-[#A1A1AA] font-medium flex items-center justify-between">
              <span>Connected Feeds</span>
              <Database className="w-4 h-4 text-[#22A477]" />
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums text-[#F5F5F5] mt-1">
              {overviewSummary.connected_providers} <span className="text-xs font-normal text-[#71717A]">/ {overviewSummary.total_providers}</span>
            </div>
            <div className="text-[11px] text-[#71717A] mt-1">
              {overviewSummary.provider_transactions} provider transactions
            </div>
          </div>

          <div className="bg-[#171719] border border-[#303035] p-4 rounded-xl">
            <div className="text-[11px] text-[#A1A1AA] font-medium flex items-center justify-between">
              <span>Unified Data Layer</span>
              <Layers className="w-4 h-4 text-[#FF7A1A]" />
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums text-[#F5F5F5] mt-1">
              {overviewSummary.total_transactions}
            </div>
            <div className="text-[11px] text-[#71717A] mt-1">
              Combined ledger records
            </div>
          </div>

          <div className="bg-[#171719] border border-[#303035] p-4 rounded-xl">
            <div className="text-[11px] text-[#A1A1AA] font-medium flex items-center justify-between">
              <span>Data Quality Status</span>
              <CheckCircle2 className={`w-4 h-4 ${overviewSummary.data_quality.status === 'EXCELLENT' ? 'text-[#22A477]' : 'text-[#E8A23A]'}`} />
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums text-[#22A477] mt-1">
              {overviewSummary.data_quality.valid_rate}%
            </div>
            <div className="text-[11px] text-[#71717A] mt-1">
              Quality Grade: <span className="font-semibold text-[#F5F5F5]">{overviewSummary.data_quality.status}</span>
            </div>
          </div>
        </div>
      )}

      {/* Sub Tabs */}
      <div className="flex border-b border-[#303035] gap-4">
        <button
          onClick={() => setActiveSubTab('upload')}
          className={`pb-3 text-xs font-semibold tracking-wide transition-all border-b-2 flex items-center gap-2 ${
            activeSubTab === 'upload'
              ? 'border-[#FF7A1A] text-[#FF7A1A]'
              : 'border-transparent text-[#A1A1AA] hover:text-[#F5F5F5]'
          }`}
        >
          <UploadCloud className="w-4 h-4" />
          <span>Upload & Map Data</span>
        </button>

        <button
          onClick={() => setActiveSubTab('history')}
          className={`pb-3 text-xs font-semibold tracking-wide transition-all border-b-2 flex items-center gap-2 ${
            activeSubTab === 'history'
              ? 'border-[#FF7A1A] text-[#FF7A1A]'
              : 'border-transparent text-[#A1A1AA] hover:text-[#F5F5F5]'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Import History & Audit Log ({importHistory.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('overview')}
          className={`pb-3 text-xs font-semibold tracking-wide transition-all border-b-2 flex items-center gap-2 ${
            activeSubTab === 'overview'
              ? 'border-[#FF7A1A] text-[#FF7A1A]'
              : 'border-transparent text-[#A1A1AA] hover:text-[#F5F5F5]'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Unified Data Management Overview</span>
        </button>
      </div>

      {/* Feedback Messages */}
      {importSuccessMessage && (
        <div className="bg-[#10241A] border border-[#1B4D36] p-4 rounded-xl flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-[#22A477] shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-bold text-[#22A477]">Import Completed Successfully</h4>
            <p className="text-xs text-[#A1A1AA] mt-0.5">{importSuccessMessage}</p>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="bg-[#2A1414] border border-[#522020] p-4 rounded-xl flex items-start gap-3">
          <XCircle className="w-5 h-5 text-[#EF5350] shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-bold text-[#EF5350]">Validation / Upload Error</h4>
            <p className="text-xs text-[#A1A1AA] mt-0.5">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* ================= TAB 1: UPLOAD & MAP ================= */}
      {activeSubTab === 'upload' && (
        <div className="space-y-6">
          {/* Target Borrower & Dataset Setup */}
          <div className="bg-[#171719] border border-[#303035] p-5 rounded-xl">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#A1A1AA] mb-4">
              Step 1: Ingestion Target & Dataset Classification
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#F5F5F5] mb-1.5">
                  Target Borrower (MSME)
                </label>
                <div className="relative">
                  <select
                    value={selectedMsmeId}
                    onChange={(e) => {
                      setSelectedMsmeId(e.target.value);
                      const found = allBorrowers.find(b => b.msme_id === e.target.value);
                      if (found && onSelectBorrower) onSelectBorrower(found);
                    }}
                    className="w-full bg-[#1E1E21] border border-[#303035] rounded-lg px-3 py-2 text-xs text-[#F5F5F5] focus:outline-none focus:border-[#FF7A1A]"
                  >
                    {allBorrowers.map((b) => (
                      <option key={b.msme_id} value={b.msme_id}>
                        {b.msme_id} — {b.business_name} ({b.sector})
                      </option>
                    ))}
                  </select>
                </div>
                <p className="text-[11px] text-[#71717A] mt-1">
                  Transactions will be associated with this enterprise in the risk scoring engine.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#F5F5F5] mb-1.5">
                  Dataset Category
                </label>
                <select
                  value={datasetType}
                  onChange={(e) => setDatasetType(e.target.value as DatasetType)}
                  className="w-full bg-[#1E1E21] border border-[#303035] rounded-lg px-3 py-2 text-xs text-[#F5F5F5] focus:outline-none focus:border-[#FF7A1A]"
                >
                  {DATASET_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-[#71717A] mt-1">
                  {DATASET_TYPE_OPTIONS.find(o => o.id === datasetType)?.description}
                </p>
              </div>
            </div>
          </div>

          {/* Upload Dropzone */}
          <div className="bg-[#171719] border border-[#303035] p-5 rounded-xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#A1A1AA]">
                Step 2: Upload File (CSV, XLSX, XLS)
              </h3>
              <button
                type="button"
                onClick={loadSampleCSV}
                className="text-xs text-[#FF7A1A] hover:underline flex items-center gap-1 font-medium"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Load Sample Bank Statement</span>
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".csv, .xlsx, .xls"
              onChange={handleFileInput}
              className="hidden"
            />

            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                dragActive
                  ? 'border-[#FF7A1A] bg-[#221711]'
                  : selectedFile
                  ? 'border-[#22A477] bg-[#111915]'
                  : 'border-[#303035] hover:border-[#FF7A1A] hover:bg-[#1A1A1D]'
              }`}
            >
              <div className="w-12 h-12 rounded-full bg-[#1E1E21] border border-[#303035] flex items-center justify-center mx-auto mb-3">
                <UploadCloud className={`w-6 h-6 ${selectedFile ? 'text-[#22A477]' : 'text-[#FF7A1A]'}`} />
              </div>

              {selectedFile ? (
                <div>
                  <div className="text-sm font-bold text-[#F5F5F5]">{selectedFile.name}</div>
                  <div className="text-xs text-[#A1A1AA] mt-1">
                    {roundSize(selectedFile.size)} • Click to replace file
                  </div>
                </div>
              ) : (
                <div>
                  <div className="text-sm font-semibold text-[#F5F5F5]">
                    Drag and drop your financial statement here, or <span className="text-[#FF7A1A] underline">Browse Files</span>
                  </div>
                  <div className="text-xs text-[#71717A] mt-1">
                    Supports .CSV, .XLSX, and .XLS up to 20 MB (max 10,000 rows).
                  </div>
                </div>
              )}
            </div>

            {isLoadingPreview && (
              <div className="flex items-center justify-center gap-2 py-4 text-xs text-[#A1A1AA]">
                <RefreshCw className="w-4 h-4 animate-spin text-[#FF7A1A]" />
                <span>Analyzing file structure and headers...</span>
              </div>
            )}
          </div>

          {/* Step 3: Column Mapping & Data Preview */}
          {previewResult && (
            <div className="bg-[#171719] border border-[#303035] p-5 rounded-xl space-y-5">
              <div className="flex items-center justify-between border-b border-[#303035] pb-3">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#A1A1AA]">
                    Step 3: Column Mapping & Field Identification
                  </h3>
                  <p className="text-xs text-[#71717A] mt-0.5">
                    Match columns from <span className="text-[#F5F5F5] font-mono">{previewResult.filename}</span> to CrediLens standard fields.
                  </p>
                </div>
                <div className="text-xs text-[#A1A1AA]">
                  Estimated Rows: <span className="text-[#F5F5F5] font-mono font-bold">{previewResult.total_rows_estimate}</span>
                </div>
              </div>

              {/* Mapping Selector Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {previewResult.credilens_fields.map((f) => {
                  const mappedCol = columnMapping[f.key] || '';
                  const isMapped = Boolean(mappedCol);
                  return (
                    <div
                      key={f.key}
                      className={`p-3 rounded-lg border text-xs ${
                        isMapped
                          ? 'bg-[#1E1E21] border-[#303035]'
                          : f.required
                          ? 'bg-[#221616] border-[#522020]'
                          : 'bg-[#141416] border-[#252528]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-[#F5F5F5] flex items-center gap-1.5">
                          {f.label}
                          {f.required && <span className="text-[#EF5350]">*</span>}
                        </span>
                        {isMapped ? (
                          <span className="text-[10px] text-[#22A477] bg-[#10241A] px-1.5 py-0.2 rounded border border-[#1B4D36] flex items-center gap-1">
                            <Check className="w-3 h-3" /> Mapped
                          </span>
                        ) : f.required ? (
                          <span className="text-[10px] text-[#EF5350] bg-[#2A1414] px-1.5 py-0.2 rounded border border-[#522020]">
                            Required
                          </span>
                        ) : (
                          <span className="text-[10px] text-[#71717A]">Optional</span>
                        )}
                      </div>

                      <select
                        value={mappedCol}
                        onChange={(e) => {
                          setColumnMapping(prev => ({
                            ...prev,
                            [f.key]: e.target.value
                          }));
                          // Invalidate previous validation
                          setValidationResult(null);
                        }}
                        className="w-full bg-[#141416] border border-[#303035] rounded px-2.5 py-1.5 text-xs text-[#F5F5F5] mt-1.5 focus:outline-none focus:border-[#FF7A1A]"
                      >
                        <option value="">-- Not Mapped --</option>
                        {previewResult.detected_columns.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>

                      <p className="text-[10px] text-[#71717A] mt-1 truncate">
                        {f.description}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Sample Rows Preview Table */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-[#A1A1AA] flex items-center justify-between">
                  <span>File Data Preview (First {previewResult.sample_rows.length} rows)</span>
                  <span className="text-[11px] text-[#71717A]">Preview only • uncommitted</span>
                </div>

                <div className="border border-[#303035] rounded-lg overflow-x-auto max-h-64">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-[#1E1E21] text-[#A1A1AA] sticky top-0 border-b border-[#303035]">
                      <tr>
                        <th className="p-2 font-mono text-[10px] text-[#71717A] w-12">#</th>
                        {previewResult.detected_columns.map(col => (
                          <th key={col} className="p-2 font-semibold whitespace-nowrap">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#2A2A2E]">
                      {previewResult.sample_rows.map((row, idx) => (
                        <tr key={idx} className="hover:bg-[#1A1A1D]">
                          <td className="p-2 font-mono text-[10px] text-[#71717A]">{idx + 1}</td>
                          {previewResult.detected_columns.map(col => (
                            <td key={col} className="p-2 text-[#D4D4D8] whitespace-nowrap font-mono text-[11px]">
                              {row[col] !== null && row[col] !== undefined ? String(row[col]) : '-'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Validation Trigger Button */}
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={handleRunValidation}
                  disabled={isValidating}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#FF7A1A] hover:bg-[#FF8F3D] text-[#0D0D0F] font-bold text-xs transition-colors shadow-fin-sm disabled:opacity-50"
                >
                  {isValidating ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Validating Rows...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Validate Dataset & Check Quality</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Validation Results & Confirmation */}
          {validationResult && (
            <div className="bg-[#171719] border border-[#303035] p-5 rounded-xl space-y-5">
              <div className="flex items-center justify-between border-b border-[#303035] pb-3">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#A1A1AA]">
                    Step 4: Quality Gate & Confirmation
                  </h3>
                  <p className="text-xs text-[#71717A] mt-0.5">
                    Review validation statistics before importing into the database.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {validationResult.errors.length > 0 && (
                    <a
                      href={`/api/imports/${validationResult.file_id}/error-report`}
                      download
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#1E1E21] hover:bg-[#2A2A2E] border border-[#303035] text-[#F5F5F5] text-xs font-medium transition-colors"
                    >
                      <Download className="w-3.5 h-3.5 text-[#EF5350]" />
                      <span>Download Error Report ({validationResult.total_errors})</span>
                    </a>
                  )}
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3 rounded-lg bg-[#1E1E21] border border-[#303035]">
                  <div className="text-[11px] text-[#A1A1AA]">Total Rows Scanned</div>
                  <div className="text-xl font-bold font-mono text-[#F5F5F5] mt-1">
                    {validationResult.total_rows}
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-[#10241A] border border-[#1B4D36]">
                  <div className="text-[11px] text-[#22A477] font-semibold">Valid Rows (Importable)</div>
                  <div className="text-xl font-bold font-mono text-[#22A477] mt-1">
                    {validationResult.valid_rows}
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-[#2A1414] border border-[#522020]">
                  <div className="text-[11px] text-[#EF5350] font-semibold">Invalid / Corrupted Rows</div>
                  <div className="text-xl font-bold font-mono text-[#EF5350] mt-1">
                    {validationResult.invalid_rows}
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-[#2A1E14] border border-[#523A20]">
                  <div className="text-[11px] text-[#E8A23A] font-semibold">Duplicates Detected</div>
                  <div className="text-xl font-bold font-mono text-[#E8A23A] mt-1">
                    {validationResult.duplicate_rows}
                  </div>
                </div>
              </div>

              {/* Error Detail Table (if any) */}
              {validationResult.errors.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-bold text-[#EF5350] flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Rejected Rows Breakdown (First {validationResult.errors.length} shown)</span>
                  </div>

                  <div className="border border-[#522020] rounded-lg overflow-x-auto max-h-48 bg-[#1A1212]">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-[#2A1414] text-[#EF5350] sticky top-0 border-b border-[#522020]">
                        <tr>
                          <th className="p-2 font-mono">Row #</th>
                          <th className="p-2">Column</th>
                          <th className="p-2">Error Type</th>
                          <th className="p-2">Raw Value</th>
                          <th className="p-2">Reason</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#3A1E1E]">
                        {validationResult.errors.map((err, i) => (
                          <tr key={i}>
                            <td className="p-2 font-mono text-[#A1A1AA]">{err.row_number}</td>
                            <td className="p-2 font-mono text-[#F5F5F5]">{err.column || '-'}</td>
                            <td className="p-2 text-[10px] font-bold uppercase text-[#EF5350]">{err.error_type}</td>
                            <td className="p-2 font-mono text-xs text-[#A1A1AA]">{err.raw_value || '-'}</td>
                            <td className="p-2 text-xs text-[#D4D4D8]">{err.message}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Confirmation Action */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-3 border-t border-[#303035]">
                <div className="text-xs text-[#A1A1AA]">
                  {validationResult.can_import ? (
                    <span className="flex items-center gap-1.5 text-[#22A477]">
                      <CheckCircle2 className="w-4 h-4" />
                      Ready to ingest {validationResult.valid_rows} verified records for {currentBorrowerObj.business_name}.
                    </span>
                  ) : (
                    <span className="text-[#EF5350]">
                      No importable rows found. Please review column mappings or fix file formatting.
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setValidationResult(null)}
                    className="px-4 py-2 rounded-lg bg-[#1E1E21] hover:bg-[#2A2A2E] border border-[#303035] text-[#A1A1AA] hover:text-[#F5F5F5] text-xs font-medium transition-colors"
                  >
                    Adjust Mapping
                  </button>

                  <button
                    type="button"
                    onClick={handleConfirmImport}
                    disabled={!validationResult.can_import || isImporting}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[#FF7A1A] hover:bg-[#FF8F3D] text-[#0D0D0F] font-bold text-xs transition-colors shadow-fin-sm disabled:opacity-50"
                  >
                    {isImporting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Committing to Data Layer...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Confirm & Import Valid Records</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 2: IMPORT HISTORY ================= */}
      {activeSubTab === 'history' && (
        <div className="bg-[#171719] border border-[#303035] rounded-xl overflow-hidden">
          <div className="p-4 border-b border-[#303035] flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#A1A1AA]">
                Imported Financial Files History
              </h3>
              <p className="text-xs text-[#71717A] mt-0.5">
                Audit trail of all uploaded files, validation rates, and ingested records.
              </p>
            </div>
            <button
              onClick={loadHistory}
              className="p-1.5 rounded-lg bg-[#1E1E21] hover:bg-[#2A2A2E] text-[#A1A1AA] hover:text-[#F5F5F5] transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {isLoadingHistory ? (
            <div className="p-8 text-center text-xs text-[#A1A1AA]">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#FF7A1A]" />
              Loading file audit log...
            </div>
          ) : importHistory.length === 0 ? (
            <div className="p-12 text-center text-xs text-[#71717A]">
              <FileSpreadsheet className="w-8 h-8 text-[#303035] mx-auto mb-2" />
              <div>No financial files have been uploaded yet.</div>
              <div className="mt-1">Use the "Upload & Map Data" tab to ingest your first statement.</div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#1E1E21] text-[#A1A1AA] border-b border-[#303035]">
                  <tr>
                    <th className="p-3 font-semibold">Filename</th>
                    <th className="p-3 font-semibold">Format</th>
                    <th className="p-3 font-semibold">Dataset Type</th>
                    <th className="p-3 font-semibold">Borrower ID</th>
                    <th className="p-3 font-semibold text-right">Valid Rows</th>
                    <th className="p-3 font-semibold text-right">Invalid</th>
                    <th className="p-3 font-semibold text-right">Duplicates</th>
                    <th className="p-3 font-semibold">Status</th>
                    <th className="p-3 font-semibold">Import Date</th>
                    <th className="p-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2A2A2E]">
                  {importHistory.map((item) => (
                    <tr key={item.file_id} className="hover:bg-[#1A1A1D]">
                      <td className="p-3 font-semibold text-[#F5F5F5]">
                        <div className="flex items-center gap-2">
                          <FileSpreadsheet className="w-4 h-4 text-[#FF7A1A] shrink-0" />
                          <span className="truncate max-w-xs">{item.filename}</span>
                        </div>
                      </td>
                      <td className="p-3">
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#1E1E21] text-[#A1A1AA] border border-[#303035]">
                          {item.file_type}
                        </span>
                      </td>
                      <td className="p-3 text-[#A1A1AA]">{item.dataset_type}</td>
                      <td className="p-3 font-mono text-[#D4D4D8]">{item.msme_id || 'MSME-1042'}</td>
                      <td className="p-3 text-right font-mono text-[#22A477] font-bold">
                        {item.valid_rows}
                      </td>
                      <td className="p-3 text-right font-mono text-[#EF5350]">
                        {item.invalid_rows}
                      </td>
                      <td className="p-3 text-right font-mono text-[#E8A23A]">
                        {item.duplicate_rows}
                      </td>
                      <td className="p-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${
                          item.status === 'IMPORTED'
                            ? 'bg-[#10241A] text-[#22A477] border-[#1B4D36]'
                            : item.status === 'PARTIALLY_IMPORTED'
                            ? 'bg-[#2A1E14] text-[#E8A23A] border-[#523A20]'
                            : 'bg-[#2A1414] text-[#EF5350] border-[#522020]'
                        }`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="p-3 text-[#71717A] text-[11px] whitespace-nowrap">
                        {item.imported_at ? formatDate(item.imported_at) : formatDate(item.created_at)}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {item.invalid_rows > 0 && (
                            <a
                              href={`/api/imports/${item.file_id}/error-report`}
                              download
                              className="p-1 rounded bg-[#1E1E21] hover:bg-[#2A2A2E] text-[#A1A1AA] hover:text-[#EF5350]"
                              title="Download Error Report"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </a>
                          )}
                          <button
                            onClick={() => handleDeleteFile(item.file_id)}
                            className="p-1 rounded bg-[#1E1E21] hover:bg-[#2A1414] text-[#71717A] hover:text-[#EF5350] transition-colors"
                            title="Rollback & Delete Imported Records"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 3: UNIFIED OVERVIEW ================= */}
      {activeSubTab === 'overview' && overviewSummary && (
        <div className="space-y-6">
          {/* Architecture Coexistence Diagram */}
          <div className="bg-[#171719] border border-[#303035] p-5 rounded-xl">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#A1A1AA] mb-2">
              Unified Financial Data Architecture
            </h3>
            <p className="text-xs text-[#71717A] mb-4">
              How external providers and file imports feed into the unified data layer:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-[#1E1E21] border border-[#303035]">
                <div className="flex items-center gap-2 mb-2">
                  <Database className="w-4 h-4 text-[#FF7A1A]" />
                  <span className="font-bold text-[#F5F5F5]">1. Connected Providers</span>
                </div>
                <p className="text-[#A1A1AA] text-[11px] leading-relaxed">
                  Real-time webhook and sandbox synchronization from Razorpay, RBI Account Aggregators, and GST Suvidha Providers.
                  Tagged with verified provenance (`RAZORPAY_SANDBOX`, `ACCOUNT_AGGREGATOR_DEMO`).
                </p>
                <div className="mt-3 pt-3 border-t border-[#2A2A2E] flex justify-between text-[11px]">
                  <span className="text-[#71717A]">Active Feeds:</span>
                  <span className="font-mono text-[#22A477] font-bold">{overviewSummary.connected_providers}</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#1E1E21] border border-[#303035]">
                <div className="flex items-center gap-2 mb-2">
                  <UploadCloud className="w-4 h-4 text-[#FF7A1A]" />
                  <span className="font-bold text-[#F5F5F5]">2. File Import Engine</span>
                </div>
                <p className="text-[#A1A1AA] text-[11px] leading-relaxed">
                  Uploaded CSV, XLSX, and XLS files processed with formula sanitization, column mapping, and duplicate detection.
                  Strictly labeled as `source="FILE_IMPORT"` to preserve data provenance.
                </p>
                <div className="mt-3 pt-3 border-t border-[#2A2A2E] flex justify-between text-[11px]">
                  <span className="text-[#71717A]">Files Ingested:</span>
                  <span className="font-mono text-[#FF7A1A] font-bold">{overviewSummary.total_imported_files}</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#1E1E21] border border-[#303035]">
                <div className="flex items-center gap-2 mb-2">
                  <Layers className="w-4 h-4 text-[#22A477]" />
                  <span className="font-bold text-[#F5F5F5]">3. Common Data Layer</span>
                </div>
                <p className="text-[#A1A1AA] text-[11px] leading-relaxed">
                  Single normalized `financial_transactions` table with debit/credit direction, reference deduplication, and borrower association.
                  Provides non-double-counted cash flow signals to the ML risk engine.
                </p>
                <div className="mt-3 pt-3 border-t border-[#2A2A2E] flex justify-between text-[11px]">
                  <span className="text-[#71717A]">Total Records:</span>
                  <span className="font-mono text-[#22A477] font-bold">{overviewSummary.total_transactions}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Unified Activity Timeline */}
          <div className="bg-[#171719] border border-[#303035] rounded-xl overflow-hidden">
            <div className="p-4 border-b border-[#303035]">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#A1A1AA]">
                Recent Ingestion & Synchronization Activity
              </h3>
              <p className="text-xs text-[#71717A] mt-0.5">
                Real-time chronological log of provider syncs and file uploads.
              </p>
            </div>

            {overviewSummary.recent_activity.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#71717A]">
                No recent synchronization or import activity recorded.
              </div>
            ) : (
              <div className="divide-y divide-[#2A2A2E]">
                {overviewSummary.recent_activity.map((act: any, i: number) => (
                  <div key={i} className="p-3.5 flex items-center justify-between text-xs hover:bg-[#1A1A1D]">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${
                        act.activity_type === 'PROVIDER_SYNC'
                          ? 'bg-[#1E1E21] text-[#FF7A1A]'
                          : 'bg-[#221616] text-[#22A477]'
                      }`}>
                        {act.activity_type === 'PROVIDER_SYNC' ? (
                          <Database className="w-4 h-4" />
                        ) : (
                          <FileSpreadsheet className="w-4 h-4" />
                        )}
                      </div>
                      <div>
                        <div className="font-semibold text-[#F5F5F5] flex items-center gap-2">
                          <span>{act.source_name}</span>
                          <span className={`text-[10px] font-bold uppercase px-1.5 py-0.2 rounded border ${
                            act.status === 'SUCCESS' || act.status === 'IMPORTED'
                              ? 'bg-[#10241A] text-[#22A477] border-[#1B4D36]'
                              : 'bg-[#2A1414] text-[#EF5350] border-[#522020]'
                          }`}>
                            {act.status}
                          </span>
                        </div>
                        <div className="text-[11px] text-[#71717A] mt-0.5">
                          {act.activity_type === 'PROVIDER_SYNC' ? 'Provider Sync' : 'File Upload'} • {act.details || '-'}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-mono text-[#F5F5F5] font-semibold">
                        +{act.count} txns
                      </div>
                      <div className="text-[10px] text-[#71717A] mt-0.5">
                        {formatDate(act.timestamp)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

function roundSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDate(isoStr?: string | null): string {
  if (!isoStr) return '-';
  try {
    const d = new Date(isoStr);
    return d.toLocaleString('en-IN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return isoStr;
  }
}
