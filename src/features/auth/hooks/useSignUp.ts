// src/features/auth/hooks/useSignUp.ts
import { useState, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { authService } from '../services/auth';
import type { SignUpCredentials } from '../types';

// Tipos
export type SignUpResult =
  | { success: true; needsConfirmation: boolean }
  | { success: false; needsConfirmation: false };

export enum ErrorCode {
  DUPLICATE_EMAIL = 'DUPLICATE_EMAIL',
  INVALID_EMAIL = 'INVALID_EMAIL',
  WEAK_PASSWORD = 'WEAK_PASSWORD',
  RATE_LIMIT = 'RATE_LIMIT',
  NETWORK_ERROR = 'NETWORK_ERROR',
  GENERIC = 'GENERIC',
}

interface ErrorMapping {
  code: ErrorCode;
  message: string;
  patterns: RegExp[];
}

// Configuración de mapeo de errores
const ERROR_MAPPINGS: ErrorMapping[] = [
  {
    code: ErrorCode.DUPLICATE_EMAIL,
    message:
      'Ya existe una cuenta con este email.\nInicia sesión o recupera tu contraseña.',
    patterns: [
      /already.*exist/i,
      /ya existe una cuenta/i,
      /duplicate.*email/i,
      /user.*already.*registered/i,
    ],
  },
  {
    code: ErrorCode.INVALID_EMAIL,
    message: 'El formato del email no es válido.',
    patterns: [
      /invalid.*email/i,
      /correo.*inválido/i,
      /email.*format/i,
      /malformed.*email/i,
    ],
  },
  {
    code: ErrorCode.WEAK_PASSWORD,
    message: 'La contraseña debe tener al menos 8 caracteres.',
    patterns: [
      /weak.*password/i,
      /too short/i,
      /min.*8/i,
      /mínimo.*8/i,
      /password.*requirements/i,
    ],
  },
  {
    code: ErrorCode.RATE_LIMIT,
    message: 'Demasiados intentos. Por favor, espera unos minutos.',
    patterns: [
      /rate.*limit/i,
      /too many requests/i,
      /demasiados.*intentos/i,
      /throttle/i,
    ],
  },
  {
    code: ErrorCode.NETWORK_ERROR,
    message: 'Error de conexión. Verifica tu internet e intenta de nuevo.',
    patterns: [
      /network.*error/i,
      /connection.*failed/i,
      /fetch.*failed/i,
      /no.*internet/i,
    ],
  },
];

// Función pura para mapear errores
function mapError(error: any): {
  code: ErrorCode;
  message: string;
} {
  // Extraer mensaje del error
  const errorMessage = String(error?.message || error?.code || error || '');
  const errorCode = String(error?.code || '').toUpperCase();

  // Buscar coincidencia en los mappings
  for (const mapping of ERROR_MAPPINGS) {
    // Primero verificar por código exacto
    if (errorCode === mapping.code) {
      return { code: mapping.code, message: mapping.message };
    }

    // Luego verificar por patrones en el mensaje
    for (const pattern of mapping.patterns) {
      if (pattern.test(errorMessage)) {
        return { code: mapping.code, message: mapping.message };
      }
    }
  }

  // Si no hay coincidencia, retornar error genérico
  return {
    code: ErrorCode.GENERIC,
    message: 'No se pudo crear la cuenta. Por favor, intenta de nuevo.',
  };
}

export function useSignUp() {
  const router = useRouter();

  // Estado principal
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<ErrorCode | null>(null);

  // Estado de reenvío de verificación
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  // Función principal de registro
  const signUp = useCallback(
    async (credentials: SignUpCredentials): Promise<SignUpResult> => {
      // Reset estado
      setLoading(true);
      setError(null);
      setErrorCode(null);
      setResent(false);

      try {
        const data = await authService.signUp(credentials);

        // Verificar si el usuario fue auto-verificado
        const user = data?.user;
        const session = data?.session;
        const isAutoVerified = !!(
          session &&
          user &&
          (user.email_confirmed_at || user.confirmed_at)
        );

        if (isAutoVerified) {
          // Usuario verificado automáticamente, ir al dashboard
          router.replace('/(tabs)/dashboard');
          return { success: true, needsConfirmation: false };
        }

        // Necesita verificación de email
        router.replace({
          pathname: '/(auth)/verify-email',
          params: { email: credentials.email },
        });
        return { success: true, needsConfirmation: true };
      } catch (err) {
        // Mapear y establecer el error
        const mapped = mapError(err);
        setError(mapped.message);
        setErrorCode(mapped.code);
        return { success: false, needsConfirmation: false };
      } finally {
        setLoading(false);
      }
    },
    [router],
  );

  // Función para reenviar verificación
  const resendVerification = useCallback(async (email: string) => {
    setResending(true);
    setError(null);
    setErrorCode(null);

    try {
      await authService.resendVerification(email);
      setResent(true);
      // Mensaje de éxito temporal
      setTimeout(() => setResent(false), 5000);
    } catch (err) {
      const mapped = mapError(err);
      setError(mapped.message);
      setErrorCode(mapped.code);
    } finally {
      setResending(false);
    }
  }, []);

  // Función para limpiar errores
  const clearError = useCallback(() => {
    setError(null);
    setErrorCode(null);
  }, []);

  // Función para verificar si es un error específico
  const isErrorType = useCallback(
    (type: ErrorCode): boolean => {
      return errorCode === type;
    },
    [errorCode],
  );

  return {
    // Acciones
    signUp,
    resendVerification,
    clearError,

    // Estado
    loading,
    error,
    errorCode,
    resending,
    resent,

    // Helpers
    isErrorType,
    isDuplicateEmail: errorCode === ErrorCode.DUPLICATE_EMAIL,
  };
}
