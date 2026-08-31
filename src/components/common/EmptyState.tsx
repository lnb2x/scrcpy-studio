import React from 'react';
import { Smartphone, RefreshCw } from 'lucide-react';

interface EmptyStateProps {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  isLoading?: boolean;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = Smartphone,
  title,
  description,
  actionText,
  onAction,
  isLoading,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl bg-card border border-dashed border-border my-6">
      <div className="w-14 h-14 rounded-2xl bg-surface-hover border border-border flex items-center justify-center text-text-muted mb-4 shadow-inner">
        <Icon className="w-7 h-7 text-primary" />
      </div>

      <h3 className="text-base font-bold text-text-primary mb-1.5">{title}</h3>
      <p className="text-xs text-text-secondary max-w-sm mb-6 leading-relaxed">
        {description}
      </p>

      {actionText && onAction && (
        <button
          onClick={onAction}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-sm transition-all transform active:scale-95 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>{actionText}</span>
        </button>
      )}
    </div>
  );
};
