import React, { createContext, useContext, useState, useCallback } from 'react';
import { ToastContainer } from '../components/ui/Toast';

const ToastContextGlobal = createContext();

export const ToastProviderGlobal = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 3000) => {
    const id = Math.random().toString(36).substr(2, 9);
    
    const newToast = { id, message, type, duration };
    setToasts(prev => [...prev, newToast]);

    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const showSuccess = useCallback((message) => {
    return addToast(message, 'success', 3000);
  }, [addToast]);

  const showError = useCallback((message) => {
    return addToast(message, 'error', 4000);
  }, [addToast]);

  const showWarning = useCallback((message) => {
    return addToast(message, 'warning', 3000);
  }, [addToast]);

  const showInfo = useCallback((message) => {
    return addToast(message, 'info', 3000);
  }, [addToast]);

  // Backwards-compatible showToast(message, type) for components migrating from ToastContext
  const showToast = useCallback((message, type = 'success') => {
    return addToast(message, type, type === 'error' ? 4000 : 3000);
  }, [addToast]);

  return (
    <ToastContextGlobal.Provider value={{ toasts, addToast, removeToast, showSuccess, showError, showWarning, showInfo, showToast }}>
      {children}
      <ToastContainer 
        toasts={toasts} 
        onRemove={removeToast}
      />
    </ToastContextGlobal.Provider>
  );
};

export const useToastContext = () => {
  const context = useContext(ToastContextGlobal);
  if (!context) {
    throw new Error('useToastContext must be used within ToastProviderGlobal');
  }
  return context;
};
