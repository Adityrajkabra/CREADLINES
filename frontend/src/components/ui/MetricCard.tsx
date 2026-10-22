import React from 'react';
import { LucideIcon } from 'lucide-react';
import { InfoTooltip } from '../InfoTooltip';

interface MetricCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon?: LucideIcon;
  valueColor?: string;
  tooltip?: string;
  badge?: string;
  className?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  sub,
  icon: Icon,
  valueColor = 'text-[#F5F5F5]',
  tooltip,
  badge,
  className = ''
}) => {
  return (
    <div className={`fin-card p-4 space-y-2 flex flex-col justify-between ${className}`}>
      <div className="flex items-center justify-between gap-1">
        <span className="text-xs font-medium text-[#A1A1AA] truncate">{label}</span>
        {tooltip && <InfoTooltip text={tooltip} title={label} />}
      </div>
      <div className="flex items-baseline justify-between pt-1">
        <span className={`text-2xl font-bold tracking-tight tabular-nums font-mono ${valueColor}`}>
          {value}
        </span>
        {Icon && (
          <div className="w-8 h-8 rounded-lg bg-[#141416] border border-[#303035] flex items-center justify-center shrink-0">
            <Icon className="w-4 h-4 text-[#FF7A1A]" />
          </div>
        )}
      </div>
      {sub && (
        <div className="text-[11px] text-[#71717A] font-medium truncate">
          {sub}
        </div>
      )}
    </div>
  );
};
