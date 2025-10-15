// src/features/auth/hooks/useResetPassword.ts
import { useEffect, useState, useCallback } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/api/supabase/supabaseClient';
import { useAuthStore } from '@/store/authStore';
import type { ResetPasswordCredentials } from '../types';

// Tipos
export enum ResetPasswordErrorCode {
  INVALID_TOKEN = 'INVALID_TOKEN',
  EXPIRED_TOKEN = 'EXPIRED_TOKEN',
  WEAK_PASSWORD = 'WEAK_PASSWORD',
  PASSWORD_MISMATCH = 'PASSWORD_MISMATCH',
  NETWORK_ERROR = 'NETWORK_ERROR',
  SESSION_ERROR = 'SESSION_ERROR',
  GENERIC = 'GENERIC',
}

export interface ResetOptions {
  autoNavigate?: boolean;
  signOutAfter?: boolean;
}

export interface ResetResult {
  ok: boolean;
  success: boolean;
  errorCode?: ResetPasswordErrorCode;
  message?: string;
}

interface ErrorMapping {
  code: ResetPasswordErrorCode;
  message: string;
  patterns: RegExp[];
}

// Configuración de mapeo de errores
const ERROR_MAPPINGS: ErrorMapping[] = [
  {
    code: ResetPasswordErrorCode.INVALID_TOKEN,
    message: 'El enlace no es válido. Por favor, solicita uno nuevo.',
    patterns: [
      /invalid.*token/i,
      /token.*invalid/i,
      /malformed.*token/i,
      /bad.*token/i,
    ],
  },
  {
    code: ResetPasswordErrorCode.EXPIRED_TOKEN,
    message: 'El enlace ha expirado. Por favor, solicita uno nuevo.',
    patterns: [
      /expired.*token/i,
      /token.*expired/i,
      /enlace.*expirado/i,
      /timeout/i,
    ],
  },
  {
    code: ResetPasswordErrorCode.WEAK_PASSWORD,
    message: 'La contraseña no cumple con los requisitos de seguridad.',
    patterns: [
      /weak.*password/i,
      /password.*weak/i,
      /password.*requirements/i,
      /insecure.*password/i,
    ],
  },
  {
    code: ResetPasswordErrorCode.NETWORK_ERROR,
    message: 'Error de conexión. Verifica tu internet e intenta de nuevo.',
    patterns: [
      /network.*error/i,
      /connection.*failed/i,
      /fetch.*failed/i,
      /offline/i,
    ],
  },
  {
    code: ResetPasswordErrorCode.SESSION_ERROR,
    message: 'Error de sesión. Por favor, intenta de nuevo.',
    patterns: [
      /session.*error/i,
      /no.*session/i,
      /unauthorized/i,
      /not.*authenticated/i,
    ],
  },
];

function mapResetPasswordError(error: any): {
  code: ResetPasswordErrorCode;
  message: string;
} {
  const errorMessage = String(
    error?.message ||
      error?.error?.message ||
      error?.data?.message ||
      error?.code ||
      error ||
      '',
  ).toLowerCase();

  for (const mapping of ERROR_MAPPINGS) {
    for (const pattern of mapping.patterns) {
      if (pattern.test(errorMessage)) {
        return { code: mapping.code, message: mapping.message };
      }
    }
  }

  return {
    code: ResetPasswordErrorCode.GENERIC,
    message:
      'No se pudo actualizar la contraseña. Por favor, intenta de nuevo.',
  };
}

export function useResetPassword() {
  const router = useRouter();
  const { token_hash, type } = useLocalSearchParams<{
    token_hash?: string;
    type?: string;
  }>();

  const { isRecoverySession, clearRecoveryAndSignOut } = useAuthStore();

  // Estado principal
  const [loading, setLoading] = useState(false);
  const [booting, setBooting] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<ResetPasswordErrorCode | null>(
    null,
  );
  const [tokensProcessed, setTokensProcessed] = useState(false);

  // Verificación inicial del token/sesión de recuperación
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { data: sessionData, error: sessionError } =
          await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        // A) Ya hay sesión de recuperación activa
        if (sessionData.session && isRecoverySession) {
          if (!cancelled) {
            setTokensProcessed(true);
            setError(null);
            setErrorCode(null);
          }
          return;
        }

        // B) No hay sesión pero viene token de recovery: verificar OTP
        if (!sessionData.session && token_hash && type === 'recovery') {
          const { data: verifyData, error: verifyError } =
            await supabase.auth.verifyOtp({
              type: 'recovery',
              token_hash,
            });

          if (verifyError) {
            const mapped = mapResetPasswordError(verifyError);
            if (!cancelled) {
              setError(mapped.message);
              setErrorCode(mapped.code);
            }
            return;
          }

          if (verifyData.session && !cancelled) {
            setTokensProcessed(true);
            setError(null);
            setErrorCode(null);
          }
          return;
        }

        // C) Ni sesión ni token válido
        if (!cancelled) {
          setError('Enlace inválido o expirado. Solicita uno nuevo.');
          setErrorCode(ResetPasswordErrorCode.INVALID_TOKEN);
        }
      } catch (err) {
        const mapped = mapResetPasswordError(err);
        if (!cancelled) {
          setError(mapped.message);
          setErrorCode(mapped.code);
        }
      } finally {
        if (!cancelled) setBooting(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isRecoverySession, token_hash, type]);

  const resetPassword = useCallback(
    async (
      credentials: ResetPasswordCredentials,
      options: ResetOptions = { autoNavigate: false, signOutAfter: false },
    ): Promise<ResetResult> => {
      setLoading(true);
      setError(null);
      setErrorCode(null);

      try {
        const { password, confirmPassword } = credentials;

        // ✅ Validaciones locales (sin throw)
        if (!password || !confirmPassword) {
          setError('Completa ambos campos');
          setErrorCode(ResetPasswordErrorCode.GENERIC);
          return {
            ok: false,
            success: false,
            message: 'Completa ambos campos',
            errorCode: ResetPasswordErrorCode.GENERIC,
          };
        }

        if (password !== confirmPassword) {
          setError('Las contraseñas no coinciden');
          setErrorCode(ResetPasswordErrorCode.PASSWORD_MISMATCH);
          return {
            ok: false,
            success: false,
            message: 'Las contraseñas no coinciden',
            errorCode: ResetPasswordErrorCode.PASSWORD_MISMATCH,
          };
        }

        if (password.length < 8) {
          setError('La contraseña debe tener al menos 8 caracteres');
          setErrorCode(ResetPasswordErrorCode.WEAK_PASSWORD);
          return {
            ok: false,
            success: false,
            message: 'La contraseña debe tener al menos 8 caracteres',
            errorCode: ResetPasswordErrorCode.WEAK_PASSWORD,
          };
        }

        // Reglas extra (opcional)
        const hasLowerCase = /[a-z]/.test(password);
        const hasUpperCase = /[A-Z]/.test(password);
        const hasNumber = /\d/.test(password);
        if (!hasLowerCase || !hasUpperCase || !hasNumber) {
          setError(
            'La contraseña debe incluir mayúsculas, minúsculas y números',
          );
          setErrorCode(ResetPasswordErrorCode.WEAK_PASSWORD);
          return {
            ok: false,
            success: false,
            message:
              'La contraseña debe incluir mayúsculas, minúsculas y números',
            errorCode: ResetPasswordErrorCode.WEAK_PASSWORD,
          };
        }

        // ⚠️ Protección: si no hay sesión de recuperación válida, evitar updateUser
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData?.session) {
          setError('Error de sesión. Por favor, intenta de nuevo.');
          setErrorCode(ResetPasswordErrorCode.SESSION_ERROR);
          return {
            ok: false,
            success: false,
            message: 'Error de sesión. Por favor, intenta de nuevo.',
            errorCode: ResetPasswordErrorCode.SESSION_ERROR,
          };
        }

        // Actualizar contraseña
        const { error: updateError } = await supabase.auth.updateUser({
          password,
        });
        if (updateError) {
          const mapped = mapResetPasswordError(updateError);
          setError(mapped.message);
          setErrorCode(mapped.code);
          return {
            ok: false,
            success: false,
            message: mapped.message,
            errorCode: mapped.code,
          };
        }

        // Opcionales
        if (options.signOutAfter) {
          await clearRecoveryAndSignOut();
        }
        if (options.autoNavigate) {
          router.replace('/(auth)/sign-in');
        }

        return { ok: true, success: true };
      } catch (err: any) {
        // Solo errores inesperados aquí
        const mapped = mapResetPasswordError(err);
        setError(mapped.message);
        setErrorCode(mapped.code);
        return {
          ok: false,
          success: false,
          message: mapped.message,
          errorCode: mapped.code,
        };
      } finally {
        setLoading(false);
      }
    },
    [clearRecoveryAndSignOut, router],
  );

  const redirectToForgotPassword = useCallback(() => {
    router.replace('/(auth)/forgot-password');
  }, [router]);

  const clearError = useCallback(() => {
    setError(null);
    setErrorCode(null);
  }, []);

  const isErrorType = useCallback(
    (type: ResetPasswordErrorCode): boolean => errorCode === type,
    [errorCode],
  );

  return {
    // Acciones
    resetPassword,
    redirectToForgotPassword,
    clearError,
    signOutForReset: clearRecoveryAndSignOut,

    // Estado
    loading,
    booting,
    error,
    errorCode,
    tokensProcessed,
    isRecoverySession,

    // Helpers
    isErrorType,
    isInvalidToken: errorCode === ResetPasswordErrorCode.INVALID_TOKEN,
    isExpiredToken: errorCode === ResetPasswordErrorCode.EXPIRED_TOKEN,
    isWeakPassword: errorCode === ResetPasswordErrorCode.WEAK_PASSWORD,
  };
}
