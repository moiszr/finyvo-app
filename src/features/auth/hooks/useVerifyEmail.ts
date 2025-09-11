// src/features/auth/hooks/useVerifyEmail.ts
import { useState, useCallback, useEffect, useRef } from 'react';
import { authService } from '../services/auth';

// Tipos
export enum VerifyEmailErrorCode {
  INVALID_EMAIL = 'INVALID_EMAIL',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  ALREADY_VERIFIED = 'ALREADY_VERIFIED',
  RATE_LIMIT = 'RATE_LIMIT',
  NETWORK_ERROR = 'NETWORK_ERROR',
  GENERIC = 'GENERIC',
}

interface ErrorMapping {
  code: VerifyEmailErrorCode;
  message: string;
  patterns: RegExp[];
}

// Configuración
const COOLDOWN_DURATION = 45; // segundos
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Mapeo de errores
const ERROR_MAPPINGS: ErrorMapping[] = [
  {
    code: VerifyEmailErrorCode.INVALID_EMAIL,
    message: 'El formato del email no es válido.',
    patterns: [/invalid.*email/i, /email.*invalid/i, /malformed.*email/i],
  },
  {
    code: VerifyEmailErrorCode.USER_NOT_FOUND,
    message: 'No encontramos una cuenta con ese email.',
    patterns: [/user.*not.*found/i, /no.*user/i, /account.*not.*exist/i],
  },
  {
    code: VerifyEmailErrorCode.ALREADY_VERIFIED,
    message: 'Este email ya está verificado.',
    patterns: [/already.*verified/i, /email.*confirmed/i, /ya.*verificado/i],
  },
  {
    code: VerifyEmailErrorCode.RATE_LIMIT,
    message: 'Demasiados intentos. Espera un momento antes de reenviar.',
    patterns: [/rate.*limit/i, /too.*many/i, /throttle/i],
  },
  {
    code: VerifyEmailErrorCode.NETWORK_ERROR,
    message: 'Error de conexión. Verifica tu internet.',
    patterns: [/network.*error/i, /connection.*failed/i, /offline/i],
  },
];

// Función pura para mapear errores
function mapVerifyEmailError(error: any): {
  code: VerifyEmailErrorCode;
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
        return {
          code: mapping.code,
          message: mapping.message,
        };
      }
    }
  }

  return {
    code: VerifyEmailErrorCode.GENERIC,
    message: 'No se pudo enviar el email. Intenta de nuevo.',
  };
}

// Función para enmascarar email
function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return email;

  const [username, domain] = email.split('@');
  if (!username || username.length <= 2) return email;

  const firstChar = username[0];
  const lastChar = username[username.length - 1];
  const masked = `${firstChar}${'*'.repeat(Math.min(3, username.length - 2))}${lastChar}`;

  return `${masked}@${domain}`;
}

export function useVerifyEmail(initialEmail?: string) {
  // Estado principal
  const [email, setEmail] = useState(initialEmail || '');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<VerifyEmailErrorCode | null>(null);
  const [cooldown, setCooldown] = useState(0);

  // Referencias
  const cooldownInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSentTime = useRef<number>(0);
  const sendCount = useRef<number>(0);

  // Cleanup del intervalo cuando se desmonta
  useEffect(() => {
    return () => {
      if (cooldownInterval.current) {
        clearInterval(cooldownInterval.current);
      }
    };
  }, []);

  // Validar email
  const validateEmail = useCallback((emailToValidate: string): boolean => {
    const trimmed = emailToValidate.trim();
    return EMAIL_PATTERN.test(trimmed);
  }, []);

  // Normalizar email
  const normalizeEmail = useCallback((emailToNormalize: string): string => {
    return emailToNormalize.trim().toLowerCase();
  }, []);

  // Función principal para reenviar
  const resend = useCallback(async () => {
    // Validaciones previas
    if (!email || sending || cooldown > 0) {
      return { success: false };
    }

    const normalizedEmail = normalizeEmail(email);

    // Validar formato
    if (!validateEmail(normalizedEmail)) {
      setError('Email inválido');
      setErrorCode(VerifyEmailErrorCode.INVALID_EMAIL);
      return { success: false };
    }

    // Rate limiting adicional
    const now = Date.now();
    const timeSinceLastSent = now - lastSentTime.current;

    // Si se han enviado muchos en poco tiempo
    if (sendCount.current >= 3 && timeSinceLastSent < 300000) {
      // 5 minutos
      setError('Has alcanzado el límite de reenvíos. Intenta más tarde.');
      setErrorCode(VerifyEmailErrorCode.RATE_LIMIT);
      return { success: false };
    }

    setSending(true);
    setError(null);
    setErrorCode(null);
    setSent(false);

    try {
      await authService.resendVerification(normalizedEmail);

      // Éxito
      setSent(true);
      sendCount.current += 1;
      lastSentTime.current = now;

      // Iniciar cooldown
      setCooldown(COOLDOWN_DURATION);

      // Limpiar intervalo previo si existe
      if (cooldownInterval.current) {
        clearInterval(cooldownInterval.current);
      }

      // Nuevo intervalo
      cooldownInterval.current = setInterval(() => {
        setCooldown((prev) => {
          if (prev <= 1) {
            if (cooldownInterval.current) {
              clearInterval(cooldownInterval.current);
              cooldownInterval.current = null;
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // Reset mensaje de éxito después de 5 segundos
      setTimeout(() => setSent(false), 5000);

      return { success: true };
    } catch (err) {
      const mapped = mapVerifyEmailError(err);
      setError(mapped.message);
      setErrorCode(mapped.code);
      return { success: false, errorCode: mapped.code };
    } finally {
      setSending(false);
    }
  }, [email, sending, cooldown, normalizeEmail, validateEmail]);

  // Limpiar error
  const clearError = useCallback(() => {
    setError(null);
    setErrorCode(null);
  }, []);

  // Reset completo
  const reset = useCallback(() => {
    setSent(false);
    setError(null);
    setErrorCode(null);
    setCooldown(0);
    sendCount.current = 0;

    if (cooldownInterval.current) {
      clearInterval(cooldownInterval.current);
      cooldownInterval.current = null;
    }
  }, []);

  // Helper para verificar tipo de error
  const isErrorType = useCallback(
    (type: VerifyEmailErrorCode): boolean => {
      return errorCode === type;
    },
    [errorCode],
  );

  // Actualizar email con normalización
  const updateEmail = useCallback(
    (newEmail: string) => {
      setEmail(newEmail);
      // Limpiar estados cuando cambia el email
      if (error) clearError();
      if (sent) setSent(false);
    },
    [error, sent, clearError],
  );

  return {
    // Estado
    email,
    sending,
    sent,
    error,
    errorCode,
    cooldown,

    // Acciones
    setEmail: updateEmail,
    resend,
    clearError,
    reset,

    // Helpers
    maskEmail: maskEmail(email),
    validateEmail,
    normalizeEmail,
    isErrorType,
    canResend: !!email && validateEmail(email) && !sending && cooldown <= 0,
    isRateLimited: errorCode === VerifyEmailErrorCode.RATE_LIMIT,
    isAlreadyVerified: errorCode === VerifyEmailErrorCode.ALREADY_VERIFIED,
  };
}
