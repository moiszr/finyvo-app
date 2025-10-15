// src/features/auth/hooks/useSignIn.ts
import { useState, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { authService } from '../services/auth';
import type { SignInCredentials } from '../types';

// Tipos de error específicos para login
export enum SignInErrorCode {
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  EMAIL_NOT_VERIFIED = 'EMAIL_NOT_VERIFIED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  RATE_LIMIT = 'RATE_LIMIT',
  GENERIC = 'GENERIC',
}

interface ErrorMapping {
  code: SignInErrorCode;
  message: string;
  patterns: RegExp[];
}

// Configuración centralizada de mapeo de errores
const ERROR_MAPPINGS: ErrorMapping[] = [
  {
    code: SignInErrorCode.INVALID_CREDENTIALS,
    message: 'Correo o contraseña incorrectos.',
    patterns: [
      /invalid.*(login|credential|password)/i,
      /incorrect.*(password|email)/i,
      /contraseñ(a|o).*incorrect/i,
      /correo.*incorrect/i,
      /authentication.*failed/i,
      /bad.*credentials/i,
    ],
  },
  {
    code: SignInErrorCode.ACCOUNT_LOCKED,
    message: 'Tu cuenta ha sido bloqueada temporalmente. Contacta soporte.',
    patterns: [
      /account.*locked/i,
      /cuenta.*bloqueada/i,
      /suspended/i,
      /disabled.*account/i,
    ],
  },
  {
    code: SignInErrorCode.EMAIL_NOT_VERIFIED,
    message: 'Por favor verifica tu email antes de iniciar sesión.',
    patterns: [
      /email.*not.*verified/i,
      /verify.*email/i,
      /correo.*no.*verificado/i,
      /confirmation.*required/i,
    ],
  },
  {
    code: SignInErrorCode.RATE_LIMIT,
    message: 'Demasiados intentos. Por favor, espera unos minutos.',
    patterns: [
      /rate.*limit/i,
      /too many.*attempts/i,
      /demasiados.*intentos/i,
      /throttle/i,
    ],
  },
  {
    code: SignInErrorCode.NETWORK_ERROR,
    message: 'Error de conexión. Verifica tu internet e intenta de nuevo.',
    patterns: [
      /network.*error/i,
      /connection.*failed/i,
      /fetch.*failed/i,
      /no.*internet/i,
      /offline/i,
    ],
  },
];

// Función pura para mapear errores
function mapSignInError(error: any): {
  code: SignInErrorCode;
  message: string;
} {
  // Extraer mensaje del error de diferentes fuentes posibles
  const errorMessage = String(
    error?.message ||
      error?.error?.message ||
      error?.data?.message ||
      error?.code ||
      error ||
      '',
  ).toLowerCase();

  // Buscar coincidencia en los mappings
  for (const mapping of ERROR_MAPPINGS) {
    for (const pattern of mapping.patterns) {
      if (pattern.test(errorMessage)) {
        return {
          code: mapping.code,
          message: mapping.message,
        };
      }
    }
  }

  // Si no hay coincidencia específica, retornar error genérico
  return {
    code: SignInErrorCode.GENERIC,
    message: 'No se pudo iniciar sesión. Por favor, intenta de nuevo.',
  };
}

export function useSignIn() {
  const router = useRouter();

  // Estado
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<SignInErrorCode | null>(null);
  const [attemptCount, setAttemptCount] = useState(0);

  // Función principal de login
  const signIn = useCallback(
    async (credentials: SignInCredentials) => {
      // Reset error state
      setLoading(true);
      setError(null);
      setErrorCode(null);

      try {
        // Incrementar contador de intentos
        setAttemptCount((prev) => prev + 1);

        // Llamar al servicio de autenticación
        const result = await authService.signIn(credentials);

        // Si llegamos aquí, el login fue exitoso
        setAttemptCount(0); // Reset contador en éxito

        // Navegar al dashboard
        router.replace('/(tabs)/dashboard');

        return { success: true };
      } catch (err) {
        // Mapear el error a un mensaje amigable
        const mapped = mapSignInError(err);

        // Si hay muchos intentos fallidos, sobrescribir con mensaje de rate limit
        if (attemptCount >= 4) {
          setError(
            'Demasiados intentos fallidos. Espera un momento antes de intentar de nuevo.',
          );
          setErrorCode(SignInErrorCode.RATE_LIMIT);
        } else {
          setError(mapped.message);
          setErrorCode(mapped.code);
        }

        return { success: false, errorCode: mapped.code };
      } finally {
        setLoading(false);
      }
    },
    [router, attemptCount],
  );

  // Función para limpiar errores
  const clearError = useCallback(() => {
    setError(null);
    setErrorCode(null);
  }, []);

  // Función para resetear el contador de intentos
  const resetAttempts = useCallback(() => {
    setAttemptCount(0);
  }, []);

  // Helper para verificar tipo de error específico
  const isErrorType = useCallback(
    (type: SignInErrorCode): boolean => {
      return errorCode === type;
    },
    [errorCode],
  );

  return {
    // Acciones
    signIn,
    clearError,
    resetAttempts,

    // Estado
    loading,
    error,
    errorCode,
    attemptCount,

    // Helpers
    isErrorType,
    isInvalidCredentials: errorCode === SignInErrorCode.INVALID_CREDENTIALS,
    isAccountLocked: errorCode === SignInErrorCode.ACCOUNT_LOCKED,
    isEmailNotVerified: errorCode === SignInErrorCode.EMAIL_NOT_VERIFIED,
    tooManyAttempts: attemptCount >= 5,
  };
}
