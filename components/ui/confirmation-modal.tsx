'use client';

import * as React from 'react';
import { AlertTriangle, Trash2, Info } from 'lucide-react';
import { Modal } from './modal';
import { Button } from './button';

export interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'destructive' | 'warning' | 'info';
  isLoading?: boolean;
}

export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  message = 'This action cannot be undone.',
  confirmText = 'Delete',
  cancelText = 'Cancel',
  variant = 'destructive',
  isLoading = false,
}: ConfirmationModalProps) {
  const getIcon = () => {
    const iconBase = "relative flex h-12 w-12 items-center justify-center rounded-full transition-transform duration-300 group-hover:scale-110";
    switch (variant) {
      case 'destructive':
        return (
          <div className="relative mx-auto w-14 h-14 flex items-center justify-center group">
            {/* Outer soft glowing ring */}
            <div className="absolute inset-0 rounded-full bg-red-500/10 animate-ping opacity-75" style={{ animationDuration: '3s' }} />
            <div className="absolute inset-1 rounded-full bg-red-50/80 border border-red-100" />
            <div className={`${iconBase} bg-red-500 text-white shadow-[0_4px_12px_rgba(239,68,68,0.25)]`}>
              <Trash2 className="h-5 w-5" />
            </div>
          </div>
        );
      case 'warning':
        return (
          <div className="relative mx-auto w-14 h-14 flex items-center justify-center group">
            <div className="absolute inset-0 rounded-full bg-amber-500/10 animate-ping opacity-75" style={{ animationDuration: '3s' }} />
            <div className="absolute inset-1 rounded-full bg-amber-50/80 border border-amber-100" />
            <div className={`${iconBase} bg-amber-500 text-white shadow-[0_4px_12px_rgba(245,158,11,0.25)]`}>
              <AlertTriangle className="h-5 w-5" />
            </div>
          </div>
        );
      case 'info':
        return (
          <div className="relative mx-auto w-14 h-14 flex items-center justify-center group">
            <div className="absolute inset-0 rounded-full bg-blue-500/10 animate-ping opacity-75" style={{ animationDuration: '3s' }} />
            <div className="absolute inset-1 rounded-full bg-blue-50/80 border border-blue-100" />
            <div className={`${iconBase} bg-blue-500 text-white shadow-[0_4px_12px_rgba(59,130,246,0.25)]`}>
              <Info className="h-5 w-5" />
            </div>
          </div>
        );
      default:
        return (
          <div className="relative mx-auto w-14 h-14 flex items-center justify-center group">
            <div className="absolute inset-0 rounded-full bg-indigo-500/10 animate-ping opacity-75" style={{ animationDuration: '3s' }} />
            <div className="absolute inset-1 rounded-full bg-indigo-50/80 border border-indigo-100" />
            <div className={`${iconBase} bg-indigo-500 text-white shadow-[0_4px_12px_rgba(99,102,241,0.25)]`}>
              <AlertTriangle className="h-5 w-5" />
            </div>
          </div>
        );
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <div className="text-center space-y-5 py-2">
        {/* Animated Double-Ring Icon */}
        {getIcon()}

        {/* Message Content */}
        <div className="space-y-1.5">
          <h3 className="text-base font-bold text-foreground tracking-tight leading-6">{title}</h3>
          <p className="text-xs text-muted-foreground leading-relaxed px-2">
            {message}
          </p>
        </div>

        {/* Re-designed Side-by-Side Unique Action Buttons */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <Button 
            variant="outline" 
            onClick={onClose} 
            disabled={isLoading} 
            className="w-full h-10 rounded-xl font-bold text-[10px] capitalize tracking-wider bg-background text-muted-foreground hover:bg-muted/10 border border-border/60 hover:text-foreground transition-all duration-200 shadow-sm active:scale-95 cursor-pointer"
          >
            {cancelText}
          </Button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`w-full h-10 rounded-xl font-bold text-[10px] capitalize tracking-wider text-white shadow-sm transition-all duration-200 active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 ${
              variant === 'destructive'
                ? 'bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 shadow-red-500/10 hover:shadow-red-500/25 border border-red-500/30'
                : variant === 'warning'
                ? 'bg-gradient-to-r from-amber-500 to-orange-650 hover:from-amber-600 hover:to-orange-750 shadow-amber-500/10 hover:shadow-amber-500/25 border border-amber-500/30'
                : 'bg-gradient-to-r from-indigo-500 to-purple-650 hover:from-indigo-600 hover:to-purple-750 shadow-indigo-500/10 hover:shadow-indigo-500/25 border border-indigo-500/30'
            }`}
          >
            {isLoading ? (
              <span className="flex items-center gap-1 justify-center">
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Processing
              </span>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
