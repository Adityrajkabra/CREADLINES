import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  SafeUser,
  LoginPayload,
  RegisterPayload,
  RegisterInitiateResponse,
  VerifyRegistrationOtpPayload,
  ForgotPasswordResponse,
  VerifyResetOtpPayload,
  VerifyResetOtpResponse,
  ResetPasswordPayload,
  StandardMessageResponse,
  AuthResponse
} from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: SafeUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<RegisterInitiateResponse>;
  verifyRegistrationOtp: (payload: VerifyRegistrationOtpPayload) => Promise<AuthResponse>;
  resendRegistrationOtp: (email: string) => Promise<RegisterInitiateResponse>;
  forgotPassword: (email: string) => Promise<ForgotPasswordResponse>;
  verifyResetOtp: (payload: VerifyResetOtpPayload) => Promise<VerifyResetOtpResponse>;
  resendResetOtp: (email: string) => Promise<ForgotPasswordResponse>;
  resetPassword: (payload: ResetPasswordPayload) => Promise<StandardMessageResponse>;
  logout: () => Promise<void>;
  quickDemoLogin: () => Promise<void>;
  clearError: () => void;
  setError: (err: string | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<SafeUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Restore session from token / cookie on mount
  useEffect(() => {
    let isMounted = true;

    const restoreSession = async () => {
      const token = localStorage.getItem('credilens_token');
      if (!token) {
        if (isMounted) {
          setIsLoading(false);
          setUser(null);
        }
        return;
      }

      try {
        const currentUser = await api.getMe();
        if (isMounted) {
          setUser(currentUser);
        }
      } catch (err: any) {
        if (isMounted) {
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    restoreSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = async (payload: LoginPayload) => {
    setError(null);
    try {
      const res = await api.login(payload);
      setUser(res.user);
    } catch (err: any) {
      const msg = err.message || 'Authentication failed. Please verify your institutional credentials.';
      setError(msg);
      throw err;
    }
  };

  const register = async (payload: RegisterPayload): Promise<RegisterInitiateResponse> => {
    setError(null);
    try {
      return await api.register(payload);
    } catch (err: any) {
      const msg = err.message || 'Registration failed. Please check the provided information.';
      setError(msg);
      throw err;
    }
  };

  const verifyRegistrationOtp = async (payload: VerifyRegistrationOtpPayload): Promise<AuthResponse> => {
    setError(null);
    try {
      const res = await api.verifyRegistrationOtp(payload);
      setUser(res.user);
      return res;
    } catch (err: any) {
      const msg = err.message || 'Invalid or expired verification code.';
      setError(msg);
      throw err;
    }
  };

  const resendRegistrationOtp = async (email: string): Promise<RegisterInitiateResponse> => {
    setError(null);
    try {
      return await api.resendRegistrationOtp({ email });
    } catch (err: any) {
      const msg = err.message || 'Failed to resend verification code.';
      setError(msg);
      throw err;
    }
  };

  const forgotPassword = async (email: string): Promise<ForgotPasswordResponse> => {
    setError(null);
    try {
      return await api.forgotPassword({ email });
    } catch (err: any) {
      const msg = err.message || 'Failed to process password recovery request.';
      setError(msg);
      throw err;
    }
  };

  const verifyResetOtp = async (payload: VerifyResetOtpPayload): Promise<VerifyResetOtpResponse> => {
    setError(null);
    try {
      return await api.verifyResetOtp(payload);
    } catch (err: any) {
      const msg = err.message || 'Invalid or expired recovery code.';
      setError(msg);
      throw err;
    }
  };

  const resendResetOtp = async (email: string): Promise<ForgotPasswordResponse> => {
    setError(null);
    try {
      return await api.resendResetOtp({ email });
    } catch (err: any) {
      const msg = err.message || 'Failed to resend recovery code.';
      setError(msg);
      throw err;
    }
  };

  const resetPassword = async (payload: ResetPasswordPayload): Promise<StandardMessageResponse> => {
    setError(null);
    try {
      return await api.resetPassword(payload);
    } catch (err: any) {
      const msg = err.message || 'Failed to reset password.';
      setError(msg);
      throw err;
    }
  };

  const logout = async () => {
    try {
      await api.logout();
    } finally {
      setUser(null);
      setError(null);
    }
  };

  const quickDemoLogin = async () => {
    setError(null);
    return login({
      email: 'underwriter@credilens.internal',
      password: 'CrediLens@2026',
      remember_me: true
    });
  };

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        error,
        login,
        register,
        verifyRegistrationOtp,
        resendRegistrationOtp,
        forgotPassword,
        verifyResetOtp,
        resendResetOtp,
        resetPassword,
        logout,
        quickDemoLogin,
        clearError,
        setError
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
