import React from 'react';
import { Link } from 'react-router-dom';

/**
 * ErrorBoundary - Catches JavaScript errors anywhere in child component tree
 * Prevents the entire app from crashing and shows a friendly fallback UI
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null 
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render shows the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log error to console (in production, send to error tracking service)
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
    
    // In production, you could send to an error tracking service:
    // errorTrackingService.log({ error, errorInfo });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <div className="min-h-[400px] flex items-center justify-center p-6">
          <div className="text-center max-w-md">
            {/* Error icon */}
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-red-100 to-orange-100 flex items-center justify-center">
              <svg className="w-10 h-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>

            {/* Error title */}
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              {this.props.title || "Something went wrong"}
            </h2>

            {/* Error description */}
            <p className="text-gray-500 mb-6">
              {this.props.description || "We're sorry, but something unexpected happened. Please try again or contact support if the problem persists."}
            </p>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={this.handleRetry}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold shadow-lg shadow-purple-500/25 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                Try Again
              </button>
              <Link
                to="/"
                className="px-6 py-3 rounded-xl bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200 transition-all"
              >
                Go Home
              </Link>
            </div>

            {/* Show error details in development */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-8 text-left">
                <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-700">
                  Technical Details (Dev Only)
                </summary>
                <div className="mt-2 p-4 bg-gray-100 rounded-lg overflow-auto text-xs text-gray-700 font-mono">
                  <p className="font-bold text-red-600 mb-2">{this.state.error.toString()}</p>
                  {this.state.errorInfo && (
                    <pre className="whitespace-pre-wrap">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  )}
                </div>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Functional wrapper for easier use with hooks
 */
export function withErrorBoundary(Component, props = {}) {
  return function WrappedComponent(componentProps) {
    return (
      <ErrorBoundary {...props}>
        <Component {...componentProps} />
      </ErrorBoundary>
    );
  };
}

/**
 * Page-level error boundary with full-screen fallback
 */
export function PageErrorBoundary({ children }) {
  return (
    <ErrorBoundary
      title="Page Error"
      description="This page encountered an error. Please try refreshing or navigating to a different page."
    >
      {children}
    </ErrorBoundary>
  );
}

/**
 * Section-level error boundary with inline fallback
 */
export function SectionErrorBoundary({ children, title = "Section Error" }) {
  return (
    <ErrorBoundary
      title={title}
      description="This section couldn't load properly. Click 'Try Again' to reload it."
    >
      {children}
    </ErrorBoundary>
  );
}

export default ErrorBoundary;
