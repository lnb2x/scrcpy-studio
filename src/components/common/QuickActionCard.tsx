import React from 'react';

interface QuickActionCardProps {
  title: string;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  accentColor?: string;
  badge?: string;
  disabled?: boolean;
}

export const QuickActionCard: React.FC<QuickActionCardProps> = ({
  title,
  description,
  icon: Icon,
  onClick,
  badge,
  disabled,
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`p-4 rounded-xl bg-card hover:bg-card-hover border border-border hover:border-border-highlight flex flex-col items-start justify-between text-left transition-all duration-150 group shadow-sm relative overflow-hidden transform active:scale-98 disabled:opacity-40 disabled:cursor-not-allowed`}
    >
      <div className="flex items-center justify-between w-full mb-3">
        <div className="w-9 h-9 rounded-lg bg-surface-hover group-hover:bg-primary-light flex items-center justify-center text-text-secondary group-hover:text-primary transition-colors border border-border">
          <Icon className="w-4 h-4" />
        </div>
        {badge && (
          <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-primary-light text-primary border border-primary/20">
            {badge}
          </span>
        )}
      </div>

      <div>
        <h4 className="text-sm font-semibold text-text-primary group-hover:text-primary transition-colors">
          {title}
        </h4>
        {description && (
          <p className="text-xs text-text-secondary mt-1 line-clamp-2 leading-relaxed">
            {description}
          </p>
        )}
      </div>
    </button>
  );
};
