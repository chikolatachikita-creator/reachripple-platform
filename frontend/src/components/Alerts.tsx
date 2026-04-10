import React from "react";

interface ErrorAlertProps {
  message: string | null;
  onDismiss?: () => void;
  className?: string;
}

export const ErrorAlert: React.FC<ErrorAlertProps> = ({ message, onDismiss, className = "" }) => {
  if (!message) return null;

  return (
    <div className={`p-4 mb-4 bg-red-50 border border-red-200 rounded-lg ${className}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <span className="text-xl text-red-600">❌</span>
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-red-800">{message}</p>
          </div>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="ml-3 text-red-600 hover:text-red-800 text-sm font-medium"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
};

interface SuccessAlertProps {
  message: string | null;
  onDismiss?: () => void;
  className?: string;
}

export const SuccessAlert: React.FC<SuccessAlertProps> = ({
  message,
  onDismiss,
  className = "",
}) => {
  if (!message) return null;

  return (
    <div className={`p-4 mb-4 bg-green-50 border border-green-200 rounded-lg ${className}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <span className="text-xl text-green-600">✓</span>
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-green-800">{message}</p>
          </div>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="ml-3 text-green-600 hover:text-green-800 text-sm font-medium"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
};

interface WarningAlertProps {
  message: string | null;
  onDismiss?: () => void;
  className?: string;
}

export const WarningAlert: React.FC<WarningAlertProps> = ({
  message,
  onDismiss,
  className = "",
}) => {
  if (!message) return null;

  return (
    <div className={`p-4 mb-4 bg-yellow-50 border border-yellow-200 rounded-lg ${className}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <span className="text-xl text-yellow-600">⚠️</span>
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-yellow-800">{message}</p>
          </div>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="ml-3 text-yellow-600 hover:text-yellow-800 text-sm font-medium"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
};
