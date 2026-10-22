import React, { useState, useEffect } from 'react';
import { ActiveTab, MSME, OverviewData } from './types';
import { api } from './services/api';
import { FALLBACK_PRIMARY_MSMES } from './data/fallbackData';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { GlobalSearchModal } from './components/GlobalSearchModal';
import { Chatbot } from './components/Chatbot';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AuthView } from './views/AuthView';

import { LandingView } from './views/LandingView';
import { OverviewView } from './views/OverviewView';
import { PortfolioView } from './views/PortfolioView';
import { BorrowerAnalysisView } from './views/BorrowerAnalysisView';
import { CashFlowView } from './views/CashFlowView';
import { WhatIfLabView } from './views/WhatIfLabView';
import { SegmentationView } from './views/SegmentationView';
import { FairnessMonitorView } from './views/FairnessMonitorView';
import { ModelMonitorView } from './views/ModelMonitorView';
import { DataConnectionsView } from './views/DataConnectionsView';
import { DataImportView } from './views/DataImportView';
import { ReportModal } from './views/ReportModal';

const CrediLensDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('landing');
  const [msmes, setMsmes] = useState<MSME[]>([]);
  const [selectedBorrower, setSelectedBorrower] = useState<MSME>(FALLBACK_PRIMARY_MSMES[0]); // Metro Auto Parts
  const [overviewData, setOverviewData] = useState<OverviewData | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [isReportOpen, setIsReportOpen] = useState<boolean>(false);
  const [isFallbackMode, setIsFallbackMode] = useState<boolean>(api.isFallbackMode);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  // Initialize data and listeners
  useEffect(() => {
    const unsub = api.subscribeStatus((fallback) => {
      setIsFallbackMode(fallback);
    });

    const init = async () => {
      try {
        const [ov, list] = await Promise.all([
          api.getOverview(),
          api.getMSMEs()
        ]);
        setOverviewData(ov);
        setMsmes(list.msmes);
        const metro = list.msmes.find(m => m.msme_id === 'MSME-1042') || list.msmes[0];
        setSelectedBorrower(metro);
      } finally {
        setIsLoading(false);
      }
    };

    init();
    return () => unsub();
  }, []);

  // Keyboard shortcut Ctrl+K / Cmd+K for global search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(prev => !prev);
      } else if (e.key === 'Escape') {
        setIsSearchOpen(false);
        setIsReportOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSelectBorrower = (msme: MSME) => {
    setSelectedBorrower(msme);
    setActiveTab('borrower-analysis');
  };

  const handleSelectBorrowerById = (id: string) => {
    const found = msmes.find(m => m.msme_id === id);
    if (found) {
      handleSelectBorrower(found);
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0D0D0F] text-[#F5F5F5] font-sans">
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isFallbackMode={isFallbackMode}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(prev => !prev)}
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden bg-[#0D0D0F]">
        {/* Header Bar */}
        <Header
          activeTab={activeTab}
          selectedBorrower={selectedBorrower}
          onOpenSearch={() => setIsSearchOpen(true)}
          isFallbackMode={isFallbackMode}
          onToggleMobileMenu={() => setIsMobileMenuOpen(true)}
        />

        {/* Viewport Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#0D0D0F]">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center space-y-3">
                <div className="w-8 h-8 border-2 border-[#FF7A1A] border-t-transparent rounded-full animate-spin mx-auto" />
                <div className="text-xs font-mono text-[#A1A1AA]">Loading CrediLens Intelligence Engine...</div>
              </div>
            </div>
          ) : (
            <>
              {activeTab === 'landing' && (
                <LandingView
                  onAnalyze={(id) => {
                    if (id) handleSelectBorrowerById(id);
                    else setActiveTab('borrower-analysis');
                  }}
                  onViewPortfolio={() => setActiveTab('portfolio')}
                  featuredMSME={selectedBorrower}
                />
              )}

              {activeTab === 'overview' && overviewData && (
                <OverviewView
                  data={overviewData}
                  onSelectBorrowerById={handleSelectBorrowerById}
                  onNavigateToPortfolio={() => setActiveTab('portfolio')}
                />
              )}

              {activeTab === 'portfolio' && (
                <PortfolioView
                  msmes={msmes}
                  onSelectBorrower={handleSelectBorrower}
                />
              )}

              {activeTab === 'borrower-analysis' && (
                <BorrowerAnalysisView
                  borrower={selectedBorrower}
                  onOpenReport={() => setIsReportOpen(true)}
                  onNavigateToWhatIf={() => setActiveTab('what-if-lab')}
                  onNavigateToCashflow={() => setActiveTab('cash-flow')}
                />
              )}

              {activeTab === 'cash-flow' && (
                <CashFlowView
                  borrower={selectedBorrower}
                  onNavigateToWhatIf={() => setActiveTab('what-if-lab')}
                />
              )}

              {activeTab === 'what-if-lab' && (
                <WhatIfLabView
                  borrower={selectedBorrower}
                />
              )}

              {activeTab === 'segmentation' && (
                <SegmentationView
                  msmes={msmes}
                  onSelectBorrower={handleSelectBorrower}
                />
              )}

              {activeTab === 'fairness-monitor' && (
                <FairnessMonitorView />
              )}

              {activeTab === 'model-monitor' && (
                <ModelMonitorView />
              )}

              {activeTab === 'data-connections' && (
                <DataConnectionsView onNavigateTab={setActiveTab} />
              )}

              {(activeTab === 'data-import' || activeTab === 'data-management') && (
                <DataImportView
                  selectedBorrower={selectedBorrower}
                  onSelectBorrower={handleSelectBorrower}
                  allBorrowers={msmes}
                  setActiveTab={setActiveTab}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* Global Search Modal */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        msmes={msmes}
        onSelectBorrower={handleSelectBorrower}
      />

      {/* Credit Intelligence Report Modal */}
      <ReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        borrower={selectedBorrower}
      />

      {/* CrediLens Intelligence Assistant Chatbot */}
      <Chatbot currentBorrower={selectedBorrower} />
    </div>
  );
};

const MainRouter: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen w-screen bg-[#0D0D0F]">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-[#FF7A1A] border-t-transparent rounded-full animate-spin mx-auto" />
          <div className="text-xs font-mono text-[#A1A1AA]">Verifying CrediLens Security Session...</div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthView />;
  }

  return <CrediLensDashboard />;
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <MainRouter />
    </AuthProvider>
  );
};

export default App;

