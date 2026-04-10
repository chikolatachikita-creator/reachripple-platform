import React from 'react';
import { useTheme } from '../context/ThemeContext';

/**
 * Theme Toggle Button
 * Renders a sun/moon icon that toggles between light and dark modes
 */
export default function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-lg transition-colors duration-200 hover:bg-gray-200 dark:hover:bg-gray-700"
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
    >
      {isDark ? (
        // Sun icon for light mode
        <svg
          className="w-5 h-5 text-yellow-500"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M10 2a1 1 0 011 1v2a1 1 0 11-2 0V3a1 1 0 011-1zm4.22 1.78a1 1 0 011.415 0l1.414 1.414a1 1 0 01-1.415 1.415L14.22 5.22a1 1 0 010-1.415zm2 4.22a1 1 0 011 1v2a1 1 0 11-2 0v-2a1 1 0 011-1zm0 5.5a1 1 0 011 1v2a1 1 0 11-2 0v-2a1 1 0 011-1zM15.657 13.657a1 1 0 001.414-1.414l-1.414-1.414a1 1 0 00-1.414 1.414l1.414 1.414zm2.121 2.121a1 1 0 01-1.414 0l-1.414-1.414a1 1 0 011.414-1.415l1.414 1.415zM10 15a1 1 0 011 1v2a1 1 0 11-2 0v-2a1 1 0 011-1zM4.22 13.657l1.414 1.414a1 1 0 01-1.414 1.414L2.808 15.07a1 1 0 011.414-1.414zm1.414-5.657a1 1 0 00-1.414 1.414l1.414 1.414a1 1 0 001.414-1.414L5.636 8zM2.808 4.929L4.222 3.515a1 1 0 00-1.414-1.415L1.394 3.514a1 1 0 001.414 1.415zM10 5a1 1 0 011 1v2a1 1 0 11-2 0V6a1 1 0 011-1z"
            clipRule="evenodd"
          />
        </svg>
      ) : (
        // Moon icon for dark mode
        <svg
          className="w-5 h-5 text-gray-600"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
        </svg>
      )}
    </button>
  );
}
