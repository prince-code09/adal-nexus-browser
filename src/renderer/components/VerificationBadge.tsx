import React from 'react';
import { CheckCircle2, AlertTriangle, HelpCircle } from 'lucide-react';
import type { VerificationStatus } from '../../shared/types';

interface VerificationBadgeProps {
  status: VerificationStatus;
  size?: 'sm' | 'md' | 'lg';
}

export const VerificationBadge: React.FC<VerificationBadgeProps> = ({ status, size = 'md' }) => {
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3.5 py-1.5 gap-2',
  }[size];

  const iconSizes = {
    sm: 12,
    md: 14,
    lg: 16,
  }[size];

  if (status === 'VERIFIED') {
    return (
      <span className={`inline-flex items-center font-medium rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 ${sizeClasses}`}>
        <CheckCircle2 size={iconSizes} className="text-emerald-400" />
        VERIFIED
      </span>
    );
  }

  if (status === 'FAILED') {
    return (
      <span className={`inline-flex items-center font-medium rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/30 ${sizeClasses}`}>
        <AlertTriangle size={iconSizes} className="text-rose-400" />
        FAILED
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center font-medium rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30 ${sizeClasses}`}>
      <HelpCircle size={iconSizes} className="text-amber-400" />
      UNVERIFIED
    </span>
  );
};
