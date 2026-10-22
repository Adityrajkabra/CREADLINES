import React, { useState } from 'react';
import { HelpCircle } from 'lucide-react';

interface InfoTooltipProps {
  text: string;
  title?: string;
  className?: string;
}

export const InfoTooltip: React.FC<InfoTooltipProps> = ({ text, title, className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={`relative inline-flex items-center ${className}`}>
      <button
        type="button"
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="text-[#71717A] hover:text-[#FF7A1A] transition-colors p-0.5 rounded focus:outline-none"
        aria-label="Information tooltip"
      >
        <HelpCircle className="w-3.5 h-3.5" />
      </button>

      {isOpen && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-2.5 bg-[#1E1E21] border border-[#303035] rounded-xl shadow-2xl text-xs text-[#F5F5F5] pointer-events-none">
          {title && <div className="font-semibold text-[#F5F5F5] mb-1 border-b border-[#303035] pb-1">{title}</div>}
          <div className="leading-relaxed text-[#A1A1AA]">{text}</div>
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-[#303035]" />
        </div>
      )}
    </div>
  );
};
