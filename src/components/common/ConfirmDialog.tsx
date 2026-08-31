import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDestructive = false,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="w-full max-w-md bg-surface border border-border-highlight rounded-2xl p-6 shadow-2xl space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                isDestructive
                  ? 'bg-rose-500/15 text-rose-400 border border-rose-500/20'
                  : 'bg-primary-light text-primary border border-primary/20'
              }`}
            >
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-text-primary">{title}</h3>
          </div>
          <button
            onClick={onCancel}
            className="p-1 rounded-lg hover:bg-surface-hover text-text-muted hover:text-text-primary"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-text-secondary leading-relaxed pl-13">{message}</p>

        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg bg-surface-hover hover:bg-surface-active text-text-secondary hover:text-text-primary text-xs font-medium border border-border transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 rounded-lg text-white text-xs font-semibold shadow-sm transition-all transform active:scale-95 ${
              isDestructive ? 'bg-rose-600 hover:bg-rose-700' : 'bg-primary hover:bg-primary-hover'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
