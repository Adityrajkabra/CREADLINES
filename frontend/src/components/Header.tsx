import React, { useState } from 'react';
import { Search, ChevronRight, Activity, Cpu, Info, ShieldCheck, Menu, LogOut, User } from 'lucide-react';
import { ActiveTab, MSME } from '../types';
import { useAuth } from '../context/AuthContext';

interface HeaderProps {
  activeTab: ActiveTab;
  selectedBorrower: MSME;
  onOpenSearch: () => void;
  isFallbackMode: boolean;
  onToggleMobileMenu?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  selectedBorrower,
  onOpenSearch,
  isFallbackMode,
  onToggleMobileMenu
}) => {
  const [showDemoModal, setShowDemoModal] = useState(false);
  const { user, logout } = useAuth();

  const getBreadcrumbTitle = () => {
    switch (activeTab) {
      case 'landing': return 'Platform Overview';
      case 'overview': return 'Executive Overview';
      case 'portfolio': return 'Portfolio Management';
      case 'borrower-analysis': return `Borrower Profile / ${selectedBorrower.business_name}`;
      case 'cash-flow': return `Cash Flow Intelligence / ${selectedBorrower.business_name}`;
      case 'what-if-lab': return `What-If Scenario Lab / ${selectedBorrower.business_name}`;
      case 'segmentation': return 'Portfolio Risk Segmentation';
      case 'fairness-monitor': return 'Fairness & Bias Monitor';
      case 'model-monitor': return 'ML Model Observability';
      case 'data-connections': return 'Data Management / Connect Data Sources';
      case 'data-import': return 'Data Management / Import Financial Data';
      case 'data-management': return 'Data Management / Unified Overview';
      default: return 'Dashboard';
    }
  };

  return (
    <>
      <header className="h-16 bg-[#171719] border-b border-[#303035] px-4 sm:px-6 flex items-center justify-between shrink-0 sticky top-0 z-30 shadow-fin-sm">
        {/* Left: Mobile Menu & Breadcrumbs */}
        <div className="flex items-center gap-3 min-w-0">
          {onToggleMobileMenu && (
            <button
              onClick={onToggleMobileMenu}
              className="md:hidden p-1.5 rounded-lg text-[#A1A1AA] hover:text-[#F5F5F5] hover:bg-[#1E1E21] transition-colors"
              aria-label="Toggle mobile menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          <div className="flex items-center gap-1.5 text-xs text-[#A1A1AA] truncate">
            <span className="font-semibold text-[#F5F5F5] hidden sm:inline">CrediLens</span>
            <ChevronRight className="w-3.5 h-3.5 text-[#71717A] hidden sm:inline shrink-0" />
            <span className="text-[#F5F5F5] font-medium truncate">{getBreadcrumbTitle()}</span>
            {['borrower-analysis', 'cash-flow', 'what-if-lab'].includes(activeTab) && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#332015] text-[#FF7A1A] border border-[#75401F] ml-1.5 shrink-0 hidden sm:inline">
                {selectedBorrower.msme_id}
              </span>
            )}
          </div>
        </div>

        {/* Center: Global Search Bar Trigger */}
        <button
          onClick={onOpenSearch}
          className="hidden md:flex items-center gap-3 px-3.5 py-1.5 rounded-lg bg-[#141416] border border-[#303035] text-[#A1A1AA] hover:text-[#F5F5F5] hover:border-[#75401F] transition-all text-xs w-60 lg:w-72"
        >
          <Search className="w-3.5 h-3.5 text-[#71717A]" />
          <span className="flex-1 text-left truncate">Search MSMEs, sectors, IDs...</span>
          <div className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-[#1E1E21] text-[#A1A1AA] rounded border border-[#303035] shadow-xs">
              Ctrl
            </kbd>
            <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-[#1E1E21] text-[#A1A1AA] rounded border border-[#303035] shadow-xs">
              K
            </kbd>
          </div>
        </button>

        {/* Right: Status Indicators & User Profile */}
        <div className="flex items-center gap-2 sm:gap-2.5 text-xs shrink-0">
          {/* Mobile search trigger icon */}
          <button
            onClick={onOpenSearch}
            className="md:hidden p-2 rounded-lg text-[#A1A1AA] hover:bg-[#1E1E21] hover:text-[#F5F5F5]"
            aria-label="Search"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Model Version Pill */}
          <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#141416] border border-[#303035] text-[#A1A1AA]">
            <Cpu className="w-3.5 h-3.5 text-[#FF7A1A]" />
            <span className="font-mono text-[11px] font-medium">Model v1.0 (GBC)</span>
          </div>

          {/* Demo Mode Badge */}
          <button
            onClick={() => setShowDemoModal(true)}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#332015] border border-[#75401F] text-[#FF7A1A] hover:bg-[#452718] transition-colors font-medium text-[11px]"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-[#FF7A1A]" />
            <span>DEMO MODE</span>
          </button>

          {/* System Status Dot */}
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#141416] border border-[#303035]">
            <span
              className={`w-2 h-2 rounded-full ${
                isFallbackMode ? 'bg-[#E8A23A] animate-pulse' : 'bg-[#22A477]'
              }`}
            />
            <span className="text-[11px] text-[#A1A1AA] font-medium">
              {isFallbackMode ? 'Demo Fallback' : 'Operational'}
            </span>
          </div>

          {/* Authenticated User Profile & Sign Out */}
          {user && (
            <div className="flex items-center gap-2 pl-2 border-l border-[#303035]">
              <div className="flex items-center gap-2 py-1 px-2 rounded-lg bg-[#141416] border border-[#303035]">
                <div className="w-6 h-6 rounded-full bg-[#FF7A1A] text-[#0D0D0F] flex items-center justify-center text-[10px] font-bold">
                  {user.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="hidden md:block text-left max-w-[120px] lg:max-w-[160px]">
                  <div className="text-[11px] font-semibold text-[#F5F5F5] truncate leading-tight">
                    {user.full_name}
                  </div>
                  <div className="text-[9px] text-[#A1A1AA] truncate leading-tight">
                    {user.organization || 'Institutional Underwriter'}
                  </div>
                </div>
              </div>

              <button
                onClick={() => logout()}
                title="Sign Out of CrediLens"
                className="p-1.5 rounded-lg text-[#A1A1AA] hover:text-[#EF5350] hover:bg-[#331515] border border-transparent hover:border-[#6B1F1F] transition-all flex items-center gap-1 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden xl:inline text-[11px] font-medium">Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Demo Mode Modal / Notice */}
      {showDemoModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-[#171719] border border-[#303035] rounded-xl p-6 shadow-2xl space-y-4 text-[#F5F5F5]">
            <div className="flex items-center gap-3 text-[#FF7A1A]">
              <div className="w-9 h-9 rounded-lg bg-[#332015] border border-[#75401F] flex items-center justify-center">
                <Info className="w-5 h-5 text-[#FF7A1A]" />
              </div>
              <h3 className="font-bold text-base text-[#F5F5F5]">Prototype Demo Mode Notice</h3>
            </div>
            <p className="text-xs leading-relaxed text-[#A1A1AA]">
              This prototype utilizes synthetic MSME telemetry for evaluation and demonstration. It is not intended for real lending decisions without human underwriting review.
            </p>
            <div className="bg-[#141416] p-3 rounded-lg border border-[#303035] text-[11px] text-[#A1A1AA] space-y-1.5">
              <div>• 127 synthetic enterprise records seeded deterministically.</div>
              <div>• Machine learning predictions and SHAP-style explainability utilize non-confidential operational signals.</div>
              <div>• Decision-support metrics only — human credit committee sign-off required.</div>
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setShowDemoModal(false)}
                className="px-4 py-2 bg-[#FF7A1A] hover:bg-[#FF8F3D] text-[#0D0D0F] rounded-lg text-xs font-bold shadow-sm transition-colors cursor-pointer"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
