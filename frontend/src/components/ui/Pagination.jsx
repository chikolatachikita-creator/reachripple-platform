import React from 'react';

/**
 * Pagination - A reusable pagination component
 * 
 * @param {number} currentPage - Current active page (1-indexed)
 * @param {number} totalPages - Total number of pages
 * @param {Function} onPageChange - Callback when page changes
 * @param {number} siblingCount - Number of page buttons to show on each side of current page (default: 1)
 * @param {boolean} showFirstLast - Show first/last page buttons (default: true)
 * @param {boolean} showPrevNext - Show prev/next buttons (default: true)
 * @param {string} size - 'sm' | 'md' | 'lg' (default: 'md')
 * @param {string} variant - 'default' | 'rounded' | 'minimal' (default: 'default')
 * @param {string} className - Additional CSS classes
 */
export default function Pagination({
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  siblingCount = 1,
  showFirstLast = true,
  showPrevNext = true,
  size = 'md',
  variant = 'default',
  className = '',
}) {
  // Don't render if only one page
  if (totalPages <= 1) return null;

  // Size configurations
  const sizes = {
    sm: {
      button: 'h-7 min-w-[28px] px-2 text-xs',
      icon: 'w-3.5 h-3.5',
      gap: 'gap-1',
    },
    md: {
      button: 'h-9 min-w-[36px] px-3 text-sm',
      icon: 'w-4 h-4',
      gap: 'gap-1.5',
    },
    lg: {
      button: 'h-11 min-w-[44px] px-4 text-base',
      icon: 'w-5 h-5',
      gap: 'gap-2',
    },
  };

  // Variant configurations
  const variants = {
    default: {
      base: 'border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700',
      active: 'bg-gradient-to-r from-blue-500 to-purple-500 text-white border-transparent shadow-md',
      disabled: 'bg-zinc-100 text-zinc-400 cursor-not-allowed border-zinc-200',
    },
    rounded: {
      base: 'border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 rounded-full',
      active: 'bg-gradient-to-r from-blue-500 to-purple-500 text-white border-transparent shadow-md rounded-full',
      disabled: 'bg-zinc-100 text-zinc-400 cursor-not-allowed border-zinc-200 rounded-full',
    },
    minimal: {
      base: 'bg-transparent hover:bg-zinc-100 text-zinc-600',
      active: 'bg-blue-100 text-blue-700 font-semibold',
      disabled: 'text-zinc-300 cursor-not-allowed',
    },
  };

  const sizeConfig = sizes[size];
  const variantConfig = variants[variant];

  // Generate page numbers to display
  const getPageNumbers = () => {
    const totalNumbers = siblingCount * 2 + 3; // siblings + current + first + last
    const totalBlocks = totalNumbers + 2; // + 2 for dots

    if (totalPages <= totalBlocks) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const leftSiblingIndex = Math.max(currentPage - siblingCount, 1);
    const rightSiblingIndex = Math.min(currentPage + siblingCount, totalPages);

    const showLeftDots = leftSiblingIndex > 2;
    const showRightDots = rightSiblingIndex < totalPages - 1;

    if (!showLeftDots && showRightDots) {
      const leftItemCount = 3 + 2 * siblingCount;
      const leftRange = Array.from({ length: leftItemCount }, (_, i) => i + 1);
      return [...leftRange, 'dots', totalPages];
    }

    if (showLeftDots && !showRightDots) {
      const rightItemCount = 3 + 2 * siblingCount;
      const rightRange = Array.from(
        { length: rightItemCount },
        (_, i) => totalPages - rightItemCount + i + 1
      );
      return [1, 'dots', ...rightRange];
    }

    if (showLeftDots && showRightDots) {
      const middleRange = Array.from(
        { length: rightSiblingIndex - leftSiblingIndex + 1 },
        (_, i) => leftSiblingIndex + i
      );
      return [1, 'dots', ...middleRange, 'dots', totalPages];
    }

    return [];
  };

  const pages = getPageNumbers();

  // Button base styles
  const buttonBase = `
    inline-flex items-center justify-center font-medium rounded-lg
    transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30
    ${sizeConfig.button}
  `;

  // Navigate to page
  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      onPageChange?.(page);
    }
  };

  return (
    <nav 
      className={`flex items-center ${sizeConfig.gap} ${className}`}
      role="navigation"
      aria-label="Pagination"
    >
      {/* First page button */}
      {showFirstLast && (
        <button
          onClick={() => goToPage(1)}
          disabled={currentPage === 1}
          className={`${buttonBase} ${currentPage === 1 ? variantConfig.disabled : variantConfig.base}`}
          aria-label="Go to first page"
          title="First page"
        >
          <svg className={sizeConfig.icon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
        </button>
      )}

      {/* Previous button */}
      {showPrevNext && (
        <button
          onClick={() => goToPage(currentPage - 1)}
          disabled={currentPage === 1}
          className={`${buttonBase} ${currentPage === 1 ? variantConfig.disabled : variantConfig.base}`}
          aria-label="Go to previous page"
          title="Previous page"
        >
          <svg className={sizeConfig.icon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}

      {/* Page numbers */}
      <div className={`flex items-center ${sizeConfig.gap}`}>
        {pages.map((page, index) => {
          if (page === 'dots') {
            return (
              <span 
                key={`dots-${index}`} 
                className={`${sizeConfig.button} text-zinc-400 flex items-center justify-center`}
                aria-hidden="true"
              >
                ···
              </span>
            );
          }

          const isActive = page === currentPage;
          return (
            <button
              key={page}
              onClick={() => goToPage(page)}
              className={`${buttonBase} ${isActive ? variantConfig.active : variantConfig.base}`}
              aria-label={`Go to page ${page}`}
              aria-current={isActive ? 'page' : undefined}
            >
              {page}
            </button>
          );
        })}
      </div>

      {/* Next button */}
      {showPrevNext && (
        <button
          onClick={() => goToPage(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={`${buttonBase} ${currentPage === totalPages ? variantConfig.disabled : variantConfig.base}`}
          aria-label="Go to next page"
          title="Next page"
        >
          <svg className={sizeConfig.icon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}

      {/* Last page button */}
      {showFirstLast && (
        <button
          onClick={() => goToPage(totalPages)}
          disabled={currentPage === totalPages}
          className={`${buttonBase} ${currentPage === totalPages ? variantConfig.disabled : variantConfig.base}`}
          aria-label="Go to last page"
          title="Last page"
        >
          <svg className={sizeConfig.icon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
          </svg>
        </button>
      )}
    </nav>
  );
}

/**
 * PaginationInfo - Shows "Showing X-Y of Z results" text
 */
export function PaginationInfo({ 
  currentPage, 
  pageSize, 
  totalItems,
  className = '' 
}) {
  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalItems);

  if (totalItems === 0) {
    return <span className={`text-sm text-zinc-500 ${className}`}>No results</span>;
  }

  return (
    <span className={`text-sm text-zinc-500 ${className}`}>
      Showing <span className="font-medium text-zinc-700">{start}</span> to{' '}
      <span className="font-medium text-zinc-700">{end}</span> of{' '}
      <span className="font-medium text-zinc-700">{totalItems}</span> results
    </span>
  );
}

/**
 * usePagination - Hook for managing pagination state
 */
export function usePagination({ totalItems, pageSize = 10, initialPage = 1 }) {
  const [currentPage, setCurrentPage] = React.useState(initialPage);
  const totalPages = Math.ceil(totalItems / pageSize);

  // Reset to page 1 if totalItems changes and current page is invalid
  React.useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [totalItems, totalPages, currentPage]);

  const goToPage = React.useCallback((page) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  }, [totalPages]);

  const nextPage = React.useCallback(() => {
    setCurrentPage(prev => Math.min(prev + 1, totalPages));
  }, [totalPages]);

  const prevPage = React.useCallback(() => {
    setCurrentPage(prev => Math.max(prev - 1, 1));
  }, []);

  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);

  return {
    currentPage,
    totalPages,
    pageSize,
    startIndex,
    endIndex,
    goToPage,
    nextPage,
    prevPage,
    setCurrentPage,
    hasNextPage: currentPage < totalPages,
    hasPrevPage: currentPage > 1,
  };
}
