import React, { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useNavigate } from "react-router-dom";
import { login, getOAuthConfig } from "../api/auth";
import { useAuth } from "../context/AuthContext";
import { validators } from "../utils/formValidation";
import { LoadingButton } from "../components/ui/LoadingButton";
import ThemeToggle from "../components/ThemeToggle";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login: authLogin } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [fadeIn, setFadeIn] = useState(false);
  const [oauthConfig, setOauthConfig] = useState(null);

  // Inline validation state
  const [touched, setTouched] = useState({ email: false, password: false });
  const [fieldErrors, setFieldErrors] = useState({ email: null, password: null });

  useEffect(() => {
    requestAnimationFrame(() => setFadeIn(true));
    getOAuthConfig().then(setOauthConfig).catch(() => {});
  }, []);

  // Validate fields on blur
  const validateField = (name, value) => {
    let error = null;
    if (name === 'email') {
      error = validators.required(value, 'Email') || validators.email(value);
    } else if (name === 'password') {
      error = validators.required(value, 'Password');
    }
    setFieldErrors(prev => ({ ...prev, [name]: error }));
    return error;
  };

  const handleBlur = (name) => {
    setTouched(prev => ({ ...prev, [name]: true }));
    validateField(name, name === 'email' ? email : password);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    
    // Validate all fields
    const emailError = validateField('email', email);
    const passwordError = validateField('password', password);
    setTouched({ email: true, password: true });
    
    if (emailError || passwordError) {
      return;
    }
    
    setLoading(true);

    try {
      const user = await login(email, password);
      if (user) {
        // SECURITY: Validate response has required fields before storing
        if (!user._id || !user.email) {
          setError("Invalid user data received from server");
          return;
        }

        // Only store essential user info
        localStorage.setItem("userId", String(user._id));
        localStorage.setItem("userName", String(user.name || ""));
        localStorage.setItem("userEmail", String(user.email));
        // Don't trust role from response - it's already verified by backend
        localStorage.setItem("userRole", String(user.role || "user"));
        
        // Update AuthContext state
        authLogin(user);
        
        if (user.role === "admin") {
          navigate("/admin/dashboard");
        } else if (user.accountType === "agency" && user.verificationStatus !== "verified") {
          navigate("/agency");
        } else {
          navigate("/");
        }
      }
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-950 dark:to-zinc-900 flex transition-all duration-500 ${fadeIn ? "opacity-100" : "opacity-0"}`}>
      <Helmet><title>Log In | ReachRipple</title></Helmet>
      {/* Left Panel - Decorative */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 relative overflow-hidden">
        {/* Animated gradient orbs */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-orange-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-pink-500/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '0.5s' }} />
        
        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-20">
          <Link to="/" className="flex items-center gap-3 mb-12">
            <img src="/logomark.png" alt="ReachRipple" className="w-14 h-14 rounded-xl object-cover shadow-lg shadow-pink-500/30 ring-1 ring-white/10" />
            <span className="text-white font-bold text-xl"><span className="text-pink-400">Reach</span><span className="text-purple-400">Ripple</span></span>
          </Link>
          
          <h2 className="text-4xl xl:text-5xl font-bold text-white leading-tight">
            Welcome back to
            <span className="block bg-gradient-to-r from-orange-400 to-pink-500 bg-clip-text text-transparent mt-1">
              your account
            </span>
          </h2>
          
          <p className="mt-6 text-white/60 text-lg leading-relaxed max-w-md">
            Access your dashboard, manage your listings, and connect with others on the platform.
          </p>
          
          {/* Trust indicators */}
          <div className="mt-10 flex flex-wrap gap-4">
            {[
              { icon: "🔒", text: "Secure login" },
              { icon: "⚡", text: "Quick access" },
              { icon: "🛡️", text: "Protected" },
            ].map((item) => (
              <div key={item.text} className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-xl border border-white/10">
                <span>{item.icon}</span>
                <span className="text-white/70 text-sm font-medium">{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Right Panel - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-5 sm:px-6 py-8 sm:py-12">
        <div className="w-full max-w-md">
          {/* Mobile Logo + Theme Toggle */}
          <div className="lg:hidden flex items-center justify-between mb-8">
            <Link to="/" className="flex items-center gap-3">
              <img src="/logomark.png" alt="ReachRipple" className="w-10 h-10 rounded-xl object-cover shadow-md" />
              <span className="text-zinc-900 dark:text-white font-bold text-lg"><span className="text-pink-500">Reach</span><span className="text-purple-600">Ripple</span></span>
            </Link>
            <ThemeToggle />
          </div>

          {/* Title */}
          <div className="mb-8">
            <h1 className="text-2xl md:text-3xl font-bold text-zinc-900 dark:text-white">Sign in to your account</h1>
            <p className="mt-2 text-zinc-500 dark:text-zinc-400">
              Don't have an account?{" "}
              <Link to="/signup" className="text-orange-600 font-medium hover:text-orange-700">
                Create one
              </Link>
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3">
              <span className="text-red-500 text-lg">⚠️</span>
              <div>
                <p className="text-sm font-medium text-red-800">Login failed</p>
                <p className="text-sm text-red-600 mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-5">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Email address</label>
              <div className="relative">
                <input
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError("");
                    if (touched.email) validateField('email', e.target.value);
                  }}
                  onBlur={() => handleBlur('email')}
                  className={`w-full h-12 rounded-xl border px-4 pl-11 text-sm transition-all
                           focus:outline-none focus:ring-2
                           ${touched.email && fieldErrors.email 
                             ? 'border-red-300 bg-red-50/50 focus:ring-red-500/20 focus:border-red-500' 
                             : touched.email && !fieldErrors.email 
                               ? 'border-green-300 bg-green-50/30 focus:ring-green-500/20 focus:border-green-500'
                               : 'border-zinc-200 bg-zinc-50 hover:bg-white focus:bg-white focus:ring-orange-500/20 focus:border-orange-500'
                           }`}
                  required
                />
                <span className={`absolute left-4 top-1/2 -translate-y-1/2 ${touched.email && fieldErrors.email ? 'text-red-400' : 'text-zinc-400'}`}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                  </svg>
                </span>
                {/* Validation icon */}
                {touched.email && (
                  <span className="absolute right-4 top-1/2 -translate-y-1/2">
                    {fieldErrors.email ? (
                      <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    )}
                  </span>
                )}
              </div>
              {/* Error message */}
              {touched.email && fieldErrors.email && (
                <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1.5">{fieldErrors.email}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError("");
                    if (touched.password) validateField('password', e.target.value);
                  }}
                  onBlur={() => handleBlur('password')}
                  className={`w-full h-12 rounded-xl border px-4 pl-11 pr-11 text-sm transition-all
                           focus:outline-none focus:ring-2
                           ${touched.password && fieldErrors.password 
                             ? 'border-red-300 bg-red-50/50 focus:ring-red-500/20 focus:border-red-500' 
                             : touched.password && !fieldErrors.password 
                               ? 'border-green-300 bg-green-50/30 focus:ring-green-500/20 focus:border-green-500'
                               : 'border-zinc-200 bg-zinc-50 hover:bg-white focus:bg-white focus:ring-orange-500/20 focus:border-orange-500'
                           }`}
                  required
                />
                <span className={`absolute left-4 top-1/2 -translate-y-1/2 ${touched.password && fieldErrors.password ? 'text-red-400' : 'text-zinc-400'}`}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </span>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              {/* Error message */}
              {touched.password && fieldErrors.password && (
                <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1.5">{fieldErrors.password}</p>
              )}
            </div>

            {/* Forgot Password */}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => navigate('/forgot-password')}
                className="text-sm text-orange-600 hover:text-orange-700 font-medium"
              >
                Forgot password?
              </button>
            </div>

            {/* Submit Button */}
            <LoadingButton
              type="submit"
              loading={loading}
              loadingText="Signing in..."
              variant="primary"
              size="lg"
              fullWidth
              className="shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 hover:scale-[1.01] active:scale-[0.99]"
            >
              Sign in
            </LoadingButton>
          </form>

          {/* Divider */}
          <div className="my-8 flex items-center gap-4">
            <div className="h-px bg-zinc-200 dark:bg-zinc-700 flex-1"></div>
            <span className="text-xs text-zinc-400 font-medium">OR</span>
            <div className="h-px bg-zinc-200 dark:bg-zinc-700 flex-1"></div>
          </div>

          {/* Social Login Buttons */}
          <div>
            <button
              type="button"
              disabled={!oauthConfig?.google?.enabled}
              onClick={() => {
                if (!oauthConfig?.google?.enabled) return;
                const params = new URLSearchParams({
                  client_id: oauthConfig.google.clientId,
                  redirect_uri: oauthConfig.google.redirectUri,
                  response_type: "code",
                  scope: "openid email profile",
                  access_type: "offline",
                  prompt: "consent",
                });
                window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
              }}
              className={`w-full h-11 rounded-xl border font-medium text-sm flex items-center justify-center gap-2 relative group transition-colors
                ${oauthConfig?.google?.enabled
                  ? "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 hover:border-zinc-300 cursor-pointer"
                  : "border-zinc-200 bg-white text-zinc-400 cursor-not-allowed opacity-60"}`}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
              {!oauthConfig?.google?.enabled && (
                <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-zinc-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">Not configured</span>
              )}
            </button>

            {/* Facebook */}
            {oauthConfig?.facebook?.enabled && (
              <button
                type="button"
                onClick={() => {
                  const params = new URLSearchParams({
                    client_id: oauthConfig.facebook.clientId,
                    redirect_uri: oauthConfig.facebook.redirectUri,
                    response_type: "code",
                    scope: "email,public_profile",
                  });
                  window.location.href = `https://www.facebook.com/v18.0/dialog/oauth?${params}`;
                }}
                className="mt-3 w-full h-11 rounded-xl bg-[#1877F2] text-white font-medium text-sm flex items-center justify-center gap-2 hover:bg-[#166FE5] transition-colors"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                Continue with Facebook
              </button>
            )}

            {/* Apple */}
            {oauthConfig?.apple?.enabled && (
              <button
                type="button"
                onClick={() => {
                  const params = new URLSearchParams({
                    client_id: oauthConfig.apple.clientId,
                    redirect_uri: oauthConfig.apple.redirectUri,
                    response_type: "code",
                    response_mode: "query",
                    scope: "name email",
                  });
                  window.location.href = `https://appleid.apple.com/auth/authorize?${params}`;
                }}
                className="mt-3 w-full h-11 rounded-xl bg-black text-white font-medium text-sm flex items-center justify-center gap-2 hover:bg-zinc-800 transition-colors"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09M12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                </svg>
                Continue with Apple
              </button>
            )}

            <Link
              to="/signup"
              className="mt-3 w-full h-11 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-pink-500/25 hover:shadow-pink-500/40 hover:scale-[1.01] active:scale-[0.99] transition-all"
            >
              Sign up with email — 30 seconds
            </Link>
          </div>

          {/* Back to Home */}
          <Link
            to="/"
            className="flex items-center justify-center gap-2 text-sm text-zinc-500 hover:text-zinc-700 mt-8 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to homepage
          </Link>
        </div>
      </div>
    </div>
  );
}
