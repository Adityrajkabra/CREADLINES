import React, { useState, useMemo } from 'react';
import {
  Search,
  ArrowUpDown,
  Building,
  ExternalLink,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronLeft,
  ChevronRight,
  RefreshCw
} from 'lucide-react';
import { MSME } from '../types';

interface PortfolioViewProps {
  msmes: MSME[];
  onSelectBorrower: (msme: MSME) => void;
}

export const PortfolioView: React.FC<PortfolioViewProps> = ({
  msmes,
  onSelectBorrower
}) => {
  const [search, setSearch] = useState('');
  const [sectorFilter, setSectorFilter] = useState('All');
  const [segmentFilter, setSegmentFilter] = useState('All');
  const [healthFilter, setHealthFilter] = useState('All');
  const [revenueFilter, setRevenueFilter] = useState('All');
  const [sortBy, setSortBy] = useState<'risk_score' | 'annual_revenue' | 'probability_of_default'>('risk_score');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;

  // Extract distinct sectors
  const sectors = useMemo(() => {
    const list = Array.from(new Set(msmes.map(m => m.sector))).sort();
    return ['All', ...list];
  }, [msmes]);

  // Filtering and sorting
  const filteredMSMEs = useMemo(() => {
    return msmes
      .filter((m) => {
        if (search.trim()) {
          const s = search.toLowerCase();
          const match =
            m.business_name.toLowerCase().includes(s) ||
            m.msme_id.toLowerCase().includes(s) ||
            m.sector.toLowerCase().includes(s) ||
            m.city.toLowerCase().includes(s);
          if (!match) return false;
        }

        if (sectorFilter !== 'All' && m.sector !== sectorFilter) return false;
        if (segmentFilter !== 'All' && m.risk_segment.toUpperCase() !== segmentFilter.toUpperCase()) return false;
        if (healthFilter !== 'All' && m.cash_flow_health !== healthFilter) return false;

        if (revenueFilter === 'under_5cr' && m.annual_revenue >= 50000000) return false;
        if (revenueFilter === '5cr_15cr' && (m.annual_revenue < 50000000 || m.annual_revenue > 150000000)) return false;
        if (revenueFilter === 'above_15cr' && m.annual_revenue <= 150000000) return false;

        return true;
      })
      .sort((a, b) => {
        const valA = a[sortBy];
        const valB = b[sortBy];
        if (sortOrder === 'asc') {
          return valA > valB ? 1 : -1;
        } else {
          return valA < valB ? 1 : -1;
        }
      });
  }, [msmes, search, sectorFilter, segmentFilter, healthFilter, revenueFilter, sortBy, sortOrder]);

  const totalPages = Math.ceil(filteredMSMEs.length / pageSize) || 1;
  const paginatedMSMEs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredMSMEs.slice(start, start + pageSize);
  }, [filteredMSMEs, currentPage]);

  const toggleSort = (field: 'risk_score' | 'annual_revenue' | 'probability_of_default') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const resetFilters = () => {
    setSearch('');
    setSectorFilter('All');
    setSegmentFilter('All');
    setHealthFilter('All');
    setRevenueFilter('All');
    setCurrentPage(1);
  };

  const hasActiveFilters =
    sectorFilter !== 'All' ||
    segmentFilter !== 'All' ||
    healthFilter !== 'All' ||
    search ||
    revenueFilter !== 'All';

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Header and Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#F5F5F5] flex items-center gap-2">
            MSME Borrower Portfolio
          </h1>
          <p className="text-xs sm:text-sm text-[#A1A1AA] mt-0.5">
            Search, filter, and audit {msmes.length} enterprise profiles evaluated under alternative credit models.
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <span className="text-[#A1A1AA]">
            Showing <strong className="text-[#F5F5F5] font-mono">{filteredMSMEs.length}</strong> of {msmes.length} MSMEs
          </span>
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="px-2.5 py-1.5 rounded-lg bg-[#1E1E21] hover:bg-[#262629] text-[#A1A1AA] hover:text-[#F5F5F5] border border-[#303035] flex items-center gap-1.5 transition-colors font-medium cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 text-[#FF7A1A]" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Toolbar Card */}
      <div className="bg-[#171719] border border-[#303035] rounded-xl p-4 space-y-3 shadow-fin-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search Box */}
          <div className="relative lg:col-span-2">
            <Search className="w-4 h-4 text-[#71717A] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by business name, ID, sector, city..."
              className="w-full pl-9 pr-3 py-2 bg-[#141416] border border-[#303035] rounded-lg text-xs text-[#F5F5F5] placeholder-[#71717A] focus:outline-none focus:border-[#75401F] focus:ring-1 focus:ring-[#FF7A1A]/30 transition-colors"
            />
          </div>

          {/* Sector Filter */}
          <div>
            <select
              value={sectorFilter}
              onChange={(e) => {
                setSectorFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 bg-[#141416] border border-[#303035] rounded-lg text-xs text-[#F5F5F5] focus:outline-none focus:border-[#75401F] transition-colors"
            >
              <option value="All" className="bg-[#171719]">All Sectors</option>
              {sectors.filter(s => s !== 'All').map((s) => (
                <option key={s} value={s} className="bg-[#171719]">{s}</option>
              ))}
            </select>
          </div>

          {/* Risk Segment Filter */}
          <div>
            <select
              value={segmentFilter}
              onChange={(e) => {
                setSegmentFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 bg-[#141416] border border-[#303035] rounded-lg text-xs text-[#F5F5F5] focus:outline-none focus:border-[#75401F] transition-colors"
            >
              <option value="All" className="bg-[#171719]">All Risk Segments</option>
              <option value="LOW" className="bg-[#171719]">Low Risk (0-39)</option>
              <option value="MODERATE" className="bg-[#171719]">Moderate Risk (40-69)</option>
              <option value="HIGH" className="bg-[#171719]">High Risk (70-100)</option>
            </select>
          </div>

          {/* Cash Flow Health Filter */}
          <div>
            <select
              value={healthFilter}
              onChange={(e) => {
                setHealthFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 bg-[#141416] border border-[#303035] rounded-lg text-xs text-[#F5F5F5] focus:outline-none focus:border-[#75401F] transition-colors"
            >
              <option value="All" className="bg-[#171719]">All Cash Flow Health</option>
              <option value="Healthy" className="bg-[#171719]">Healthy</option>
              <option value="Watch" className="bg-[#171719]">Watch</option>
              <option value="Critical" className="bg-[#171719]">Critical</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-[#171719] border border-[#303035] rounded-xl overflow-hidden shadow-fin-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#F5F5F5]">
            <thead className="bg-[#141416] text-[11px] uppercase tracking-wider text-[#A1A1AA] font-semibold border-b border-[#303035]">
              <tr>
                <th className="px-4 py-3.5">Business & ID</th>
                <th className="px-4 py-3.5">Sector</th>
                <th 
                  className="px-4 py-3.5 cursor-pointer hover:text-[#FF7A1A] transition-colors"
                  onClick={() => toggleSort('annual_revenue')}
                >
                  <div className="flex items-center gap-1.5">
                    <span>Annual Revenue</span>
                    <ArrowUpDown className="w-3 h-3 text-[#71717A]" />
                  </div>
                </th>
                <th 
                  className="px-4 py-3.5 cursor-pointer hover:text-[#FF7A1A] transition-colors"
                  onClick={() => toggleSort('risk_score')}
                >
                  <div className="flex items-center gap-1.5">
                    <span>Risk Score</span>
                    <ArrowUpDown className="w-3 h-3 text-[#71717A]" />
                  </div>
                </th>
                <th 
                  className="px-4 py-3.5 cursor-pointer hover:text-[#FF7A1A] transition-colors"
                  onClick={() => toggleSort('probability_of_default')}
                >
                  <div className="flex items-center gap-1.5">
                    <span>Prob. of Default (PD)</span>
                    <ArrowUpDown className="w-3 h-3 text-[#71717A]" />
                  </div>
                </th>
                <th className="px-4 py-3.5">Cash Flow Health</th>
                <th className="px-4 py-3.5">Risk Segment</th>
                <th className="px-4 py-3.5">Trend</th>
                <th className="px-4 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#303035]">
              {paginatedMSMEs.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-[#71717A] text-sm">
                    No MSMEs match the specified filters. Try adjusting your query parameters.
                  </td>
                </tr>
              ) : (
                paginatedMSMEs.map((m) => {
                  const isHigh = m.risk_score >= 70;
                  const isMod = m.risk_score >= 40 && m.risk_score < 70;

                  return (
                    <tr
                      key={m.msme_id}
                      onClick={() => onSelectBorrower(m)}
                      className="hover:bg-[#1E1E21] cursor-pointer transition-colors group"
                    >
                      {/* Business & ID */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-[#332015] border border-[#75401F] flex items-center justify-center shrink-0">
                            <Building className="w-4 h-4 text-[#FF7A1A]" />
                          </div>
                          <div>
                            <div className="font-bold text-[#F5F5F5] group-hover:text-[#FF7A1A] transition-colors flex items-center gap-2">
                              <span>{m.business_name}</span>
                              {m.msme_id === 'MSME-1042' && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded font-semibold bg-[#332015] text-[#FF7A1A] border border-[#75401F]">
                                  Default Case
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] font-mono text-[#71717A]">
                              {m.msme_id} • {m.city}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Sector */}
                      <td className="px-4 py-3 text-[#A1A1AA] font-medium">
                        {m.sector}
                      </td>

                      {/* Annual Revenue */}
                      <td className="px-4 py-3 font-mono font-medium text-[#F5F5F5] tabular-nums">
                        ₹{(m.annual_revenue / 10000000).toFixed(2)} Cr
                      </td>

                      {/* Risk Score */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`font-mono font-bold px-2 py-0.5 rounded text-xs border tabular-nums ${
                              isHigh
                                ? 'text-[#EF5350] bg-[#331515] border-[#6B1F1F]'
                                : isMod
                                ? 'text-[#E8A23A] bg-[#332410] border-[#6B4A15]'
                                : 'text-[#22A477] bg-[#132E25] border-[#1A533E]'
                            }`}
                          >
                            {m.risk_score}
                          </span>
                          <span className="text-[10px] text-[#71717A]">/100</span>
                        </div>
                      </td>

                      {/* Probability of Default */}
                      <td className="px-4 py-3 font-mono tabular-nums">
                        <span
                          className={`font-semibold ${
                            isHigh ? 'text-[#EF5350]' : isMod ? 'text-[#E8A23A]' : 'text-[#22A477]'
                          }`}
                        >
                          {m.probability_of_default}%
                        </span>
                      </td>

                      {/* Cash Flow Health */}
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium border ${
                            m.cash_flow_health === 'Healthy'
                              ? 'bg-[#132E25] text-[#22A477] border-[#1A533E]'
                              : m.cash_flow_health === 'Watch'
                              ? 'bg-[#332410] text-[#E8A23A] border-[#6B4A15]'
                              : 'bg-[#331515] text-[#EF5350] border-[#6B1F1F]'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              m.cash_flow_health === 'Healthy'
                                ? 'bg-[#22A477]'
                                : m.cash_flow_health === 'Watch'
                                ? 'bg-[#E8A23A]'
                                : 'bg-[#EF5350]'
                            }`}
                          />
                          {m.cash_flow_health}
                        </span>
                      </td>

                      {/* Risk Segment */}
                      <td className="px-4 py-3 font-bold text-[11px]">
                        <span
                          className={
                            isHigh ? 'text-[#EF5350]' : isMod ? 'text-[#E8A23A]' : 'text-[#22A477]'
                          }
                        >
                          {m.risk_segment}
                        </span>
                      </td>

                      {/* Trend */}
                      <td className="px-4 py-3">
                        {m.trend === 'improving' ? (
                          <span className="flex items-center gap-1 text-[#22A477] text-xs font-medium">
                            <TrendingUp className="w-3.5 h-3.5" />
                            Improving
                          </span>
                        ) : m.trend === 'deteriorating' ? (
                          <span className="flex items-center gap-1 text-[#EF5350] text-xs font-medium">
                            <TrendingDown className="w-3.5 h-3.5" />
                            Deteriorating
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-[#71717A] text-xs font-medium">
                            <Minus className="w-3.5 h-3.5" />
                            Stable
                          </span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectBorrower(m);
                          }}
                          className="px-2.5 py-1 rounded-md bg-[#332015] hover:bg-[#FF7A1A] text-[#FF7A1A] hover:text-[#0D0D0F] border border-[#75401F] text-[11px] font-bold transition-all inline-flex items-center gap-1 cursor-pointer"
                        >
                          <span>Analyze</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-3 bg-[#141416] border-t border-[#303035] flex items-center justify-between text-xs text-[#A1A1AA]">
          <div>
            Page <strong className="text-[#F5F5F5] font-mono">{currentPage}</strong> of{' '}
            <strong className="text-[#F5F5F5] font-mono">{totalPages}</strong> ({filteredMSMEs.length} total filtered items)
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-md bg-[#1E1E21] border border-[#303035] hover:border-[#75401F] hover:bg-[#262629] disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-[#F5F5F5] cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-md bg-[#1E1E21] border border-[#303035] hover:border-[#75401F] hover:bg-[#262629] disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-[#F5F5F5] cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
