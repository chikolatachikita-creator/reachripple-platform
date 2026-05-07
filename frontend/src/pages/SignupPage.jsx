import React, { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useNavigate } from "react-router-dom";
import { register } from "../api/auth";
import client from "../api/client";
import { useAuth } from "../context/AuthContext";
import { validators } from "../utils/formValidation";
import { LoadingButton } from "../components/ui/LoadingButton";
import ThemeToggle from "../components/ThemeToggle";

export default function SignupPage() {
  const navigate = useNavigate();
  const { login: authLogin } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [fadeIn, setFadeIn] = useState(false);

  // Account type (Individual / Agency) — VivaStreet-style split
  const [accountType, setAccountType] = useState("independent"); // "independent" | "agency"
  const [agencyName, setAgencyName] = useState("");
  const [agencyWebsite, setAgencyWebsite] = useState("");
  const [agencyPhone, setAgencyPhone] = useState("");
  const [agencyCompanyNumber, setAgencyCompanyNumber] = useState("");

  // Post-signup verify-email screen
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [signupEmail, setSignupEmail] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState("");
  
  // Inline validation state
  const [touched, setTouched] = useState({ name: false, email: false, password: false, passwordConfirm: false });
  const [fieldErrors, setFieldErrors] = useState({ name: null, email: null, password: null, passwordConfirm: null });

  useEffect(() => {
    requestAnimationFrame(() => setFadeIn(true));
  }, []);

  // Validate individual field
  const validateField = (fieldName, value, currentPassword = password) => {
    let error = null;
    switch (fieldName) {
      case 'name':
        error = validators.required(value, 'Name') || validators.minLength(2)(value, 'Name');
        break;
      case 'email':
        error = validators.required(value, 'Email') || validators.email(value);
        break;
      case 'password':
        error = validators.required(value, 'Password') || validators.password(value);
        break;
      case 'passwordConfirm':
        error = validators.required(value, 'Confirm password') || validators.passwordMatch(currentPassword)(value);
        break;
      default:
        break;
    }
    setFieldErrors(prev => ({ ...prev, [fieldName]: error }));
    return error;
  };

  const handleBlur = (fieldName, value) => {
    setTouched(prev => ({ ...prev, [fieldName]: true }));
    validateField(fieldName, value);
  };

  // Get input classes based on validation state
  const getInputClasses = (fieldName, hasRightIcon = false) => {
    const baseClasses = `w-full h-12 rounded-xl border px-4 pl-11 ${hasRightIcon ? 'pr-11' : ''} text-sm transition-all focus:outline-none focus:ring-2`;
    
    if (touched[fieldName] && fieldErrors[fieldName]) {
      return `${baseClasses} border-red-300 bg-red-50/50 focus:ring-red-500/20 focus:border-red-500`;
    }
    if (touched[fieldName] && !fieldErrors[fieldName]) {
      return `${baseClasses} border-green-300 bg-green-50/30 focus:ring-green-500/20 focus:border-green-500`;
    }
    return `${baseClasses} border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 dark:text-white hover:bg-white dark:hover:bg-zinc-700 focus:bg-white dark:focus:bg-zinc-700 focus:ring-orange-500/20 focus:border-orange-500`;
  };

  // Validation icon component
  const ValidationIcon = ({ fieldName }) => {
    if (!touched[fieldName]) return null;
    
    return (
      <span className="absolute right-4 top-1/2 -translate-y-1/2">
        {fieldErrors[fieldName] ? (
          <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        ) : (
          <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        )}
      </span>
    );
  };

  // Error message component
  const FieldError = ({ fieldName }) => {
    if (!touched[fieldName] || !fieldErrors[fieldName]) return null;
    return (
      <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1.5">{fieldErrors[fieldName]}</p>
    );
  };

  // Password strength check
  const getPasswordStrength = () => {
    if (!password) return { score: 0, label: "", color: "" };
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 2) return { score, label: "Weak", color: "bg-red-500" };
    if (score <= 3) return { score, label: "Fair", color: "bg-yellow-500" };
    if (score <= 4) return { score, label: "Good", color: "bg-green-500" };
    return { score, label: "Strong", color: "bg-emerald-500" };
  };

  const strength = getPasswordStrength();

  const handleSignup = async (e) => {
    e.preventDefault();
    setError("");

    // Validation
    if (!name || !email || !password || !passwordConfirm) {
      setError("All fields are required");
      return;
    }

    if (password !== passwordConfirm) {
      setError("Passwords do not match");
      return;
    }

    // Password requirements to match backend
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    if (!/[A-Z]/.test(password)) {
      setError("Password must contain at least one uppercase letter");
      return;
    }

    if (!/[a-z]/.test(password)) {
      setError("Password must contain at least one lowercase letter");
      return;
    }

    if (!/[0-9]/.test(password)) {
      setError("Password must contain at least one number");
      return;
    }

    if (accountType === "agency" && !agencyName.trim()) {
      setError("Agency / business name is required");
      return;
    }

    setLoading(true);

    try {
      const extra = accountType === "agency"
        ? {
            accountType,
            agencyDetails: {
              companyName: agencyName.trim(),
              companyNumber: agencyCompanyNumber.trim() || undefined,
              website: agencyWebsite.trim() || undefined,
              phone: agencyPhone.trim() || undefined,
            },
          }
        : { accountType: "independent" };
      const user = await register(name, email, password, extra);
      
      if (user) {
        // Store user info for route guards
        localStorage.setItem("userId", String(user._id));
        localStorage.setItem("userName", String(user.name || ""));
        localStorage.setItem("userEmail", String(user.email));
        localStorage.setItem("userRole", String(user.role || "user"));

        // Update AuthContext state
        authLogin(user);

        // Show verify-email screen instead of navigating away.
        setSignupEmail(user.email);
        setSignupSuccess(true);
        setResendCooldown(60);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  // Resend cooldown ticker
  useEffect(() => {
    if (resendCooldown <= 0) return undefined;
    const t = setTimeout(() => setResendCooldown((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const handleResend = async () => {
    if (resending || resendCooldown > 0) return;
    setResending(true);
    setResendMessage("");
    try {
      await client.post("/auth/resend-verification");
      setResendMessage("Verification email sent! Check your inbox.");
      setResendCooldown(60);
    } catch (err) {
      setResendMessage(err.response?.data?.message || "Failed to resend. Try again shortly.");
    } finally {
      setResending(false);
    }
  };

  if (signupSuccess) {
    return (
      <div className={`min-h-screen bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-950 dark:to-zinc-900 flex items-center justify-center px-5 py-8 transition-all duration-500 ${fadeIn ? "opacity-100" : "opacity-0"}`}>
        <Helmet><title>Verify your email | ReachRipple</title></Helmet>
        <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-zinc-100 dark:border-zinc-800 p-8 text-center">
          <div className="mx-auto w-20 h-20 rounded-full bg-gradient-to-br from-pink-100 to-purple-100 dark:from-pink-900/40 dark:to-purple-900/40 flex items-center justify-center mb-5">
            <svg className="w-10 h-10 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Check your email</h1>
          <p className="mt-3 text-zinc-600 dark:text-zinc-400">
            We've sent a verification link to{" "}
            <span className="font-medium text-zinc-900 dark:text-white">{signupEmail}</span>.
          </p>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-500">
            Click the link in the email to verify your account. Don't see it? Check your spam folder.
          </p>

          {resendMessage && (
            <p className={`mt-4 text-sm ${resendMessage.startsWith("Verification") ? "text-green-600" : "text-red-600"}`}>
              {resendMessage}
            </p>
          )}

          <button
            type="button"
            onClick={handleResend}
            disabled={resending || resendCooldown > 0}
            className="mt-6 w-full h-12 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 font-medium hover:bg-zinc-50 dark:hover:bg-zinc-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {resending
              ? "Sending..."
              : resendCooldown > 0
                ? `Resend email in ${resendCooldown}s`
                : "Resend verification email"}
          </button>

          <button
            type="button"
            onClick={() => navigate("/")}
            className="mt-3 w-full h-12 rounded-xl bg-gradient-to-r from-pink-500 via-purple-500 to-blue-900 text-white font-semibold hover:brightness-110 transition shadow-md"
          >
            Continue to homepage
          </button>

          <p className="mt-5 text-xs text-zinc-500 dark:text-zinc-500">
            Wrong email?{" "}
            <Link to="/login" className="text-orange-600 hover:text-orange-700 font-medium">
              Sign in with a different account
            </Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-950 dark:to-zinc-900 flex transition-all duration-500 ${fadeIn ? "opacity-100" : "opacity-0"}`}>
      <Helmet><title>Sign Up | ReachRipple</title></Helmet>
      {/* Left Panel - Form */}
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
            <h1 className="text-2xl md:text-3xl font-bold text-zinc-900 dark:text-white">Create your account</h1>
            <p className="mt-2 text-zinc-500 dark:text-zinc-400">
              Already have an account?{" "}
              <Link to="/login" className="text-orange-600 font-medium hover:text-orange-700">
                Sign in
              </Link>
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3">
              <span className="text-red-500 text-lg">⚠️</span>
              <div>
                <p className="text-sm font-medium text-red-800">Error</p>
                <p className="text-sm text-red-600 mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSignup} className="space-y-5">
            {/* Account type selector — Individual vs Agency (VivaStreet-style) */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">I'm signing up as</label>
              <div className="grid grid-cols-2 gap-2 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl">
                <button
                  type="button"
                  onClick={() => setAccountType("independent")}
                  className={`h-11 rounded-lg text-sm font-semibold transition-all ${
                    accountType === "independent"
                      ? "bg-white dark:bg-zinc-700 text-orange-600 dark:text-orange-400 shadow-sm"
                      : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-800"
                  }`}
                >
                  👤 Individual
                </button>
                <button
                  type="button"
                  onClick={() => setAccountType("agency")}
                  className={`h-11 rounded-lg text-sm font-semibold transition-all ${
                    accountType === "agency"
                      ? "bg-white dark:bg-zinc-700 text-orange-600 dark:text-orange-400 shadow-sm"
                      : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-800"
                  }`}
                >
                  🏢 Agency / Business
                </button>
              </div>
              <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                {accountType === "agency"
                  ? "Agency accounts get higher posting limits, multi-listing dashboards and a public agency page. Verification required before listings go live."
                  : "Individual accounts can post personal listings across all categories."}
              </p>
            </div>

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Full name</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (touched.name) validateField('name', e.target.value);
                  }}
                  onBlur={() => handleBlur('name', name)}
                  className={getInputClasses('name', true)}
                  required
                />
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </span>
                <ValidationIcon fieldName="name" />
              </div>
              <FieldError fieldName="name" />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Email address</label>
              <div className="relative">
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (touched.email) validateField('email', e.target.value);
                  }}
                  onBlur={() => handleBlur('email', email)}
                  className={getInputClasses('email', true)}
                  required
                />
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                  </svg>
                </span>
                <ValidationIcon fieldName="email" />
              </div>
              <FieldError fieldName="email" />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a strong password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (touched.password) validateField('password', e.target.value);
                    // Also revalidate confirm if it's been touched
                    if (touched.passwordConfirm && passwordConfirm) {
                      validateField('passwordConfirm', passwordConfirm, e.target.value);
                    }
                  }}
                  onBlur={() => handleBlur('password', password)}
                  className={`w-full h-12 rounded-xl border px-4 pl-11 pr-11 text-sm transition-all focus:outline-none focus:ring-2
                    ${touched.password && fieldErrors.password 
                      ? 'border-red-300 bg-red-50/50 focus:ring-red-500/20 focus:border-red-500' 
                      : touched.password && !fieldErrors.password 
                        ? 'border-green-300 bg-green-50/30 focus:ring-green-500/20 focus:border-green-500'
                        : 'border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 dark:text-white hover:bg-white dark:hover:bg-zinc-700 focus:bg-white dark:focus:bg-zinc-700 focus:ring-orange-500/20 focus:border-orange-500'}`}
                  required
                />
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400">
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

              {/* Password strength indicator */}
              {password && (
                <div className="mt-2">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="flex-1 h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${strength.color} transition-all duration-300`}
                        style={{ width: `${(strength.score / 5) * 100}%` }}
                      />
                    </div>
                    <span className={`text-xs font-medium ${
                      strength.score <= 2 ? "text-red-500" :
                      strength.score <= 3 ? "text-yellow-500" :
                      "text-green-500"
                    }`}>
                      {strength.label}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Use 8+ characters with uppercase, lowercase, and numbers
                  </p>
                </div>
              )}
            </div>

            {/* Password Confirm */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Confirm password</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm your password"
                  value={passwordConfirm}
                  onChange={(e) => {
                    setPasswordConfirm(e.target.value);
                    if (touched.passwordConfirm) validateField('passwordConfirm', e.target.value);
                  }}
                  onBlur={() => handleBlur('passwordConfirm', passwordConfirm)}
                  className={`w-full h-12 rounded-xl border px-4 pl-11 pr-11 text-sm
                           focus:outline-none focus:ring-2 transition-all
                           ${touched.passwordConfirm && fieldErrors.passwordConfirm
                             ? "border-red-300 bg-red-50/50 focus:ring-red-500/20 focus:border-red-500" 
                             : touched.passwordConfirm && !fieldErrors.passwordConfirm
                               ? "border-green-300 bg-green-50/30 focus:ring-green-500/20 focus:border-green-500"
                               : "border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 dark:text-white hover:bg-white dark:hover:bg-zinc-700 focus:bg-white dark:focus:bg-zinc-700 focus:ring-orange-500/20 focus:border-orange-500"
                           }`}
                  required
                />
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </span>
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors"
                >
                  {showConfirmPassword ? (
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
                {touched.passwordConfirm && !fieldErrors.passwordConfirm && (
                  <span className="absolute right-12 top-1/2 -translate-y-1/2 text-green-500">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </span>
                )}
              </div>
              <FieldError fieldName="passwordConfirm" />
            </div>

            {/* Agency-only fields */}
            {accountType === "agency" && (
              <div className="space-y-4 p-4 rounded-xl border border-orange-200 bg-orange-50/40 dark:border-orange-800/40 dark:bg-orange-900/10">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Agency / business name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Velvet Models Ltd"
                    value={agencyName}
                    onChange={(e) => setAgencyName(e.target.value)}
                    className="w-full h-11 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 dark:text-white px-4 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                    required
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                      Companies House number
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 12345678"
                      value={agencyCompanyNumber}
                      onChange={(e) => setAgencyCompanyNumber(e.target.value)}
                      className="w-full h-11 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 dark:text-white px-4 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                      Business phone
                    </label>
                    <input
                      type="tel"
                      placeholder="+44 ..."
                      value={agencyPhone}
                      onChange={(e) => setAgencyPhone(e.target.value)}
                      className="w-full h-11 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 dark:text-white px-4 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Website
                  </label>
                  <input
                    type="url"
                    placeholder="https://yoursite.com"
                    value={agencyWebsite}
                    onChange={(e) => setAgencyWebsite(e.target.value)}
                    className="w-full h-11 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 dark:text-white px-4 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  Your agency will be created in <strong>pending verification</strong>. Listings can be drafted but won't go live until our team verifies your business details. You can complete KYC documents from your dashboard.
                </p>
              </div>
            )}

            {/* Terms */}
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              By creating an account, you agree to our{" "}
              <Link to="/terms" className="text-orange-600 hover:underline">Terms of Service</Link>
              {" "}and{" "}
              <Link to="/privacy" className="text-orange-600 hover:underline">Privacy Policy</Link>.
            </p>

            {/* Submit Button */}
            <LoadingButton
              type="submit"
              loading={loading}
              loadingText="Creating account..."
              variant="primary"
              size="lg"
              fullWidth
              className="shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 hover:scale-[1.01] active:scale-[0.99]"
            >
              Create account
            </LoadingButton>
          </form>

          {/* Back to Home */}
          <Link
            to="/"
            className="flex items-center justify-center gap-2 text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 mt-8 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to homepage
          </Link>
        </div>
      </div>

      {/* Right Panel - Decorative */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 relative overflow-hidden">
        {/* Animated gradient orbs */}
        <div className="absolute top-20 right-10 w-72 h-72 bg-pink-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 left-10 w-96 h-96 bg-orange-500/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '0.5s' }} />
        
        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-20">
          <Link to="/" className="flex items-center gap-3 mb-12">
            <img src="/logomark.png" alt="ReachRipple" className="w-14 h-14 rounded-xl object-cover shadow-lg shadow-pink-500/30 ring-1 ring-white/10" />
            <span className="text-white font-bold text-xl"><span className="text-pink-400">Reach</span><span className="text-purple-400">Ripple</span></span>
          </Link>
          
          <h2 className="text-4xl xl:text-5xl font-bold text-white leading-tight">
            Join thousands of
            <span className="block bg-gradient-to-r from-orange-400 to-pink-500 bg-clip-text text-transparent mt-1">
              active users
            </span>
          </h2>
          
          <p className="mt-6 text-white/60 text-lg leading-relaxed max-w-md">
            Create your free account and start posting ads, connecting with others, and growing your reach.
          </p>
          
          {/* Benefits */}
          <div className="mt-10 space-y-4">
            {[
              { icon: "✨", title: "Free to join", desc: "No credit card required" },
              { icon: "🚀", title: "Quick setup", desc: "Start posting in minutes" },
              { icon: "🛡️", title: "Secure & private", desc: "Your data is protected" },
            ].map((item) => (
              <div key={item.title} className="flex items-start gap-4 p-4 bg-white/5 rounded-xl border border-white/10">
                <span className="text-2xl">{item.icon}</span>
                <div>
                  <div className="text-white font-semibold">{item.title}</div>
                  <div className="text-white/50 text-sm">{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
