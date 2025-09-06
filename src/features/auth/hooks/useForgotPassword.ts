import { useState } from 'react';
import { authService } from '../services/auth';
import type { ForgotPasswordCredentials } from '../types';

export function useForgotPassword() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);

  const sendResetEmail = async (credentials: ForgotPasswordCredentials) => {
    setLoading(true);
    setError(null);

    try {
      await authService.forgotPassword(credentials);
      setEmailSent(true);
      return { success: true };
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Error enviando email';
      setError(errorMessage);
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setEmailSent(false);
    setError(null);
  };

  return {
    sendResetEmail,
    loading,
    error,
    emailSent,
    reset,
    clearError: () => setError(null),
  };
}
