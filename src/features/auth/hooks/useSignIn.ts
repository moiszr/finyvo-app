import { useState } from 'react';
import { useRouter } from 'expo-router';
import { authService } from '../services/auth';
import type { SignInCredentials } from '../types';

export function useSignIn() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const signIn = async (credentials: SignInCredentials) => {
    setLoading(true);
    setError(null);

    try {
      await authService.signIn(credentials);
      router.replace('/(tabs)/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed');
    } finally {
      setLoading(false);
    }
  };

  return {
    signIn,
    loading,
    error,
    clearError: () => setError(null),
  };
}
