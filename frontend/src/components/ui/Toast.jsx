import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';

/**
 * Toast Types and their configurations
 */
const TOAST_TYPES = {
  success: {
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
      </svg>
    ),
    className: 'bg-green-50 border-green-200 text-green-800',
    iconClassName: 'text-green-500',
    progressClassName: 'bg-green-500',
  },
  error: {
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
      </svg>
    ),
    className: 'bg-red-50 border-red-200 text-red-800',
    iconClassName: 'text-red-500',
    progressClassName: 'bg-red-500',
  },
  warning: {
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
    ),
    className: 'bg-amber-50 border-amber-200 text-amber-800',
    iconClassName: 'text-amber-500',
    progressClassName: 'bg-amber-500',
  },
  info: {
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
      </svg>
    ),
    className: 'bg-blue-50 border-blue-200 text-blue-800',
    iconClassName: 'text-blue-500',
    progressClassName: 'bg-blue-500',
  },
  loading: {
    icon: (
      <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
      </svg>
    ),
    className: 'bg-zinc-50 border-zinc-200 text-zinc-800',
    iconClassName: 'text-zinc-500',
    progressClassName: 'bg-zinc-500',
  },
};

/**
 * Single Toast Component
 */
function Toast({ 
  id, 
  type = 'info', 
  title, 
  message, 
  duration = 5000, 
  onClose,
  action,
  showProgress = true,
}) {
  const [isExiting, setIsExiting] = useState(false);
  const [progress, setProgress] = useState(100);
  const config = TOAST_TYPES[type] || TOAST_TYPES.info;

  const handleClose = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => onClose?.(id), 300);
  }, [id, onClose]);

  // Auto-dismiss timer
  useEffect(() => {
    if (duration === 0 || type === 'loading') return;

    const startTime = Date.now();
    const endTime = startTime + duration;

    const updateProgress = () => {
      const now = Date.now();
      const remaining = endTime - now;
      const percent = (remaining / duration) * 100;
      
      if (percent <= 0) {
        handleClose();
      } else {
        setProgress(percent);
        requestAnimationFrame(updateProgress);
      }
    };

    const animationId = requestAnimationFrame(updateProgress);

    return () => cancelAnimationFrame(animationId);
  }, [duration, type, handleClose]);

  return (
    <div
      role="alert"
      aria-live="polite"
      className={`
        relative overflow-hidden rounded-xl border shadow-lg backdrop-blur-sm
        transform transition-all duration-300 ease-out
        ${isExiting ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100'}
        ${config.className}
      `}
      style={{ minWidth: '320px', maxWidth: '420px' }}
    >
      <div className="flex items-start gap-3 p-4">
        {/* Icon */}
        <div className={`flex-shrink-0 ${config.iconClassName}`}>
          {config.icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {title && (
            <p className="font-semibold text-sm">{title}</p>
          )}
          {message && (
            <p className={`text-sm ${title ? 'mt-0.5 opacity-90' : ''}`}>
              {message}
            </p>
          )}
          {action && (
            <button
              onClick={() => {
                action.onClick?.();
                handleClose();
              }}
              className="mt-2 text-sm font-medium underline hover:no-underline"
            >
              {action.label}
            </button>
          )}
        </div>

        {/* Close button */}
        {type !== 'loading' && (
          <button
            onClick={handleClose}
            className="flex-shrink-0 p-1 rounded-lg hover:bg-black/5 transition-colors"
            aria-label="Dismiss notification"
          >
            <svg className="w-4 h-4 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Progress bar */}
      {showProgress && duration > 0 && type !== 'loading' && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/5">
          <div 
            className={`h-full transition-all ease-linear ${config.progressClassName}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
}

/**
 * Toast Container - Renders all toasts
 */
export function ToastContainer({ toasts, onClose, onRemove, position = 'top-right' }) {
  // Support both onClose and onRemove for backward compatibility
  const handleClose = onClose || onRemove;
  const positions = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'top-center': 'top-4 left-1/2 -translate-x-1/2',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2',
  };

  return (
    <div 
      className={`fixed z-[9999] flex flex-col gap-3 pointer-events-none ${positions[position]}`}
      aria-label="Notifications"
    >
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <Toast {...toast} onClose={handleClose} />
        </div>
      ))}
    </div>
  );
}

/**
 * Toast Context for global toast management
 */
const ToastContext = createContext(null);

export function ToastProvider({ children, position = 'top-right', maxToasts = 5 }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((options) => {
    const id = Date.now().toString(36) + Math.random().toString(36).substr(2);
    const toast = { id, ...options };
    
    setToasts((prev) => {
      const newToasts = [...prev, toast];
      // Remove oldest if exceeding max
      if (newToasts.length > maxToasts) {
        return newToasts.slice(-maxToasts);
      }
      return newToasts;
    });

    return id;
  }, [maxToasts]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const updateToast = useCallback((id, options) => {
    setToasts((prev) => 
      prev.map((t) => (t.id === id ? { ...t, ...options } : t))
    );
  }, []);

  // Convenience methods
  const toast = useCallback((message, options = {}) => {
    return addToast({ message, type: 'info', ...options });
  }, [addToast]);

  toast.success = (message, options = {}) => 
    addToast({ message, type: 'success', title: 'Success', ...options });
  
  toast.error = (message, options = {}) => 
    addToast({ message, type: 'error', title: 'Error', ...options });
  
  toast.warning = (message, options = {}) => 
    addToast({ message, type: 'warning', title: 'Warning', ...options });
  
  toast.info = (message, options = {}) => 
    addToast({ message, type: 'info', ...options });
  
  toast.loading = (message, options = {}) => 
    addToast({ message, type: 'loading', duration: 0, ...options });

  toast.promise = async (promise, messages) => {
    const id = addToast({ 
      message: messages.loading || 'Loading...', 
      type: 'loading', 
      duration: 0 
    });

    try {
      const result = await promise;
      updateToast(id, { 
        message: messages.success || 'Success!', 
        type: 'success',
        title: 'Success',
        duration: 5000 
      });
      return result;
    } catch (error) {
      updateToast(id, { 
        message: messages.error || error.message || 'Something went wrong', 
        type: 'error',
        title: 'Error',
        duration: 5000 
      });
      throw error;
    }
  };

  toast.dismiss = removeToast;
  toast.update = updateToast;

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <ToastContainer toasts={toasts} onClose={removeToast} position={position} />
    </ToastContext.Provider>
  );
}

/**
 * useToast hook
 */
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

export default ToastProvider;
