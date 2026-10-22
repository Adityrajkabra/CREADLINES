import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Building, ArrowRight, ShieldAlert, CheckCircle, AlertTriangle } from 'lucide-react';
import { MSME } from '../types';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  msmes: MSME[];
  onSelectBorrower: (msme: MSME) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  msmes,
  onSelectBorrower,
}) => {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const results = query.trim() === ''
    ? msmes.slice(0, 6)
    : msmes.filter(m =>
        m.business_name.toLowerCase().includes(query.toLowerCase()) ||
        m.msme_id.toLowerCase().includes(query.toLowerCase()) ||
        m.sector.toLowerCase().includes(query.toLowerCase()) ||
        m.city.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 8);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-start justify-center pt-20 p-4">
      <div 
        className="w-full max-w-xl bg-[#171719] border border-[#303035] rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-[#303035] gap-3 bg-[#171719]">
          <Search className="w-5 h-5 text-[#71717A] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search MSME by name, ID (e.g. MSME-1042), sector, or city..."
            className="w-full bg-transparent text-sm text-[#F5F5F5] placeholder-[#71717A] focus:outline-none"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-[#71717A] hover:text-[#F5F5F5]">
              <X className="w-4 h-4" />
            </button>
          )}
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#141416] text-[#A1A1AA] border border-[#303035]">
            ESC
          </span>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 bg-[#171719]">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#A1A1AA] px-3 py-1.5">
            {query.trim() === '' ? 'Featured & Recent MSMEs' : `Search Results (${results.length})`}
          </div>

          {results.length === 0 ? (
            <div className="py-8 text-center text-sm text-[#71717A]">
              No MSMEs matching "{query}"
            </div>
          ) : (
            results.map((m) => {
              const riskColor = 
                m.risk_score >= 70 ? 'text-[#EF5350] bg-[#EF5350]/15 border-[#EF5350]/30' :
                m.risk_score >= 40 ? 'text-[#E8A23A] bg-[#E8A23A]/15 border-[#E8A23A]/30' :
                'text-[#22A477] bg-[#22A477]/15 border-[#22A477]/30';

              return (
                <div
                  key={m.msme_id}
                  onClick={() => {
                    onSelectBorrower(m);
                    onClose();
                  }}
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-[#1E1E21] cursor-pointer transition-colors group border border-transparent hover:border-[#303035]"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-[#141416] border border-[#303035] flex items-center justify-center text-[#FF7A1A] shrink-0 group-hover:border-[#75401F] group-hover:bg-[#332015] transition-colors">
                      <Building className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-[#F5F5F5] group-hover:text-[#FF7A1A] transition-colors flex items-center gap-2">
                        {m.business_name}
                        <span className="text-xs font-mono text-[#71717A] font-normal">
                          {m.msme_id}
                        </span>
                      </div>
                      <div className="text-xs text-[#A1A1AA] flex items-center gap-2 mt-0.5">
                        <span>{m.sector}</span>
                        <span>•</span>
                        <span>{m.city}</span>
                        <span>•</span>
                        <span>₹{(m.annual_revenue / 10000000).toFixed(1)} Cr Rev</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-[10px] text-[#71717A] font-mono">Risk Score</div>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded border tabular-nums ${riskColor}`}>
                        {m.risk_score}/100
                      </span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-[#71717A] group-hover:text-[#FF7A1A] transition-colors" />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="px-4 py-2.5 bg-[#141416] border-t border-[#303035] text-[11px] text-[#71717A] flex items-center justify-between">
          <span>Use keyboard navigation or click to inspect borrower profile</span>
          <span className="font-mono text-[#A1A1AA]">127 Total Seeded Entities</span>
        </div>
      </div>
    </div>
  );
};
