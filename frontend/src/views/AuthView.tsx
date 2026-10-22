import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck,
  Lock,
  Mail,
  User,
  Building,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  TrendingUp,
  Cpu,
  Layers,
  KeyRound,
  ArrowLeft,
  RotateCcw,
  Clock,
  Check
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

type AuthMode =
  | 'signin'
  | 'signup'
  | 'register_otp'
  | 'forgot_password'
  | 'reset_otp'
  | 'set_new_password'
  | 'reset_success';

export const AuthView: React.FC = () => {
  const {
    login,
    register,
    verifyRegistrationOtp,
    resendRegistrationOtp,
    forgotPassword,
    verifyResetOtp,
    resendResetOtp,
    resetPassword,
    error,
    clearError
  } = useAuth();

  const [mode, setMode] = useState<AuthMode>('signin');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // Sign In State
  const [signInEmail, setSignInEmail] = useState<string>('');
  const [signInPassword, setSignInPassword] = useState<string>('');
  const [rememberMe, setRememberMe] = useState<boolean>(true);
  const [showSignInPassword, setShowSignInPassword] = useState<boolean>(false);

  // Sign Up State
  const [signUpName, setSignUpName] = useState<string>('');
  const [signUpEmail, setSignUpEmail] = useState<string>('');
  const [signUpOrg, setSignUpOrg] = useState<string>('');
  const [signUpPassword, setSignUpPassword] = useState<string>('');
  const [signUpConfirmPassword, setSignUpConfirmPassword] = useState<string>('');
  const [agreeTerms, setAgreeTerms] = useState<boolean>(false);
  const [showSignUpPassword, setShowSignUpPassword] = useState<boolean>(false);
  const [showSignUpConfirmPassword, setShowSignUpConfirmPassword] = useState<boolean>(false);

  // OTP Verification State (shared for registration & reset)
  const [activeEmail, setActiveEmail] = useState<string>('');
  const [maskedEmail, setMaskedEmail] = useState<string>('');
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [cooldown, setCooldown] = useState<number>(60);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Password Recovery State
  const [forgotEmail, setForgotEmail] = useState<string>('');
  const [resetToken, setResetToken] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmNewPassword, setConfirmNewPassword] = useState<string>('');
  const [showNewPassword, setShowNewPassword] = useState<boolean>(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState<boolean>(false);

  // Cooldown Countdown Timer
  useEffect(() => {
    let timer: any = null;
    if (cooldown > 0 && (mode === 'register_otp' || mode === 'reset_otp')) {
      timer = setInterval(() => {
        setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [cooldown, mode]);

  // Focus first OTP digit on mode switch
  useEffect(() => {
    if (mode === 'register_otp' || mode === 'reset_otp') {
      setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 150);
    }
  }, [mode]);

  // Password strength calculation
  const calculatePasswordStrength = (pwd: string) => {
    let score = 0;
    if (pwd.length >= 8) score += 1;
    if (pwd.length >= 12) score += 1;
    if (/[A-Za-z]/.test(pwd)) score += 1;
    if (/[0-9]/.test(pwd)) score += 1;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 1;
    return Math.min(score, 4);
  };

  const getStrengthLabel = (score: number, pwd: string) => {
    if (!pwd) return { label: 'Empty', color: 'bg-[#141416] border border-[#303035]', text: 'text-[#71717A]' };
    switch (score) {
      case 1:
        return { label: 'Weak', color: 'bg-[#EF5350]', text: 'text-[#EF5350]' };
      case 2:
        return { label: 'Fair', color: 'bg-[#E8A23A]', text: 'text-[#E8A23A]' };
      case 3:
        return { label: 'Good', color: 'bg-[#FF7A1A]', text: 'text-[#FF7A1A]' };
      case 4:
        return { label: 'Strong', color: 'bg-[#22A477]', text: 'text-[#22A477]' };
      default:
        return { label: 'Weak', color: 'bg-[#EF5350]', text: 'text-[#EF5350]' };
    }
  };

  const clearAlerts = () => {
    setFormError(null);
    setFormSuccess(null);
    clearError();
  };

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    clearAlerts();
    setOtpDigits(['', '', '', '', '', '']);
  };

  // OTP Digit Change Handler
  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newDigits = [...otpDigits];
    // Handle single character
    newDigits[index] = value.slice(-1);
    setOtpDigits(newDigits);
    clearAlerts();

    // Auto-advance to next box if digit entered
    if (value && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  // OTP KeyDown Handler (Backspace & Navigation)
  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!otpDigits[index] && index > 0) {
        otpInputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  // OTP Paste Handler
  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').trim();
    if (/^\d{6}$/.test(pasteData)) {
      const digits = pasteData.split('');
      setOtpDigits(digits);
      otpInputRefs.current[5]?.focus();
      clearAlerts();
    }
  };

  // ================= ACTION HANDLERS =================

  // 1. Sign In
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    clearAlerts();

    if (!signInEmail.trim() || !signInPassword) {
      setFormError('Please enter both your institutional email and password.');
      return;
    }

    setIsSubmitting(true);
    try {
      await login({
        email: signInEmail.trim(),
        password: signInPassword,
        remember_me: rememberMe
      });
    } catch (err: any) {
      setFormError(err.message || 'Invalid institutional email or password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 2. Sign Up (Initiates Registration & Sends OTP)
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    clearAlerts();

    if (!signUpName.trim()) {
      setFormError('Please enter your full name.');
      return;
    }

    if (!signUpEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(signUpEmail.trim())) {
      setFormError('Please enter a valid institutional or Gmail address.');
      return;
    }

    if (signUpPassword.length < 8) {
      setFormError('Password must be at least 8 characters long.');
      return;
    }

    if (!/[A-Za-z]/.test(signUpPassword)) {
      setFormError('Password must contain at least one letter.');
      return;
    }

    if (!/[0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(signUpPassword)) {
      setFormError('Password must contain at least one number or special character.');
      return;
    }

    if (signUpPassword !== signUpConfirmPassword) {
      setFormError('Passwords do not match. Please verify your password entry.');
      return;
    }

    if (!agreeTerms) {
      setFormError('You must acknowledge and accept the institutional data terms.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await register({
        full_name: signUpName.trim(),
        email: signUpEmail.trim(),
        organization: signUpOrg.trim() || undefined,
        password: signUpPassword,
        confirm_password: signUpConfirmPassword,
        agree_terms: agreeTerms
      });

      setActiveEmail(res.email);
      setMaskedEmail(res.masked_email);
      setCooldown(res.resend_cooldown_seconds || 60);
      setMode('register_otp');
      setFormSuccess(res.message);
    } catch (err: any) {
      setFormError(err.message || 'Registration failed. An account with this email may already exist.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 3. Verify Registration OTP
  const handleVerifyRegistrationOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    clearAlerts();

    const otpCode = otpDigits.join('');
    if (otpCode.length !== 6) {
      setFormError('Please enter the complete 6-digit verification code.');
      return;
    }

    setIsSubmitting(true);
    try {
      await verifyRegistrationOtp({
        email: activeEmail,
        otp: otpCode
      });
      // Context sets user and triggers dashboard navigation automatically
    } catch (err: any) {
      setFormError(err.message || 'Verification code failed. Please check the code or request a new one.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 4. Resend Registration OTP
  const handleResendRegistrationOtp = async () => {
    if (cooldown > 0 || isSubmitting) return;
    clearAlerts();
    setIsSubmitting(true);

    try {
      const res = await resendRegistrationOtp(activeEmail);
      setCooldown(res.resend_cooldown_seconds || 60);
      setOtpDigits(['', '', '', '', '', '']);
      setFormSuccess('A fresh 6-digit code has been dispatched to your email.');
    } catch (err: any) {
      setFormError(err.message || 'Unable to resend verification code. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 5. Submit Forgot Password Request
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    clearAlerts();

    if (!forgotEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(forgotEmail.trim())) {
      setFormError('Please enter a valid registered email address.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await forgotPassword(forgotEmail.trim());
      setActiveEmail(res.email);
      setMaskedEmail(res.masked_email);
      setCooldown(res.resend_cooldown_seconds || 60);
      setMode('reset_otp');
      setFormSuccess(res.message);
    } catch (err: any) {
      setFormError(err.message || 'Failed to request password recovery. Please check the email.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 6. Verify Password Reset OTP
  const handleVerifyResetOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    clearAlerts();

    const otpCode = otpDigits.join('');
    if (otpCode.length !== 6) {
      setFormError('Please enter the complete 6-digit recovery code.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await verifyResetOtp({
        email: activeEmail,
        otp: otpCode
      });
      setResetToken(res.reset_token);
      setMode('set_new_password');
      setFormSuccess('Recovery code verified. Please set your new password.');
    } catch (err: any) {
      setFormError(err.message || 'Invalid or expired recovery code.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 7. Resend Password Reset OTP
  const handleResendResetOtp = async () => {
    if (cooldown > 0 || isSubmitting) return;
    clearAlerts();
    setIsSubmitting(true);

    try {
      const res = await resendResetOtp(activeEmail);
      setCooldown(res.resend_cooldown_seconds || 60);
      setOtpDigits(['', '', '', '', '', '']);
      setFormSuccess('A fresh recovery code has been dispatched to your email.');
    } catch (err: any) {
      setFormError(err.message || 'Unable to resend recovery code. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 8. Set New Password
  const handleSetNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    clearAlerts();

    if (newPassword.length < 8) {
      setFormError('Password must be at least 8 characters long.');
      return;
    }

    if (!/[A-Za-z]/.test(newPassword)) {
      setFormError('Password must contain at least one letter.');
      return;
    }

    if (!/[0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword)) {
      setFormError('Password must contain at least one number or special character.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setFormError('Passwords do not match. Please verify your password entry.');
      return;
    }

    setIsSubmitting(true);
    try {
      await resetPassword({
        reset_token: resetToken,
        new_password: newPassword,
        confirm_password: confirmNewPassword
      });
      setMode('reset_success');
    } catch (err: any) {
      setFormError(err.message || 'Failed to update password. Your reset session may have expired.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const signUpStrength = getStrengthLabel(calculatePasswordStrength(signUpPassword), signUpPassword);
  const resetStrength = getStrengthLabel(calculatePasswordStrength(newPassword), newPassword);

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-[#0D0D0F] text-[#F5F5F5]">
      {/* Left Column: Institutional Value Proposition & Platform Telemetry */}
      <div className="lg:w-1/2 bg-[#09090B] border-r border-[#303035] text-white p-8 lg:p-14 flex flex-col justify-between relative overflow-hidden">
        {/* Subtle grid background pattern */}
        <div
          className="absolute inset-0 opacity-5 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, #FF7A1A 1px, transparent 0)`,
            backgroundSize: '24px 24px'
          }}
        />

        {/* Top Header Branding */}
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#332015] border border-[#75401F] flex items-center justify-center text-[#FF7A1A] shadow-lg">
              <ShieldCheck className="w-6 h-6 text-[#FF7A1A]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-xl tracking-tight text-[#F5F5F5]">CrediLens</span>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-[#332015] text-[#FF7A1A] border border-[#75401F]">
                  Institutional v1.0
                </span>
              </div>
              <p className="text-xs text-[#A1A1AA] tracking-wide font-medium">
                MSME Credit Risk & Decision Intelligence Platform
              </p>
            </div>
          </div>

          {/* Headline & Abstract */}
          <div className="mt-10 max-w-lg">
            <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-[#F5F5F5] leading-tight">
              Predictive Underwriting for Underserved Enterprises
            </h1>
            <p className="mt-3 text-sm text-[#A1A1AA] leading-relaxed">
              Evaluating creditworthiness beyond traditional scores using real-time operational telemetry,
              cash-flow volatility, explainable machine learning, and macroeconomic stress simulations.
            </p>
          </div>

          {/* 3 Core Value Pillars */}
          <div className="mt-8 space-y-3.5 max-w-lg">
            <div className="p-3.5 rounded-xl bg-[#171719] border border-[#303035] flex items-start gap-3.5 hover:border-[#75401F] transition-colors">
              <div className="p-2 rounded-lg bg-[#332015] text-[#FF7A1A] shrink-0 mt-0.5">
                <Layers className="w-4 h-4 text-[#FF7A1A]" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-[#F5F5F5]">Alternative Business Data Engine</h4>
                <p className="text-[11px] text-[#A1A1AA] mt-0.5 leading-snug">
                  Synthesizes banking inflows, invoice cycles, and customer concentration into dynamic debt service coverage ratios (DSCR).
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#171719] border border-[#303035] flex items-start gap-3.5 hover:border-[#75401F] transition-colors">
              <div className="p-2 rounded-lg bg-[#22A477]/15 text-[#22A477] shrink-0 mt-0.5">
                <Cpu className="w-4 h-4 text-[#22A477]" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-[#F5F5F5]">Explainable AI & Fair Lending</h4>
                <p className="text-[11px] text-[#A1A1AA] mt-0.5 leading-snug">
                  SHAP-style attribution waterfall reveals exact risk-increasing and mitigating drivers. Monitored for demographic fairness.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#171719] border border-[#303035] flex items-start gap-3.5 hover:border-[#75401F] transition-colors">
              <div className="p-2 rounded-lg bg-[#E8A23A]/15 text-[#E8A23A] shrink-0 mt-0.5">
                <TrendingUp className="w-4 h-4 text-[#E8A23A]" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-[#F5F5F5]">Macroeconomic Stress Lab</h4>
                <p className="text-[11px] text-[#A1A1AA] mt-0.5 leading-snug">
                  Simulate interest rate shocks, revenue contractions, and delay spikes on portfolio cash reserves in real time.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Platform Live Status & Compliance Badges */}
        <div className="relative z-10 pt-8 mt-8 border-t border-[#303035] flex flex-wrap items-center justify-between gap-4 text-xs text-[#71717A]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#22A477] animate-pulse" />
            <span className="font-mono text-[11px] text-[#A1A1AA]">
              127 MSME Profiles Loaded &bull; Model v1.0 GBC Operational
            </span>
          </div>
          <div className="flex items-center gap-3 text-[11px]">
            <span className="px-2 py-0.5 rounded bg-[#171719] border border-[#303035]">Bcrypt-12 Hashing</span>
            <span className="px-2 py-0.5 rounded bg-[#171719] border border-[#303035]">JWT HS256 Token</span>
            <span className="px-2 py-0.5 rounded bg-[#171719] border border-[#303035]">Gmail SMTP OTP</span>
          </div>
        </div>
      </div>

      {/* Right Column: Authentication Card & Dynamic Multi-Workflow Form */}
      <div className="lg:w-1/2 flex items-center justify-center p-6 sm:p-10 lg:p-16 bg-[#0D0D0F]">
        <div className="w-full max-w-md bg-[#171719] border border-[#303035] rounded-2xl shadow-2xl p-6 sm:p-8">

          {/* Header Switcher for Sign In / Sign Up */}
          {(mode === 'signin' || mode === 'signup') && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold text-[#F5F5F5] tracking-tight">
                    {mode === 'signin' ? 'Institutional Sign In' : 'Create Underwriter Account'}
                  </h2>
                  <p className="text-xs text-[#A1A1AA] mt-0.5">
                    {mode === 'signin'
                      ? 'Enter institutional credentials to access the credit terminal'
                      : 'Register with Gmail/email verification for risk underwriting access'}
                  </p>
                </div>
                <div className="w-8 h-8 rounded-lg bg-[#332015] border border-[#75401F] flex items-center justify-center text-[#FF7A1A]">
                  <Lock className="w-4 h-4" />
                </div>
              </div>

              {/* Tab Switcher */}
              <div className="flex p-1 bg-[#141416] border border-[#303035] rounded-xl text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => switchMode('signin')}
                  className={`flex-1 py-2 text-center rounded-lg transition-all cursor-pointer ${
                    mode === 'signin'
                      ? 'bg-[#1E1E21] text-[#FF7A1A] border border-[#75401F] shadow-xs'
                      : 'text-[#A1A1AA] hover:text-[#F5F5F5]'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => switchMode('signup')}
                  className={`flex-1 py-2 text-center rounded-lg transition-all cursor-pointer ${
                    mode === 'signup'
                      ? 'bg-[#1E1E21] text-[#FF7A1A] border border-[#75401F] shadow-xs'
                      : 'text-[#A1A1AA] hover:text-[#F5F5F5]'
                  }`}
                >
                  Register
                </button>
              </div>
            </div>
          )}

          {/* Error Alert Display */}
          {(formError || error) && (
            <div className="mb-5 p-3 rounded-xl bg-[#EF5350]/15 border border-[#EF5350]/30 text-xs text-[#EF5350] flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium leading-relaxed">
                {formError || error}
              </div>
            </div>
          )}

          {/* Success Alert Display */}
          {formSuccess && (
            <div className="mb-5 p-3 rounded-xl bg-[#22A477]/15 border border-[#22A477]/30 text-xs text-[#22A477] flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium leading-relaxed">
                {formSuccess}
              </div>
            </div>
          )}

          {/* ================= 1. SIGN IN FORM ================= */}
          {mode === 'signin' && (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#F5F5F5] mb-1.5">
                  Work Email Address <span className="text-[#EF5350]">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#71717A]">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    placeholder="analyst@fintech.bank.com"
                    value={signInEmail}
                    onChange={(e) => setSignInEmail(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 text-xs bg-[#141416] border border-[#303035] rounded-xl text-[#F5F5F5] placeholder-[#71717A] focus:outline-none focus:ring-2 focus:ring-[#FF7A1A]/30 focus:border-[#FF7A1A] transition-all"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-[#F5F5F5]">
                    Password <span className="text-[#EF5350]">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => switchMode('forgot_password')}
                    className="text-xs font-semibold text-[#FF7A1A] hover:text-[#FF8F3D] hover:underline cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#71717A]">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showSignInPassword ? 'text' : 'password'}
                    required
                    placeholder="Enter account password"
                    value={signInPassword}
                    onChange={(e) => setSignInPassword(e.target.value)}
                    className="w-full pl-9 pr-10 py-2.5 text-xs bg-[#141416] border border-[#303035] rounded-xl text-[#F5F5F5] placeholder-[#71717A] focus:outline-none focus:ring-2 focus:ring-[#FF7A1A]/30 focus:border-[#FF7A1A] transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSignInPassword(!showSignInPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#71717A] hover:text-[#A1A1AA] cursor-pointer"
                  >
                    {showSignInPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded text-[#FF7A1A] bg-[#141416] border-[#303035] focus:ring-[#FF7A1A]"
                  />
                  <span className="text-xs text-[#A1A1AA]">Remember me (7 days)</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 px-4 bg-[#FF7A1A] hover:bg-[#FF8F3D] active:scale-[0.99] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50 mt-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Sign In to Terminal</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* ================= 2. SIGN UP FORM ================= */}
          {mode === 'signup' && (
            <form onSubmit={handleSignUp} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-[#F5F5F5] mb-1">
                  Full Name <span className="text-[#EF5350]">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#71717A]">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="Aditya Raj Kabra"
                    value={signUpName}
                    onChange={(e) => setSignUpName(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2 text-xs bg-[#141416] border border-[#303035] rounded-xl text-[#F5F5F5] placeholder-[#71717A] focus:outline-none focus:ring-2 focus:ring-[#FF7A1A]/30 focus:border-[#FF7A1A] transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#F5F5F5] mb-1">
                  Email Address (Gmail or Institutional) <span className="text-[#EF5350]">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#71717A]">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    placeholder="analyst@gmail.com"
                    value={signUpEmail}
                    onChange={(e) => setSignUpEmail(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2 text-xs bg-[#141416] border border-[#303035] rounded-xl text-[#F5F5F5] placeholder-[#71717A] focus:outline-none focus:ring-2 focus:ring-[#FF7A1A]/30 focus:border-[#FF7A1A] transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#F5F5F5] mb-1">
                  Organization / Financial Institution <span className="text-xs text-[#71717A] font-normal">(optional)</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#71717A]">
                    <Building className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    placeholder="e.g. MSME Development Finance Corp"
                    value={signUpOrg}
                    onChange={(e) => setSignUpOrg(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2 text-xs bg-[#141416] border border-[#303035] rounded-xl text-[#F5F5F5] placeholder-[#71717A] focus:outline-none focus:ring-2 focus:ring-[#FF7A1A]/30 focus:border-[#FF7A1A] transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#F5F5F5] mb-1">
                  Password <span className="text-[#EF5350]">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#71717A]">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showSignUpPassword ? 'text' : 'password'}
                    required
                    placeholder="Min 8 chars with letters & numbers"
                    value={signUpPassword}
                    onChange={(e) => setSignUpPassword(e.target.value)}
                    className="w-full pl-9 pr-10 py-2 text-xs bg-[#141416] border border-[#303035] rounded-xl text-[#F5F5F5] placeholder-[#71717A] focus:outline-none focus:ring-2 focus:ring-[#FF7A1A]/30 focus:border-[#FF7A1A] transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSignUpPassword(!showSignUpPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#71717A] hover:text-[#A1A1AA] cursor-pointer"
                  >
                    {showSignUpPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Password Strength Meter */}
                {signUpPassword && (
                  <div className="mt-2 space-y-1.5">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-[#A1A1AA]">Password Strength</span>
                      <span className={`font-semibold ${signUpStrength.text}`}>{signUpStrength.label}</span>
                    </div>
                    <div className="grid grid-cols-4 gap-1 h-1.5">
                      <div className={`rounded-full ${calculatePasswordStrength(signUpPassword) >= 1 ? signUpStrength.color : 'bg-[#141416] border border-[#303035]'}`} />
                      <div className={`rounded-full ${calculatePasswordStrength(signUpPassword) >= 2 ? signUpStrength.color : 'bg-[#141416] border border-[#303035]'}`} />
                      <div className={`rounded-full ${calculatePasswordStrength(signUpPassword) >= 3 ? signUpStrength.color : 'bg-[#141416] border border-[#303035]'}`} />
                      <div className={`rounded-full ${calculatePasswordStrength(signUpPassword) >= 4 ? signUpStrength.color : 'bg-[#141416] border border-[#303035]'}`} />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-[#F5F5F5] mb-1">
                  Confirm Password <span className="text-[#EF5350]">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#71717A]">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showSignUpConfirmPassword ? 'text' : 'password'}
                    required
                    placeholder="Repeat password"
                    value={signUpConfirmPassword}
                    onChange={(e) => setSignUpConfirmPassword(e.target.value)}
                    className="w-full pl-9 pr-10 py-2 text-xs bg-[#141416] border border-[#303035] rounded-xl text-[#F5F5F5] placeholder-[#71717A] focus:outline-none focus:ring-2 focus:ring-[#FF7A1A]/30 focus:border-[#FF7A1A] transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSignUpConfirmPassword(!showSignUpConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#71717A] hover:text-[#A1A1AA] cursor-pointer"
                  >
                    {showSignUpConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {signUpConfirmPassword && signUpPassword !== signUpConfirmPassword && (
                  <p className="text-[10px] text-[#EF5350] mt-1">Passwords do not match</p>
                )}
              </div>

              <div className="pt-1">
                <label className="flex items-start gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                    className="w-4 h-4 rounded text-[#FF7A1A] bg-[#141416] border-[#303035] focus:ring-[#FF7A1A] mt-0.5"
                  />
                  <span className="text-[11px] text-[#A1A1AA] leading-tight">
                    I acknowledge and agree to institutional data governance and MSME underwriting protocol.
                  </span>
                </label>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 px-4 bg-[#FF7A1A] hover:bg-[#FF8F3D] active:scale-[0.99] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50 mt-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Send Verification Code</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* ================= 3. REGISTRATION OTP VERIFICATION ================= */}
          {mode === 'register_otp' && (
            <div className="space-y-5">
              <div className="flex items-center gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => switchMode('signup')}
                  className="p-1.5 rounded-lg text-[#A1A1AA] hover:text-[#F5F5F5] hover:bg-[#1E1E21] transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div>
                  <h2 className="text-xl font-bold text-[#F5F5F5] tracking-tight">
                    Verify Your Email
                  </h2>
                  <p className="text-xs text-[#A1A1AA] mt-0.5">
                    Enter the 6-digit verification code dispatched to <span className="font-mono text-[#F5F5F5] font-semibold">{maskedEmail || activeEmail}</span>
                  </p>
                </div>
              </div>

              <form onSubmit={handleVerifyRegistrationOtp} className="space-y-5">
                {/* 6 Digit Input Boxes */}
                <div className="flex items-center justify-between gap-2" onPaste={handleOtpPaste}>
                  {otpDigits.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => (otpInputRefs.current[idx] = el)}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(idx, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                      className="w-11 h-13 sm:w-12 sm:h-14 text-center text-xl font-bold font-mono bg-[#141416] border border-[#303035] focus:border-[#FF7A1A] focus:ring-2 focus:ring-[#FF7A1A]/30 text-[#F5F5F5] rounded-xl outline-none transition-all"
                    />
                  ))}
                </div>

                <div className="flex items-center justify-between text-xs text-[#A1A1AA]">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#FF7A1A]" />
                    <span>Valid for 5 minutes</span>
                  </div>

                  <button
                    type="button"
                    onClick={handleResendRegistrationOtp}
                    disabled={cooldown > 0 || isSubmitting}
                    className="font-semibold text-[#FF7A1A] hover:text-[#FF8F3D] disabled:text-[#71717A] disabled:cursor-not-allowed transition-colors cursor-pointer"
                  >
                    {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend Code'}
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || otpDigits.join('').length !== 6}
                  className="w-full py-2.5 px-4 bg-[#FF7A1A] hover:bg-[#FF8F3D] active:scale-[0.99] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Verify & Activate Account</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={() => switchMode('signup')}
                    className="text-xs text-[#A1A1AA] hover:text-[#F5F5F5] transition-colors cursor-pointer"
                  >
                    Change email address
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ================= 4. FORGOT PASSWORD FORM ================= */}
          {mode === 'forgot_password' && (
            <div className="space-y-5">
              <div className="flex items-center gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => switchMode('signin')}
                  className="p-1.5 rounded-lg text-[#A1A1AA] hover:text-[#F5F5F5] hover:bg-[#1E1E21] transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div>
                  <h2 className="text-xl font-bold text-[#F5F5F5] tracking-tight">
                    Reset Underwriter Password
                  </h2>
                  <p className="text-xs text-[#A1A1AA] mt-0.5">
                    We will send a 6-digit recovery code to your registered email address.
                  </p>
                </div>
              </div>

              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#F5F5F5] mb-1.5">
                    Registered Email Address <span className="text-[#EF5350]">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#71717A]">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="email"
                      required
                      placeholder="analyst@gmail.com"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      className="w-full pl-9 pr-3.5 py-2.5 text-xs bg-[#141416] border border-[#303035] rounded-xl text-[#F5F5F5] placeholder-[#71717A] focus:outline-none focus:ring-2 focus:ring-[#FF7A1A]/30 focus:border-[#FF7A1A] transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 px-4 bg-[#FF7A1A] hover:bg-[#FF8F3D] active:scale-[0.99] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50 mt-2 cursor-pointer"
                >
                  {isSubmitting ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Send Recovery Code</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => switchMode('signin')}
                    className="text-xs font-semibold text-[#A1A1AA] hover:text-[#F5F5F5] transition-colors cursor-pointer"
                  >
                    Remember your password? Sign In
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ================= 5. RESET OTP VERIFICATION ================= */}
          {mode === 'reset_otp' && (
            <div className="space-y-5">
              <div className="flex items-center gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => switchMode('forgot_password')}
                  className="p-1.5 rounded-lg text-[#A1A1AA] hover:text-[#F5F5F5] hover:bg-[#1E1E21] transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div>
                  <h2 className="text-xl font-bold text-[#F5F5F5] tracking-tight">
                    Enter Recovery Code
                  </h2>
                  <p className="text-xs text-[#A1A1AA] mt-0.5">
                    Enter the 6-digit recovery code dispatched to <span className="font-mono text-[#F5F5F5] font-semibold">{maskedEmail || activeEmail}</span>
                  </p>
                </div>
              </div>

              <form onSubmit={handleVerifyResetOtp} className="space-y-5">
                <div className="flex items-center justify-between gap-2" onPaste={handleOtpPaste}>
                  {otpDigits.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => (otpInputRefs.current[idx] = el)}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(idx, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                      className="w-11 h-13 sm:w-12 sm:h-14 text-center text-xl font-bold font-mono bg-[#141416] border border-[#303035] focus:border-[#FF7A1A] focus:ring-2 focus:ring-[#FF7A1A]/30 text-[#F5F5F5] rounded-xl outline-none transition-all"
                    />
                  ))}
                </div>

                <div className="flex items-center justify-between text-xs text-[#A1A1AA]">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#FF7A1A]" />
                    <span>Valid for 5 minutes</span>
                  </div>

                  <button
                    type="button"
                    onClick={handleResendResetOtp}
                    disabled={cooldown > 0 || isSubmitting}
                    className="font-semibold text-[#FF7A1A] hover:text-[#FF8F3D] disabled:text-[#71717A] disabled:cursor-not-allowed transition-colors cursor-pointer"
                  >
                    {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend Code'}
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || otpDigits.join('').length !== 6}
                  className="w-full py-2.5 px-4 bg-[#FF7A1A] hover:bg-[#FF8F3D] active:scale-[0.99] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Authorize Password Reset</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* ================= 6. SET NEW PASSWORD ================= */}
          {mode === 'set_new_password' && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-[#F5F5F5] tracking-tight">
                  Set New Password
                </h2>
                <p className="text-xs text-[#A1A1AA] mt-0.5">
                  Establish a secure new password for <span className="font-mono text-[#F5F5F5]">{activeEmail}</span>
                </p>
              </div>

              <form onSubmit={handleSetNewPassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#F5F5F5] mb-1">
                    New Password <span className="text-[#EF5350]">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#71717A]">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      placeholder="Min 8 chars with letters & numbers"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full pl-9 pr-10 py-2.5 text-xs bg-[#141416] border border-[#303035] rounded-xl text-[#F5F5F5] placeholder-[#71717A] focus:outline-none focus:ring-2 focus:ring-[#FF7A1A]/30 focus:border-[#FF7A1A] transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#71717A] hover:text-[#A1A1AA] cursor-pointer"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {newPassword && (
                    <div className="mt-2 space-y-1.5">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-[#A1A1AA]">Password Strength</span>
                        <span className={`font-semibold ${resetStrength.text}`}>{resetStrength.label}</span>
                      </div>
                      <div className="grid grid-cols-4 gap-1 h-1.5">
                        <div className={`rounded-full ${calculatePasswordStrength(newPassword) >= 1 ? resetStrength.color : 'bg-[#141416] border border-[#303035]'}`} />
                        <div className={`rounded-full ${calculatePasswordStrength(newPassword) >= 2 ? resetStrength.color : 'bg-[#141416] border border-[#303035]'}`} />
                        <div className={`rounded-full ${calculatePasswordStrength(newPassword) >= 3 ? resetStrength.color : 'bg-[#141416] border border-[#303035]'}`} />
                        <div className={`rounded-full ${calculatePasswordStrength(newPassword) >= 4 ? resetStrength.color : 'bg-[#141416] border border-[#303035]'}`} />
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#F5F5F5] mb-1">
                    Confirm New Password <span className="text-[#EF5350]">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#71717A]">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showConfirmNewPassword ? 'text' : 'password'}
                      required
                      placeholder="Repeat new password"
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      className="w-full pl-9 pr-10 py-2.5 text-xs bg-[#141416] border border-[#303035] rounded-xl text-[#F5F5F5] placeholder-[#71717A] focus:outline-none focus:ring-2 focus:ring-[#FF7A1A]/30 focus:border-[#FF7A1A] transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#71717A] hover:text-[#A1A1AA] cursor-pointer"
                    >
                      {showConfirmNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {confirmNewPassword && newPassword !== confirmNewPassword && (
                    <p className="text-[10px] text-[#EF5350] mt-1">Passwords do not match</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 px-4 bg-[#FF7A1A] hover:bg-[#FF8F3D] active:scale-[0.99] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50 mt-2 cursor-pointer"
                >
                  {isSubmitting ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Update Password & Invalidate Sessions</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* ================= 7. PASSWORD RESET SUCCESS ================= */}
          {mode === 'reset_success' && (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 rounded-full bg-[#22A477]/15 border border-[#22A477]/30 flex items-center justify-center text-[#22A477] mx-auto shadow-lg">
                <Check className="w-8 h-8" />
              </div>

              <div>
                <h2 className="text-xl font-bold text-[#F5F5F5] tracking-tight">
                  Password Updated Successfully
                </h2>
                <p className="text-xs text-[#A1A1AA] mt-1.5 leading-relaxed max-w-sm mx-auto">
                  Your credentials have been securely updated in the persistent database.
                  All prior session tokens have been invalidated.
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => switchMode('signin')}
                  className="w-full py-2.5 px-4 bg-[#FF7A1A] hover:bg-[#FF8F3D] active:scale-[0.99] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                >
                  <span>Sign In with New Password</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Card Footer Switcher */}
          {(mode === 'signin' || mode === 'signup') && (
            <div className="mt-5 pt-4 border-t border-[#303035] text-center">
              {mode === 'signin' ? (
                <p className="text-xs text-[#A1A1AA]">
                  Don't have an underwriter account?{' '}
                  <button
                    type="button"
                    onClick={() => switchMode('signup')}
                    className="font-bold text-[#FF7A1A] hover:text-[#FF8F3D] hover:underline cursor-pointer"
                  >
                    Register here
                  </button>
                </p>
              ) : (
                <p className="text-xs text-[#A1A1AA]">
                  Already registered with CrediLens?{' '}
                  <button
                    type="button"
                    onClick={() => switchMode('signin')}
                    className="font-bold text-[#FF7A1A] hover:text-[#FF8F3D] hover:underline cursor-pointer"
                  >
                    Sign in here
                  </button>
                </p>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
