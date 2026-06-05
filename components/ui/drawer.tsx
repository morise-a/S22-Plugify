'use client';

import * as React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { Button } from './button';

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

export function Drawer({ isOpen, onClose, title, description, children, footer, size = 'md' }: DrawerProps) {
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Drawer Wrapper */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 220 }}
            className={`relative z-10 w-full ${sizes[size]} h-full border-l border-border bg-card text-foreground shadow-2xl flex flex-col`}
          >
            {/* Header */}
            <div className="flex items-start justify-between p-6 pb-4 border-b border-border/50">
              <div className="flex flex-col gap-1 pr-6">
                {title && <h2 className="text-lg font-semibold leading-none tracking-tight">{title}</h2>}
                {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
              </div>
              <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 rounded-full absolute top-4 right-4">
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6">
              {children}
            </div>

            {/* Footer */}
            {footer && (
              <div className="flex items-center justify-end gap-2 p-6 pt-4 border-t border-border/50 bg-secondary/30">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
