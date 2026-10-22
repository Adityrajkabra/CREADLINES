import React from 'react';
import {
  LayoutDashboard,
  Building2,
  FileSearch,
  TrendingUp,
  Sliders,
  ScatterChart,
  Scale,
  Cpu,
  ShieldCheck,
  Database,
  CheckCircle2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  X,
  UserCheck,
  UploadCloud,
  FileSpreadsheet
} from 'lucide-react';
import { ActiveTab } from '../types';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  isFallbackMode: boolean;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  isFallbackMode,
  isCollapsed = false,
  onToggleCollapse,
  isMobileOpen = false,
  onCloseMobile
}) => {
  const { user } = useAuth();

  const analyticsNavItems = [
    { id: 'overview' as ActiveTab, label: 'Overview', icon: LayoutDashboard, badge: null },
    { id: 'portfolio' as ActiveTab, label: 'Portfolio', icon: Building2, badge: '127' },
    { id: 'borrower-analysis' as ActiveTab, label: 'Borrower Analysis', icon: FileSearch, badge: 'Active' },
    { id: 'cash-flow' as ActiveTab, label: 'Cash Flow', icon: TrendingUp, badge: '6M Fcst' },
    { id: 'what-if-lab' as ActiveTab, label: 'What-If Lab', icon: Sliders, badge: 'Sim' },
    { id: 'segmentation' as ActiveTab, label: 'Risk Segmentation', icon: ScatterChart, badge: null },
    { id: 'fairness-monitor' as ActiveTab, label: 'Fairness Monitor', icon: Scale, badge: 'Audit' },
    { id: 'model-monitor' as ActiveTab, label: 'Model Monitor', icon: Cpu, badge: 'v1.0' },
  ];

  const dataManagementNavItems = [
    { id: 'data-connections' as ActiveTab, label: 'Connect Data Sources', icon: Database, badge: 'Sandbox' },
    { id: 'data-import' as ActiveTab, label: 'Import Financial Data', icon: UploadCloud, badge: 'CSV/Excel' },
  ];

  const handleNavClick = (tabId: ActiveTab) => {
    setActiveTab(tabId);
    if (onCloseMobile) onCloseMobile();
  };

  const sidebarContent = (
    <aside
      className={`h-full bg-[#09090B] border-r border-[#303035] flex flex-col justify-between shrink-0 select-none transition-all duration-200 ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div>
        <div className="p-4 border-b border-[#303035] flex items-center justify-between">
          <div
            onClick={() => handleNavClick('landing')}
            className="flex items-center gap-3 cursor-pointer group flex-1 min-w-0"
          >
            {/* Geometric Wordmark Icon */}
            <div className="w-9 h-9 rounded-lg bg-[#171719] border border-[#303035] group-hover:border-[#75401F] flex items-center justify-center text-white shadow-sm shrink-0 transition-colors">
              <ShieldCheck className="w-5 h-5 text-[#FF7A1A]" />
            </div>
            {!isCollapsed && (
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-base tracking-tight text-[#F5F5F5]">CrediLens</span>
                  <span className="text-[9px] uppercase font-bold px-1.5 py-0.2 rounded bg-[#332015] text-[#FF7A1A] border border-[#75401F]">
                    SaaS
                  </span>
                </div>
                <div className="text-[10px] tracking-wider text-[#71717A] font-semibold uppercase truncate">
                  MSME Credit Intelligence
                </div>
              </div>
            )}
          </div>

          {/* Desktop Collapse Toggle */}
          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className="hidden lg:flex p-1 rounded-md text-[#71717A] hover:text-[#F5F5F5] hover:bg-[#1E1E21] transition-colors"
              title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          )}

          {/* Mobile Close Button */}
          {onCloseMobile && (
            <button
              onClick={onCloseMobile}
              className="lg:hidden p-1 rounded-md text-[#71717A] hover:text-[#F5F5F5] hover:bg-[#1E1E21]"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Navigation Menu */}
        <nav className="p-3 space-y-4">
          {/* Analytics Section */}
          <div className="space-y-1">
            {!isCollapsed && (
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#71717A] px-3 py-1">
                Analytics Workspace
              </div>
            )}
            {analyticsNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  title={isCollapsed ? item.label : undefined}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-[#332015] text-[#FF7A1A] font-semibold border border-[#75401F] shadow-xs'
                      : 'text-[#A1A1AA] hover:text-[#F5F5F5] hover:bg-[#1E1E21] border border-transparent'
                  } ${isCollapsed ? 'justify-center px-0' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        isActive ? 'text-[#FF7A1A]' : 'text-[#71717A]'
                      }`}
                    />
                    {!isCollapsed && <span className="truncate">{item.label}</span>}
                  </div>
                  {!isCollapsed && item.badge && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded font-semibold tabular-nums ${
                        isActive
                          ? 'bg-[#FF7A1A] text-[#0D0D0F]'
                          : 'bg-[#1E1E21] text-[#A1A1AA] border border-[#303035]'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Data Management Section */}
          <div className="space-y-1 pt-2 border-t border-[#2A2A2E]">
            {!isCollapsed && (
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#FF7A1A] px-3 py-1 flex items-center justify-between">
                <span>Data Management</span>
                <span className="text-[8px] bg-[#332015] text-[#FF7A1A] px-1.5 py-0.5 rounded border border-[#75401F]">
                  Unified
                </span>
              </div>
            )}
            {dataManagementNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  title={isCollapsed ? item.label : undefined}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-[#332015] text-[#FF7A1A] font-semibold border border-[#75401F] shadow-xs'
                      : 'text-[#A1A1AA] hover:text-[#F5F5F5] hover:bg-[#1E1E21] border border-transparent'
                  } ${isCollapsed ? 'justify-center px-0' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        isActive ? 'text-[#FF7A1A]' : 'text-[#71717A]'
                      }`}
                    />
                    {!isCollapsed && <span className="truncate">{item.label}</span>}
                  </div>
                  {!isCollapsed && item.badge && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded font-semibold tabular-nums ${
                        isActive
                          ? 'bg-[#FF7A1A] text-[#0D0D0F]'
                          : 'bg-[#1E1E21] text-[#A1A1AA] border border-[#303035]'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </nav>
      </div>

      {/* Bottom Status & Demo Info */}
      <div className="p-3 border-t border-[#303035] space-y-2 bg-[#0D0D0F]">
        {!isCollapsed ? (
          <>
            {/* Authenticated Underwriter Indicator */}
            {user && (
              <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[#171719] border border-[#303035] text-[11px] text-[#F5F5F5]">
                <UserCheck className="w-3.5 h-3.5 text-[#FF7A1A] shrink-0" />
                <div className="min-w-0 flex-1 truncate">
                  <div className="font-semibold truncate">{user.full_name}</div>
                  <div className="text-[10px] text-[#A1A1AA] truncate">{user.organization || 'Underwriter'}</div>
                </div>
              </div>
            )}

            {/* Demo Data indicator */}
            <div className="p-2.5 rounded-lg bg-[#171719] border border-[#303035] shadow-2xs">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#F5F5F5]">
                <Database className="w-3.5 h-3.5 text-[#FF7A1A]" />
                <span>Demo Data Mode</span>
              </div>
              <p className="text-[11px] text-[#A1A1AA] mt-0.5 leading-snug">
                127 synthetic MSME profiles seeded deterministically.
              </p>
            </div>

            {/* System Status indicator */}
            <div className="flex items-center justify-between px-2.5 py-2 rounded-lg bg-[#171719] border border-[#303035] text-xs">
              <div className="flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full ${
                    isFallbackMode ? 'bg-[#E8A23A] animate-pulse' : 'bg-[#22A477]'
                  }`}
                />
                <span className="text-[#A1A1AA] font-medium text-[11px]">
                  {isFallbackMode ? 'Demo Fallback Active' : 'System Operational'}
                </span>
              </div>
              {isFallbackMode ? (
                <AlertTriangle className="w-3.5 h-3.5 text-[#E8A23A]" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5 text-[#22A477]" />
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div
              title="127 synthetic MSME profiles seeded"
              className="w-8 h-8 rounded-lg bg-[#171719] border border-[#303035] flex items-center justify-center text-[#FF7A1A]"
            >
              <Database className="w-4 h-4" />
            </div>
            <div
              title={isFallbackMode ? 'Demo Fallback Active' : 'System Operational'}
              className="w-8 h-8 rounded-lg bg-[#171719] border border-[#303035] flex items-center justify-center"
            >
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  isFallbackMode ? 'bg-[#E8A23A]' : 'bg-[#22A477]'
                }`}
              />
            </div>
          </div>
        )}
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <div className="hidden md:block h-full shrink-0">
        {sidebarContent}
      </div>

      {/* Mobile Drawer Backdrop and Drawer */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />
          <div className="relative z-10 w-72 max-w-[85vw] h-full shadow-2xl animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
