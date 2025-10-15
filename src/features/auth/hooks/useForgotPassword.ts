// src/features/auth/hooks/useForgotPassword.ts
import { useState, useCallback } from 'react';
import { authService } from '../services/auth';
import type { ForgotPasswordCredentials } from '../types';

// Tipos de error específicos
export enum ForgotPasswordErrorCode {
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  INVALID_EMAIL = 'INVALID_EMAIL',
  RATE_LIMIT = 'RATE_LIMIT',
  NETWORK_ERROR = 'NETWORK_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  GENERIC = 'GENERIC',
}

interface ErrorMapping {
  code: ForgotPasswordErrorCode;
  message: string;
  patterns: RegExp[];
}

// Configuración de mapeo de errores
const ERROR_MAPPINGS: ErrorMapping[] = [
  {
    code: ForgotPasswordErrorCode.USER_NOT_FOUND,
    message:
      'No encontramos una cuenta con ese email. Verifica e intenta de nuevo.',
    patterns: [
      /user.*not.*found/i,
      /no.*user.*email/i,
      /usuario.*no.*encontrado/i,
      /email.*not.*registered/i,
      /account.*not.*exist/i,
    ],
  },
  {
    code: ForgotPasswordErrorCode.INVALID_EMAIL,
    message: 'El formato del email no es válido.',
    patterns: [
      /invalid.*email/i,
      /email.*invalid/i,
      /correo.*inválido/i,
      /malformed.*email/i,
    ],
  },
  {
    code: ForgotPasswordErrorCode.RATE_LIMIT,
    message:
      'Demasiadas solicitudes. Por favor, espera unos minutos antes de intentar de nuevo.',
    patterns: [
      /rate.*limit/i,
      /too.*many.*request/i,
      /demasiados.*intentos/i,
      /throttle/i,
      /exceeded.*limit/i,
    ],
  },
  {
    code: ForgotPasswordErrorCode.NETWORK_ERROR,
    message: 'Error de conexión. Verifica tu internet e intenta de nuevo.',
    patterns: [
      /network.*error/i,
      /connection.*failed/i,
      /fetch.*failed/i,
      /no.*internet/i,
      /offline/i,
    ],
  },
  {
    code: ForgotPasswordErrorCode.SERVICE_UNAVAILABLE,
    message: 'El servicio de email no está disponible. Intenta más tarde.',
    patterns: [
      /service.*unavailable/i,
      /email.*service.*down/i,
      /smtp.*error/i,
      /mail.*server.*error/i,
    ],
  },
];

// Función pura para mapear errores
function mapForgotPasswordError(error: any): {
  code: ForgotPasswordErrorCode;
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

  // Error genérico si no hay coincidencia
  return {
    code: ForgotPasswordErrorCode.GENERIC,
    message: 'No se pudo enviar el email. Por favor, intenta de nuevo.',
  };
}

// Resultado tipado de la operación
export interface SendResetEmailResult {
  success: boolean;
  errorCode?: ForgotPasswordErrorCode;
}

export function useForgotPassword() {
  // Estado principal
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<ForgotPasswordErrorCode | null>(
    null,
  );
  const [emailSent, setEmailSent] = useState(false);

  // Estado adicional para rate limiting local
  const [lastRequestTime, setLastRequestTime] = useState<number>(0);
  const [requestCount, setRequestCount] = useState(0);

  // Función principal para enviar email de reset
  const sendResetEmail = useCallback(
    async (
      credentials: ForgotPasswordCredentials,
    ): Promise<SendResetEmailResult> => {
      // Verificar rate limiting local
      const now = Date.now();
      const timeSinceLastRequest = now - lastRequestTime;

      // Si han pasado menos de 30 segundos desde el último intento
      if (timeSinceLastRequest < 30000 && requestCount >= 3) {
        const waitTime = Math.ceil((30000 - timeSinceLastRequest) / 1000);
        setError(`Espera ${waitTime} segundos antes de intentar de nuevo.`);
        setErrorCode(ForgotPasswordErrorCode.RATE_LIMIT);
        return {
          success: false,
          errorCode: ForgotPasswordErrorCode.RATE_LIMIT,
        };
      }

      // Reset estado
      setLoading(true);
      setError(null);
      setErrorCode(null);

      try {
        // Llamar al servicio
        await authService.forgotPassword(credentials);

        // Éxito
        setEmailSent(true);
        setRequestCount(0); // Reset contador en éxito
        setLastRequestTime(now);

        return { success: true };
      } catch (err) {
        // Mapear error
        const mapped = mapForgotPasswordError(err);

        // Actualizar estado de error
        setError(mapped.message);
        setErrorCode(mapped.code);

        // Incrementar contador de intentos
        setRequestCount((prev) => prev + 1);
        setLastRequestTime(now);

        return {
          success: false,
          errorCode: mapped.code,
        };
      } finally {
        setLoading(false);
      }
    },
    [lastRequestTime, requestCount],
  );

  // Función para resetear el estado (cuando el usuario quiere intentar con otro email)
  const reset = useCallback(() => {
    setEmailSent(false);
    setError(null);
    setErrorCode(null);
    // No reseteamos requestCount ni lastRequestTime para mantener rate limiting
  }, []);

  // Función para limpiar solo el error
  const clearError = useCallback(() => {
    setError(null);
    setErrorCode(null);
  }, []);

  // Helper para verificar tipo de error específico
  const isErrorType = useCallback(
    (type: ForgotPasswordErrorCode): boolean => {
      return errorCode === type;
    },
    [errorCode],
  );

  // Helper para obtener tiempo de espera restante
  const getWaitTime = useCallback((): number => {
    if (requestCount < 3) return 0;

    const timePassed = Date.now() - lastRequestTime;
    const waitTime = Math.max(0, 30000 - timePassed);
    return Math.ceil(waitTime / 1000);
  }, [requestCount, lastRequestTime]);

  return {
    // Acciones
    sendResetEmail,
    reset,
    clearError,

    // Estado
    loading,
    error,
    errorCode,
    emailSent,
    requestCount,

    // Helpers
    isErrorType,
    getWaitTime,
    canRetry: getWaitTime() === 0,
    isUserNotFound: errorCode === ForgotPasswordErrorCode.USER_NOT_FOUND,
    isRateLimited: errorCode === ForgotPasswordErrorCode.RATE_LIMIT,
  };
}
