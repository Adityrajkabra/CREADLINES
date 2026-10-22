import React from 'react';

interface RiskBadgeProps {
  score?: number;
  segment?: string;
  health?: string;
  size?: 'xs' | 'sm' | 'md';
  showDot?: boolean;
  className?: string;
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({
  score,
  segment,
  health,
  size = 'sm',
  showDot = true,
  className = ''
}) => {
  // Determine risk category
  let type: 'low' | 'mod' | 'high' | 'neutral' = 'neutral';
  let label = '';

  if (score !== undefined) {
    if (score < 40) type = 'low';
    else if (score < 70) type = 'mod';
    else type = 'high';
    label = `${score}/100`;
  } else if (segment) {
    const s = segment.toUpperCase();
    if (s.includes('LOW')) type = 'low';
    else if (s.includes('MOD') || s.includes('MEDIUM')) type = 'mod';
    else if (s.includes('HIGH') || s.includes('CRITICAL')) type = 'high';
    label = segment;
  } else if (health) {
    if (health === 'Healthy') type = 'low';
    else if (health === 'Watch') type = 'mod';
    else if (health === 'Critical') type = 'high';
    label = health;
  }

  const colorStyles = {
    low: 'bg-[#22A477]/15 text-[#22A477] border-[#22A477]/30',
    mod: 'bg-[#E8A23A]/15 text-[#E8A23A] border-[#E8A23A]/30',
    high: 'bg-[#EF5350]/15 text-[#EF5350] border-[#EF5350]/30',
    neutral: 'bg-[#1E1E21] text-[#A1A1AA] border-[#303035]'
  };

  const dotColors = {
    low: 'bg-[#22A477]',
    mod: 'bg-[#E8A23A]',
    high: 'bg-[#EF5350]',
    neutral: 'bg-[#71717A]'
  };

  const sizeStyles = {
    xs: 'text-[10px] px-1.5 py-0.5',
    sm: 'text-xs px-2.5 py-0.5',
    md: 'text-sm px-3 py-1 font-semibold'
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-medium transition-colors ${colorStyles[type]} ${sizeStyles[size]} ${className}`}
    >
      {showDot && (
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColors[type]}`} />
      )}
      <span>{label}</span>
    </span>
  );
};
