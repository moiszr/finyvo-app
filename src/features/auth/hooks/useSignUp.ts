// src/features/auth/hooks/useSignUp.ts
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { authService } from '../services/auth';
import type { SignUpCredentials } from '../types';

type SignUpResult =
  | { success: true; needsConfirmation: boolean }
  | { success: false; needsConfirmation: false };

export function useSignUp() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Estado específico para email duplicado y reenvío
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  const router = useRouter();

  const signUp = async (
    credentials: SignUpCredentials,
  ): Promise<SignUpResult> => {
    setLoading(true);
    setError(null);
    setIsDuplicate(false);
    setResent(false);

    try {
      // 🔹 authService.signUp devuelve el payload estándar de Supabase
      // { user, session } (session casi siempre null si requiere verificación)
      const data = await authService.signUp(credentials);

      const user = (data as any)?.user ?? null;
      const session = (data as any)?.session ?? null;
      const isAutoVerified =
        !!session && !!user && !!(user.email_confirmed_at || user.confirmed_at);

      if (isAutoVerified) {
        // Caso raro: proyecto configurado para confirmar automáticamente
        router.replace('/(tabs)/dashboard');
        return { success: true, needsConfirmation: false };
      }

      // Flujo normal: verificación pendiente
      router.replace({
        pathname: '/(auth)/verify-email',
        params: { email: credentials.email },
      });
      return { success: true, needsConfirmation: true };
    } catch (e: any) {
      const code = e?.code ?? '';
      const msg = e?.message || 'Error en registro';

      if (code === 'DUPLICATE_EMAIL') {
        // ✅ Sin login silencioso: mostramos mensaje claro y opción de ir a login
        setIsDuplicate(true);
        return { success: false, needsConfirmation: false };
      }

      setError(msg);
      return { success: false, needsConfirmation: false };
    } finally {
      setLoading(false);
    }
  };

  const resendVerification = async (email: string) => {
    setResending(true);
    try {
      await authService.resendVerification(email);
      setResent(true);
      // Deja un mensaje suave en el mismo estado de error para no agregar otro estado más
      setError('Te enviamos un nuevo correo de verificación.');
    } catch (e: any) {
      setError(e?.message || 'No se pudo reenviar el correo');
    } finally {
      setResending(false);
    }
  };

  return {
    // acciones
    signUp,
    resendVerification,
    clearError: () => setError(null),

    // estado
    loading,
    error,
    isDuplicate,
    resending,
    resent,
  };
}
