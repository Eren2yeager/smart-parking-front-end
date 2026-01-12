'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';
import { theme } from '@/lib/theme';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastContextType {
  showToast: (type: ToastType, message: string, duration?: number) => void;
  showSuccess: (message: string, duration?: number) => void;
  showError: (message: string, duration?: number) => void;
  showWarning: (message: string, duration?: number) => void;
  showInfo: (message: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}

interface ToastProviderProps {
  children: React.ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((type: ToastType, message: string, duration = 5000) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast: Toast = { id, type, message, duration };
    
    setToasts((prev) => [...prev, newToast]);

    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
      }, duration);
    }
  }, []);

  const showSuccess = useCallback((message: string, duration?: number) => {
    showToast('success', message, duration);
  }, [showToast]);

  const showError = useCallback((message: string, duration?: number) => {
    showToast('error', message, duration);
  }, [showToast]);

  const showWarning = useCallback((message: string, duration?: number) => {
    showToast('warning', message, duration);
  }, [showToast]);

  const showInfo = useCallback((message: string, duration?: number) => {
    showToast('info', message, duration);
  }, [showToast]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, showSuccess, showError, showWarning, showInfo }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

interface ToastContainerProps {
  toasts: Toast[];
  onRemove: (id: string) => void;
}

function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: theme.spacing[4],
        right: theme.spacing[4],
        zIndex: theme.zIndex.tooltip,
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing[2],
        maxWidth: '28rem',
      }}
      aria-live="polite"
      aria-atomic="true"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
}

interface ToastItemProps {
  toast: Toast;
  onRemove: (id: string) => void;
}

function ToastItem({ toast, onRemove }: ToastItemProps) {
  const [isExiting, setIsExiting] = useState(false);

  const handleRemove = () => {
    setIsExiting(true);
    setTimeout(() => {
      onRemove(toast.id);
    }, 300);
  };

  const toastStyles = {
    success: {
      backgroundColor: `${theme.colors.success[50]}`,
      borderColor: `${theme.colors.success[200]}`,
      textColor: `${theme.colors.success[800]}`,
      iconColor: `${theme.colors.success[500]}`,
      IconComponent: CheckCircle
    },
    error: {
      backgroundColor: `${theme.colors.error[50]}`,
      borderColor: `${theme.colors.error[200]}`,
      textColor: `${theme.colors.error[800]}`,
      iconColor: `${theme.colors.error[500]}`,
      IconComponent: XCircle
    },
    warning: {
      backgroundColor: `${theme.colors.warning[50]}`,
      borderColor: `${theme.colors.warning[200]}`,
      textColor: `${theme.colors.warning[800]}`,
      iconColor: `${theme.colors.warning[500]}`,
      IconComponent: AlertCircle
    },
    info: {
      backgroundColor: `${theme.colors.info[50]}`,
      borderColor: `${theme.colors.info[200]}`,
      textColor: `${theme.colors.info[800]}`,
      iconColor: `${theme.colors.info[500]}`,
      IconComponent: Info
    }
  };

  const style = toastStyles[toast.type];
  const Icon = style.IconComponent;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        padding: theme.spacing[4],
        borderRadius: theme.borderRadius.lg,
        border: `1px solid ${style.borderColor}`,
        backgroundColor: style.backgroundColor,
        color: style.textColor,
        boxShadow: theme.shadows.lg,
        minWidth: '300px',
        maxWidth: '28rem',
        transition: `all ${theme.transitions.duration.slow} ${theme.transitions.timing.easeInOut}`,
        opacity: isExiting ? 0 : 1,
        transform: isExiting ? 'translateX(100%)' : 'translateX(0)',
      }}
      role="alert"
    >
      <Icon
        style={{
          width: '1.25rem',
          height: '1.25rem',
          color: style.iconColor,
          marginTop: '0.125rem',
          flexShrink: 0,
        }}
      />
      <p
        style={{
          marginLeft: theme.spacing[3],
          fontSize: theme.typography.fontSize.sm,
          fontWeight: theme.typography.fontWeight.medium,
          flex: 1,
          lineHeight: theme.typography.lineHeight.normal,
        }}
      >
        {toast.message}
      </p>
      <button
        onClick={handleRemove}
        style={{
          marginLeft: theme.spacing[3],
          flexShrink: 0,
          color: theme.colors.neutral[400],
          backgroundColor: 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: `color ${theme.transitions.duration.fast} ${theme.transitions.timing.ease}`,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = theme.colors.neutral[600];
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = theme.colors.neutral[400];
        }}
        aria-label="Close notification"
      >
        <X style={{ width: '1rem', height: '1rem' }} />
      </button>
    </div>
  );
}

export default Toast;
