import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useNavigate } from 'react-router-dom';

export default function NotFoundPage() {
  const navigate = useNavigate();
  const [fadeIn, setFadeIn] = useState(false);
  const [countdown, setCountdown] = useState(10);

  useEffect(() => {
    requestAnimationFrame(() => setFadeIn(true));
  }, []);

  // Auto-redirect countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate('/');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [navigate]);

  return (
    <div className={`min-h-screen bg-gradient-to-br from-zinc-50 via-purple-50/30 to-pink-50/30 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950 flex items-center justify-center p-6 transition-all duration-500 ${fadeIn ? 'opacity-100' : 'opacity-0'}`}>
      <Helmet><title>Page Not Found | ReachRipple</title></Helmet>
      <div className="max-w-lg w-full text-center">
        {/* Animated 404 illustration */}
        <div className="relative mb-8">
          {/* Background glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-r from-purple-400/20 to-pink-400/20 rounded-full blur-3xl" />
          
          {/* 404 Number */}
          <div className="relative">
            <h1 className="text-[150px] sm:text-[180px] font-black text-transparent bg-clip-text bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 leading-none select-none">
              404
            </h1>
            {/* Floating emoji */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-6xl animate-bounce">
              🔍
            </div>
          </div>
        </div>

        {/* Error message */}
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-3">
          Page Not Found
        </h2>
        <p className="text-gray-500 dark:text-zinc-400 text-lg mb-8 max-w-md mx-auto">
          Oops! The page you're looking for seems to have wandered off. 
          Let's get you back on track.
        </p>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8">
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold shadow-lg shadow-purple-500/25 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Go Home
          </Link>
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 font-bold shadow-md border border-gray-100 dark:border-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-700 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Go Back
          </button>
        </div>

        {/* Auto-redirect notice */}
        <p className="text-sm text-gray-400 dark:text-zinc-500">
          Redirecting to home in{' '}
          <span className="font-semibold text-purple-600">{countdown}</span>
          {' '}seconds...
        </p>

        {/* Quick links */}
        <div className="mt-10 pt-8 border-t border-gray-100 dark:border-zinc-800">
          <p className="text-sm text-gray-500 dark:text-zinc-400 mb-4">Popular pages you might be looking for:</p>
          <div className="flex flex-wrap gap-2 justify-center">
            {[
              { to: '/search', label: 'Browse Profiles' },
              { to: '/login', label: 'Sign In' },
              { to: '/signup', label: 'Create Account' },
              { to: '/help', label: 'Help Center' },
            ].map(link => (
              <Link
                key={link.to}
                to={link.to}
                className="px-4 py-2 rounded-full bg-white dark:bg-zinc-800 text-gray-600 dark:text-zinc-300 text-sm font-medium border border-gray-100 dark:border-zinc-700 hover:border-purple-200 dark:hover:border-purple-700 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/30 transition-all"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
