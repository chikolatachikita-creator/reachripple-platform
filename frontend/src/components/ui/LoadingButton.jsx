import React from 'react';

/**
 * LoadingButton - Button component with loading state
 * 
 * @param {Object} props
 * @param {boolean} props.loading - Whether the button is in loading state
 * @param {React.ReactNode} props.children - Button content
 * @param {string} props.loadingText - Text to show while loading (optional)
 * @param {string} props.variant - Button variant: 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost'
 * @param {string} props.size - Button size: 'sm' | 'md' | 'lg'
 * @param {boolean} props.fullWidth - Whether button takes full width
 * @param {string} props.spinnerPosition - 'left' | 'right' | 'center'
 * @param {React.ReactNode} props.leftIcon - Icon to show on the left
 * @param {React.ReactNode} props.rightIcon - Icon to show on the right
 */

// Spinner component
const Spinner = ({ size = 'md', className = '' }) => {
  const sizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  return (
    <svg
      className={`animate-spin ${sizes[size]} ${className}`}
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
};

// Button variants styles
const variants = {
  primary: `
    bg-gradient-to-r from-blue-500 to-purple-600 
    text-white 
    hover:from-blue-600 hover:to-purple-700
    focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
    disabled:from-blue-300 disabled:to-purple-400 disabled:cursor-not-allowed
  `,
  secondary: `
    bg-zinc-100 dark:bg-zinc-800
    text-zinc-900 dark:text-zinc-100
    hover:bg-zinc-200 dark:hover:bg-zinc-700
    focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2
    disabled:bg-zinc-50 disabled:text-zinc-400 disabled:cursor-not-allowed
  `,
  danger: `
    bg-red-500 
    text-white 
    hover:bg-red-600
    focus:ring-2 focus:ring-red-500 focus:ring-offset-2
    disabled:bg-red-300 disabled:cursor-not-allowed
  `,
  outline: `
    border-2 border-blue-500 
    text-blue-500 dark:text-blue-400
    hover:bg-blue-50 dark:hover:bg-blue-500/10
    focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
    disabled:border-blue-300 disabled:text-blue-300 disabled:cursor-not-allowed
  `,
  ghost: `
    text-zinc-700 dark:text-zinc-300
    hover:bg-zinc-100 dark:hover:bg-zinc-800
    focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2
    disabled:text-zinc-400 disabled:cursor-not-allowed
  `,
  success: `
    bg-green-500 
    text-white 
    hover:bg-green-600
    focus:ring-2 focus:ring-green-500 focus:ring-offset-2
    disabled:bg-green-300 disabled:cursor-not-allowed
  `,
};

// Button sizes
const sizes = {
  sm: 'px-3 py-1.5 text-sm gap-1.5',
  md: 'px-4 py-2 text-base gap-2',
  lg: 'px-6 py-3 text-lg gap-2.5',
};

export function LoadingButton({
  loading = false,
  children,
  loadingText,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  spinnerPosition = 'left',
  leftIcon,
  rightIcon,
  disabled,
  className = '',
  type = 'button',
  ...props
}) {
  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      disabled={isDisabled}
      className={`
        inline-flex items-center justify-center
        font-medium rounded-xl
        transition-all duration-200 ease-out
        ${variants[variant]}
        ${sizes[size]}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      {...props}
    >
      {/* Left spinner or icon */}
      {loading && spinnerPosition === 'left' && (
        <Spinner size={size} />
      )}
      {!loading && leftIcon && (
        <span className="flex-shrink-0">{leftIcon}</span>
      )}

      {/* Center content */}
      {loading && spinnerPosition === 'center' ? (
        <Spinner size={size} />
      ) : (
        <span>{loading && loadingText ? loadingText : children}</span>
      )}

      {/* Right spinner or icon */}
      {loading && spinnerPosition === 'right' && (
        <Spinner size={size} />
      )}
      {!loading && rightIcon && (
        <span className="flex-shrink-0">{rightIcon}</span>
      )}
    </button>
  );
}

/**
 * IconButton - Icon-only button with loading state
 */
export function IconButton({
  loading = false,
  children,
  variant = 'ghost',
  size = 'md',
  className = '',
  'aria-label': ariaLabel,
  ...props
}) {
  const iconSizes = {
    sm: 'p-1.5',
    md: 'p-2',
    lg: 'p-3',
  };

  const spinnerSizes = {
    sm: 'sm',
    md: 'sm',
    lg: 'md',
  };

  return (
    <button
      disabled={loading}
      aria-label={ariaLabel}
      className={`
        inline-flex items-center justify-center
        rounded-xl transition-all duration-200 ease-out
        ${variants[variant]}
        ${iconSizes[size]}
        ${className}
      `}
      {...props}
    >
      {loading ? <Spinner size={spinnerSizes[size]} /> : children}
    </button>
  );
}

/**
 * ButtonGroup - Group of buttons
 */
export function ButtonGroup({ children, className = '' }) {
  return (
    <div className={`inline-flex rounded-xl overflow-hidden ${className}`}>
      {React.Children.map(children, (child, index) => {
        if (!React.isValidElement(child)) return child;
        
        return React.cloneElement(child, {
          className: `${child.props.className || ''} ${
            index === 0 ? 'rounded-r-none' : 
            index === React.Children.count(children) - 1 ? 'rounded-l-none' : 
            'rounded-none'
          }`,
        });
      })}
    </div>
  );
}

export { Spinner };
export default LoadingButton;
