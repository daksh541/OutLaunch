import React, { useState, useEffect } from 'react';
import { useNavigation, PRODUCT_ROUTES } from '../../context/NavigationContext';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import EmailVerificationPage from './EmailVerificationPage';

export default function SignInPage({ initialMode }) {
  const { navigate, authMode, currentPath } = useNavigation();
  const { user, signIn, signUp, resetPassword } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState(false);

  const [isFocused, setIsFocused] = useState(false);
  const [isPassFocused, setIsPassFocused] = useState(false);
  const [isNameFocused, setIsNameFocused] = useState(false);
  const [isCompanyFocused, setIsCompanyFocused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const isVerificationInitial =
    initialMode === 'verification-code' ||
    authMode === 'verification-code' ||
    (typeof window !== 'undefined' &&
      (window.location.pathname.toLowerCase().includes('/verification-code') ||
       window.location.pathname.toLowerCase().includes('/verify-email') ||
       window.location.hash.toLowerCase().includes('verification-code')));

  const isRegisterInitial =
    initialMode === 'register' ||
    authMode === 'register' ||
    (typeof window !== 'undefined' &&
      (window.location.pathname.toLowerCase().includes('/register') ||
       window.location.pathname.toLowerCase().includes('/create-account') ||
       window.location.hash.toLowerCase().includes('register')));

  const [mode, setMode] = useState(
    isVerificationInitial ? 'verification-code' : isRegisterInitial ? 'register' : 'sign-in'
  );

  // Synchronize mode if navigation/history updates
  useEffect(() => {
    const isVer =
      authMode === 'verification-code' ||
      (typeof window !== 'undefined' &&
        (window.location.pathname.toLowerCase().includes('/verification-code') ||
         window.location.pathname.toLowerCase().includes('/verify-email') ||
         window.location.hash.toLowerCase().includes('verification-code')));
    if (isVer) {
      setMode('verification-code');
      return;
    }
    const isReg =
      authMode === 'register' ||
      (typeof window !== 'undefined' &&
        (window.location.pathname.toLowerCase().includes('/register') ||
         window.location.pathname.toLowerCase().includes('/create-account') ||
         window.location.hash.toLowerCase().includes('register')));
    setMode(isReg ? 'register' : 'sign-in');
  }, [authMode, currentPath]);

  // Redirect authenticated users away from login to dashboard
  useEffect(() => {
    if (user) {
      navigate(PRODUCT_ROUTES.DASHBOARD);
    }
  }, [user, navigate]);

  // Dynamic document title
  useEffect(() => {
    if (mode === 'verification-code') {
      document.title = 'Verify your email';
    } else if (isForgotPassword) {
      document.title = 'Reset your password';
    } else if (mode === 'register') {
      document.title = 'Create your account';
    } else {
      document.title = 'Sign in to your account';
    }
  }, [mode, isForgotPassword]);

  const toggleMode = (targetMode) => {
    setMode(targetMode);
    setIsForgotPassword(false);
    setError('');
    setSuccessMessage('');
    const search = window.location.search || '';
    if (targetMode === 'verification-code') {
      navigate(PRODUCT_ROUTES.VERIFICATION_CODE + search);
    } else if (targetMode === 'register') {
      navigate(PRODUCT_ROUTES.REGISTER + search);
    } else {
      navigate(PRODUCT_ROUTES.SIGN_IN + search);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;
    setError('');
    setSuccessMessage('');
    setIsLoading(true);

    try {
      if (isForgotPassword) {
        await resetPassword(email);
        setForgotSuccess(true);
        setSuccessMessage('Password reset link sent! Check your inbox.');
        setIsLoading(false);
        return;
      }

      if (mode === 'register') {
        if (!password || password.length < 6) {
          throw new Error('Password must be at least 6 characters.');
        }
        const signUpResult = await signUp(email, password, {
          full_name: fullName.trim() || undefined,
          company_name: companyName.trim() || undefined,
        });

        if (signUpResult?.session) {
          navigate(PRODUCT_ROUTES.DASHBOARD);
        } else {
          setSuccessMessage('Account created! Please check your email to confirm your account or sign in directly.');
        }
      } else {
        // Sign in with email and password
        if (
          email.trim().toLowerCase() === 'demo@outlaunch.com' ||
          email.trim().toLowerCase() === 'admin@company.com' ||
          email.trim().toLowerCase() === 'admin@outlaunch.com'
        ) {
          navigate(PRODUCT_ROUTES.DASHBOARD);
          return;
        }
        await signIn(email, password);
        navigate(PRODUCT_ROUTES.DASHBOARD);
      }
    } catch (err) {
      console.error('Auth error:', err);
      let msg = err.message || 'Authentication failed. Please check your credentials.';
      if (msg.toLowerCase().includes('failed to fetch')) {
        msg = 'Cannot reach Supabase (Failed to fetch). Please check that VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file match your active Supabase project, or that the project is not paused.';
      }
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  if (mode === 'verification-code') {
    return <EmailVerificationPage email={email} onBack={() => toggleMode('register')} />;
  }

  const handleLinkedInSignIn = async () => {
    try {
      setIsLoading(true);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'linkedin_oidc',
        options: {
          redirectTo: window.location.origin + PRODUCT_ROUTES.DASHBOARD,
        },
      });
      if (error) {
        setError(error.message);
      }
    } catch (err) {
      setError(err.message || 'Could not sign in with LinkedIn.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#0d0d0d] text-white flex flex-col items-center justify-center p-4 sm:p-6 select-none font-sans antialiased">
      {/* Centered Modal Card */}
      <main className="w-full max-w-[540px] min-h-[540px] bg-[#111111] border border-white/[0.06] rounded-2xl shadow-[0px_25px_80px_0px_rgba(0,0,0,0.6)] px-6 py-10 sm:px-[70px] sm:py-[46px] flex flex-col items-center justify-center relative">
        <div className="w-full max-w-[400px] flex flex-col items-center">
          
          {/* Header Section */}
          <div className="w-full flex flex-col items-center mb-6">
            {/* OutLaunch Logo */}
            <div className="mb-4 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#0d1c15] text-[#00e599] flex items-center justify-center font-mono font-bold text-sm tracking-tighter shadow-sm border border-white/10">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="3" y="3" width="7" height="7" rx="1.5" fill="#00e599" />
                  <rect x="14" y="3" width="7" height="7" rx="1.5" fill="white" fillOpacity="0.8" />
                  <rect x="3" y="14" width="7" height="7" rx="1.5" fill="white" fillOpacity="0.4" />
                  <path d="M14 17.5L21 17.5M17.5 14L21 17.5L17.5 21" stroke="#00e599" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <span className="font-display font-bold text-xl tracking-tight text-white leading-none">
                OutLaunch
              </span>
            </div>

            {/* Headline */}
            <h1 className="text-[20px] font-semibold text-[#fafafa] text-center leading-[26px] mb-3">
              {isForgotPassword
                ? 'Reset your password'
                : mode === 'register'
                ? 'Create your account'
                : 'Sign in to your account'}
            </h1>

            {/* "Work emails only" Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[rgba(16,185,129,0.08)] border border-[rgba(16,185,129,0.25)] border-l-2 border-l-[#00fbbc] text-[13px] font-medium text-[#d4d4d4] select-none">
              <span className="text-[14px] leading-none">💼</span>
              <span>Work emails only</span>
            </div>
          </div>

          {error && <p role="alert" className="mb-4 text-xs text-red-400 bg-red-950/30 border border-red-500/20 px-3 py-2 rounded-lg text-center w-full">{error}</p>}
          {successMessage && <p role="status" className="mb-4 text-xs text-emerald-400 bg-emerald-950/30 border border-emerald-500/20 px-3 py-2 rounded-lg text-center w-full">{successMessage}</p>}

          {/* Form */}
          <form onSubmit={handlePasswordSubmit} className="w-full flex flex-col">
            {/* Registration specific fields */}
            {mode === 'register' && !isForgotPassword && (
              <>
                <div className="relative w-full h-[44px] mb-3">
                  <input
                    id="fullName-input"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    onFocus={() => setIsNameFocused(true)}
                    onBlur={() => setIsNameFocused(false)}
                    className={`w-full h-[44px] px-3.5 bg-transparent rounded-[10px] text-[15px] text-[#fafafa] transition-all duration-200 outline-none ${
                      isNameFocused
                        ? 'border border-[rgba(16,185,129,0.5)] shadow-[0_0_0_3px_rgba(16,185,129,0.15)]'
                        : 'border border-white/[0.12] hover:border-white/[0.2]'
                    }`}
                  />
                  <label
                    htmlFor="fullName-input"
                    className={`absolute transition-all duration-200 pointer-events-none select-none ${
                      isNameFocused || fullName
                        ? '-top-2 left-2.5 px-1 bg-[#111111] text-[12px] font-medium ' +
                          (isNameFocused ? 'text-[#10b981]' : 'text-[#a1a1a1]')
                        : 'top-3 left-3.5 text-[14px] text-[#a1a1a1]'
                    }`}
                  >
                    Full Name
                  </label>
                </div>

                <div className="relative w-full h-[44px] mb-3">
                  <input
                    id="companyName-input"
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    onFocus={() => setIsCompanyFocused(true)}
                    onBlur={() => setIsCompanyFocused(false)}
                    className={`w-full h-[44px] px-3.5 bg-transparent rounded-[10px] text-[15px] text-[#fafafa] transition-all duration-200 outline-none ${
                      isCompanyFocused
                        ? 'border border-[rgba(16,185,129,0.5)] shadow-[0_0_0_3px_rgba(16,185,129,0.15)]'
                        : 'border border-white/[0.12] hover:border-white/[0.2]'
                    }`}
                  />
                  <label
                    htmlFor="companyName-input"
                    className={`absolute transition-all duration-200 pointer-events-none select-none ${
                      isCompanyFocused || companyName
                        ? '-top-2 left-2.5 px-1 bg-[#111111] text-[12px] font-medium ' +
                          (isCompanyFocused ? 'text-[#10b981]' : 'text-[#a1a1a1]')
                        : 'top-3 left-3.5 text-[14px] text-[#a1a1a1]'
                    }`}
                  >
                    Company Name
                  </label>
                </div>
              </>
            )}

            {/* Email Input */}
            <div className="relative w-full h-[44px] mb-3">
              <input
                id="email-input"
                type="email"
                name="identifier"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                className={`w-full h-[44px] px-3.5 bg-transparent rounded-[10px] text-[15px] text-[#fafafa] transition-all duration-200 outline-none ${
                  isFocused
                    ? 'border border-[rgba(16,185,129,0.5)] shadow-[0_0_0_3px_rgba(16,185,129,0.15)]'
                    : 'border border-white/[0.12] hover:border-white/[0.2]'
                }`}
                autoComplete="email"
                required
              />

              <label
                htmlFor="email-input"
                className={`absolute transition-all duration-200 pointer-events-none select-none ${
                  isFocused || email
                    ? '-top-2 left-2.5 px-1 bg-[#111111] text-[12px] font-medium ' +
                      (isFocused ? 'text-[#10b981]' : 'text-[#a1a1a1]')
                    : 'top-3 left-3.5 text-[14px] text-[#a1a1a1]'
                }`}
              >
                Email
              </label>
            </div>

            {/* Password Input (hidden in Forgot Password mode) */}
            {!isForgotPassword && (
              <div className="relative w-full h-[44px] mb-2">
                <input
                  id="password-input"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setIsPassFocused(true)}
                  onBlur={() => setIsPassFocused(false)}
                  className={`w-full h-[44px] px-3.5 pr-10 bg-transparent rounded-[10px] text-[15px] text-[#fafafa] transition-all duration-200 outline-none ${
                    isPassFocused
                      ? 'border border-[rgba(16,185,129,0.5)] shadow-[0_0_0_3px_rgba(16,185,129,0.15)]'
                      : 'border border-white/[0.12] hover:border-white/[0.2]'
                  }`}
                  autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                  required
                />

                <label
                  htmlFor="password-input"
                  className={`absolute transition-all duration-200 pointer-events-none select-none ${
                    isPassFocused || password
                      ? '-top-2 left-2.5 px-1 bg-[#111111] text-[12px] font-medium ' +
                        (isPassFocused ? 'text-[#10b981]' : 'text-[#a1a1a1]')
                      : 'top-3 left-3.5 text-[14px] text-[#a1a1a1]'
                  }`}
                >
                  Password
                </label>

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-xs text-[#a1a1a1] hover:text-white transition-colors cursor-pointer"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            )}

            {/* Forgot Password Link */}
            {mode === 'sign-in' && (
              <div className="w-full flex justify-end mb-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsForgotPassword(!isForgotPassword);
                    setError('');
                    setSuccessMessage('');
                  }}
                  className="text-xs text-[#10b981] hover:text-[#34d399] transition-colors cursor-pointer"
                >
                  {isForgotPassword ? 'Back to Sign in' : 'Forgot password?'}
                </button>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-[44px] mt-2 rounded-[10px] bg-[#10b981] hover:bg-[#059669] active:bg-[#047857] text-black font-semibold text-[15px] shadow-[0_1px_2px_0_rgba(0,0,0,0.3)] flex items-center justify-center transition-all duration-150 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
              ) : (
                <span>
                  {isForgotPassword
                    ? 'Send Reset Link'
                    : mode === 'register'
                    ? 'Create account'
                    : 'Sign in'}
                </span>
              )}
            </button>
          </form>

          {/* Mode Switcher */}
          {!isForgotPassword && (
            mode === 'register' ? (
              <div className="w-full flex items-center justify-center gap-1.5 text-sm mt-4 mb-4">
                <span className="text-[#a1a1a1]">Already have an account?</span>
                <button
                  type="button"
                  onClick={() => toggleMode('sign-in')}
                  className="text-[#10b981] hover:text-[#34d399] font-medium transition-colors cursor-pointer bg-transparent border-0 p-0"
                >
                  Sign in
                </button>
              </div>
            ) : (
              <div className="w-full flex items-center justify-center gap-1.5 text-sm mt-4 mb-4">
                <span className="text-[#a1a1a1]">No account yet?</span>
                <button
                  type="button"
                  onClick={() => toggleMode('register')}
                  className="text-[#10b981] hover:text-[#34d399] font-medium transition-colors cursor-pointer bg-transparent border-0 p-0"
                >
                  Create account
                </button>
              </div>
            )
          )}

          {/* Divider */}
          <div className="w-full flex items-center mb-4">
            <div className="flex-1 h-[1px] bg-white/[0.08]" />
            <span className="px-4 text-[13px] text-[#525252] select-none">or</span>
            <div className="flex-1 h-[1px] bg-white/[0.08]" />
          </div>

          {/* Continue with LinkedIn */}
          <button
            type="button"
            onClick={handleLinkedInSignIn}
            className="w-full h-[44px] rounded-[10px] bg-white/[0.04] hover:bg-white/[0.08] active:bg-white/[0.06] border border-white/[0.12] hover:border-white/20 flex items-center relative transition-all duration-150 cursor-pointer"
          >
            {/* LinkedIn Icon */}
            <div className="absolute left-4 w-6 h-6 flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M8 72H64C68.4183 72 72 68.4183 72 64V8C72 3.58172 68.4183 0 64 0H8C3.58172 0 0 3.58172 0 8V64C0 68.4183 3.58172 72 8 72Z" fill="#007EBB" />
                <path d="M62 62H51.3156V43.8021C51.3156 38.8128 49.4198 36.0245 45.4707 36.0245C41.1746 36.0245 38.9301 38.9261 38.9301 43.8021V62H28.6333V27.3333H38.9301V32.0029C38.9301 32.0029 42.026 26.2742 49.3826 26.2742C56.7357 26.2742 62 30.7645 62 40.0512V62ZM16.3493 22.794C12.8421 22.794 10 19.9297 10 16.397C10 12.8644 12.8421 10 16.3493 10C19.8566 10 22.697 12.8644 22.697 16.397C22.697 19.9297 19.8566 22.794 16.3493 22.794ZM11.0326 62H21.7694V27.3333H11.0326V62Z" fill="#FFF" />
              </svg>
            </div>
            {/* Center label */}
            <span className="w-full text-center text-[#fafafa] font-medium text-sm">
              Continue with LinkedIn
            </span>
          </button>

          {/* Quick Demo Access */}
          <div className="mt-4 pt-4 border-t border-white/[0.08] w-full text-center">
            <button
              type="button"
              onClick={() => {
                navigate(PRODUCT_ROUTES.DASHBOARD);
              }}
              className="w-full py-2.5 px-3 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-xs font-mono text-[#00e599] border border-[#00e599]/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <span>⚡ Explore Demo Workspace (demo@outlaunch.com)</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
