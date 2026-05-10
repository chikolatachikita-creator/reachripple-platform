import React from 'react';

/**
 * SkipLink - Allows keyboard users to skip to main content
 * 
 * Place this at the very top of your app layout.
 * The target element should have id="main-content" or specify targetId.
 * 
 * @example
 * <SkipLink />
 * <Header />
 * <main id="main-content">
 *   ...
 * </main>
 */
export default function SkipLink({ 
  targetId = 'main-content', 
  children = 'Skip to main content' 
}) {
  return (
    <a
      href={`#${targetId}`}
      className="
        absolute left-0 z-[10000]
        -translate-y-full focus:translate-y-0
        bg-zinc-900 text-white
        px-4 py-2
        rounded-br-lg
        text-sm font-medium
        transition-transform duration-200
        focus:outline-none focus:ring-2 focus:ring-blue-500
      "
    >
      {children}
    </a>
  );
}

/**
 * VisuallyHidden - Hides content visually but keeps it accessible to screen readers
 * 
 * @example
 * <button>
 *   <HeartIcon />
 *   <VisuallyHidden>Add to favorites</VisuallyHidden>
 * </button>
 */
export function VisuallyHidden({ children, as: Component = 'span' }) {
  return (
    <Component
      className="sr-only"
      style={{
        position: 'absolute',
        width: '1px',
        height: '1px',
        padding: '0',
        margin: '-1px',
        overflow: 'hidden',
        clip: 'rect(0, 0, 0, 0)',
        whiteSpace: 'nowrap',
        border: '0',
      }}
    >
      {children}
    </Component>
  );
}

/**
 * FocusRing - Wrapper that adds consistent focus ring styling
 */
export function FocusRing({ children, className = '' }) {
  return (
    <div 
      className={`
        focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2
        rounded-lg
        ${className}
      `}
    >
      {children}
    </div>
  );
}

/**
 * LiveRegion - Announces dynamic content changes to screen readers
 * 
 * @param {Object} props
 * @param {'polite' | 'assertive'} props.priority - How urgently to announce
 * @param {React.ReactNode} props.children - Content to announce
 */
export function LiveRegion({ 
  children, 
  priority = 'polite',
  atomic = true,
  className = 'sr-only'
}) {
  return (
    <div
      role="status"
      aria-live={priority}
      aria-atomic={atomic}
      className={className}
    >
      {children}
    </div>
  );
}

/**
 * Accessible loading indicator with proper ARIA attributes
 */
export function LoadingAnnouncer({ isLoading, loadingText = 'Loading', children }) {
  return (
    <div aria-busy={isLoading} aria-live="polite">
      {isLoading ? (
        <LiveRegion priority="polite">
          {loadingText}
        </LiveRegion>
      ) : null}
      {children}
    </div>
  );
}
