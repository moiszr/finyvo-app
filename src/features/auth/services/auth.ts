// src/features/auth/services/auth.ts
import { supabase } from '@/api/supabase/supabaseClient';
import type {
  SignInCredentials,
  SignUpCredentials,
  ForgotPasswordCredentials,
  ResetPasswordCredentials,
  AuthTokens,
} from '../types';
import { buildRedirect, parseAuthCallback } from '@/utils/deeplink';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================

const AUTH_CONFIG = {
  NONCE_BYTES: 16,
  MIN_PASSWORD_LENGTH: 8,
  EMAIL_RESEND_COOLDOWN_MS: 60000, // 1 minute
  OAUTH_TIMEOUT_MS: 300000, // 5 minutes
} as const;

const ERROR_CODES = {
  DUPLICATE_EMAIL: 'DUPLICATE_EMAIL',
  OAUTH_CANCELLED: 'OAUTH_CANCELLED',
  OAUTH_TIMEOUT: 'OAUTH_TIMEOUT',
  NETWORK_ERROR: 'NETWORK_ERROR',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  EMAIL_NOT_CONFIRMED: 'EMAIL_NOT_CONFIRMED',
} as const;

// ============================================================================
// TYPES
// ============================================================================

export type ProcessAuthResult =
  | { mode: 'hash'; data: any }
  | { mode: 'pkce'; data: any }
  | {
      mode: 'otp';
      otpType: 'recovery' | 'signup' | 'email_change' | 'magiclink' | 'invite';
      data: any;
    }
  | { mode: 'none'; data: null };

export type OAuthProvider = 'apple' | 'google' | 'facebook';

export interface OAuthResult {
  success: boolean;
  user?: any;
  session?: any;
  error?: Error;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Normaliza email para consistencia
 */
const normalizeEmail = (email: string): string => {
  return email.toLowerCase().trim();
};

/**
 * Convierte bytes a hexadecimal
 */
const toHex = (bytes: Uint8Array): string => {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
};

/**
 * Genera nonce seguro para Apple Sign In
 */
const generateAppleNonce = async (): Promise<{
  raw: string;
  hashed: string;
}> => {
  try {
    const bytes = await Crypto.getRandomBytesAsync(AUTH_CONFIG.NONCE_BYTES);
    const raw = toHex(bytes);
    const hashed = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      raw,
    );
    return { raw, hashed };
  } catch {
    throw new Error('Failed to generate secure nonce for Apple Sign In');
  }
};

/**
 * Detecta si es un error de email duplicado
 */
const isDuplicateEmailError = (error: any): boolean => {
  const code = (error?.code || '').toString().toLowerCase();
  const msg = (error?.message || '').toString().toLowerCase();

  const duplicateIndicators = [
    'user_already_exists',
    'already registered',
    'already exists',
    'email already registered',
    'duplicate',
    'user already',
  ];

  return duplicateIndicators.some(
    (indicator) => code.includes(indicator) || msg.includes(indicator),
  );
};

/**
 * Detecta si la respuesta de signUp indica usuario existente
 */
const isDuplicateEmailResponse = (data: any): boolean => {
  const identities = data?.user?.identities;
  return Array.isArray(identities) && identities.length === 0;
};

/**
 * Crea un error con código personalizado
 */
const createError = (message: string, code: string): Error => {
  const error = new Error(message);
  (error as any).code = code;
  return error;
};

/**
 * Normaliza errores con mensajes amigables
 */
const normalizeError = (error: any): Error => {
  // Si ya es un error normalizado, retornarlo
  if (error?.code && Object.values(ERROR_CODES).includes(error.code)) {
    return error;
  }

  // Detectar tipo de error y crear uno normalizado
  if (isDuplicateEmailError(error)) {
    return createError(
      'Ya existe una cuenta con este email. ¿Quieres iniciar sesión?',
      ERROR_CODES.DUPLICATE_EMAIL,
    );
  }

  const msg = (error?.message || '').toLowerCase();
  const code = (error?.code || '').toLowerCase();

  // Mapeo de errores conocidos
  const errorMap: Record<string, { message: string; code: string }> = {
    'invalid login credentials': {
      message: 'Email o contraseña incorrectos',
      code: ERROR_CODES.INVALID_CREDENTIALS,
    },
    'email not confirmed': {
      message: 'Por favor confirma tu email antes de iniciar sesión',
      code: ERROR_CODES.EMAIL_NOT_CONFIRMED,
    },
    'network request failed': {
      message: 'Error de conexión. Verifica tu internet',
      code: ERROR_CODES.NETWORK_ERROR,
    },
  };

  // Buscar en el mapeo
  for (const [key, value] of Object.entries(errorMap)) {
    if (msg.includes(key) || code.includes(key)) {
      return createError(value.message, value.code);
    }
  }

  // Error genérico
  return createError(
    error?.message || 'Ha ocurrido un error inesperado',
    'UNKNOWN_ERROR',
  );
};

// ============================================================================
// OAUTH STRATEGIES
// ============================================================================

/**
 * Estrategia para Apple Sign In
 */
const appleSignInStrategy = async (): Promise<OAuthResult> => {
  try {
    // Verificar disponibilidad
    const isAvailable = await AppleAuthentication.isAvailableAsync();
    if (!isAvailable) {
      throw createError(
        'Iniciar con Apple no está disponible en este dispositivo',
        'APPLE_NOT_AVAILABLE',
      );
    }

    // Generar nonce
    const { raw: nonce, hashed: nonceHashed } = await generateAppleNonce();

    // Solicitar credenciales
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce: nonceHashed,
    });

    if (!credential.identityToken) {
      throw createError(
        'No se recibió el token de autenticación de Apple',
        'APPLE_TOKEN_MISSING',
      );
    }

    // Autenticar con Supabase
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: credential.identityToken,
      nonce, // Nonce crudo, no el hash
    });

    if (error) throw error;

    return {
      success: true,
      user: data.user,
      session: data.session,
    };
  } catch (error: any) {
    // Manejar cancelación del usuario
    if (error?.code === 'ERR_CANCELED') {
      throw createError(
        'Inicio de sesión cancelado',
        ERROR_CODES.OAUTH_CANCELLED,
      );
    }
    throw normalizeError(error);
  }
};

/**
 * Estrategia genérica para OAuth (Google/Facebook)
 */

const webOAuthStrategy = async (
  provider: 'google' | 'facebook',
  options?: { scopes?: string; queryParams?: Record<string, string> },
) => {
  try {
    const returnUrl = AuthSession.makeRedirectUri({
      path: 'callback', // 👈 unificamos aquí
      scheme: 'finyvo',
      preferLocalhost: false,
      // deja que Expo elija el triple slash según plataforma
      // (no fuerces isTripleSlashed; tu parser ya lo tolera)
    });

    if (__DEV__) console.log('[OAuth] returnUrl ->', returnUrl);

    const providerConfig = {
      google: {
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
          ...options?.queryParams,
        },
      },
      facebook: {
        scopes: options?.scopes || 'public_profile,email',
      },
    } as const;

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: returnUrl,
        skipBrowserRedirect: true,
        ...providerConfig[provider],
      },
    });
    if (error) throw error;
    if (!data?.url)
      throw new Error(`No se pudo iniciar la autenticación con ${provider}`);

    const result = await WebBrowser.openAuthSessionAsync(data.url, returnUrl);
    if (result.type === 'cancel' || result.type === 'dismiss') {
      throw createError(
        'Inicio de sesión cancelado',
        ERROR_CODES.OAUTH_CANCELLED,
      );
    }

    if (result.type === 'success' && result.url) {
      const { code, access_token, refresh_token } = parseAuthCallback(
        result.url,
      );
      if (code) {
        const { error: exErr } = await supabase.auth.exchangeCodeForSession(
          code,
        );
        if (exErr) throw exErr;
      } else if (access_token && refresh_token) {
        const { error: setErr } = await supabase.auth.setSession({
          access_token,
          refresh_token,
        });
        if (setErr) throw setErr;
      }
    }

    return { success: true };
  } catch (e) {
    throw normalizeError(e);
  }
};

// ============================================================================
// AUTH SERVICE
// ============================================================================

export const authService = {
  /**
   * Inicio de sesión con email/contraseña
   */
  async signIn({ email, password }: SignInCredentials) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizeEmail(email),
        password,
      });

      if (error) throw error;
      return data;
    } catch (error) {
      throw normalizeError(error);
    }
  },

  /**
   * Registro de usuario
   */
  async signUp({ email, password, fullName }: SignUpCredentials) {
    try {
      const normalizedEmail = normalizeEmail(email);
      const trimmedName = fullName.trim();

      // Validaciones básicas
      if (!trimmedName) {
        throw createError('El nombre es requerido', 'INVALID_NAME');
      }

      if (password.length < AUTH_CONFIG.MIN_PASSWORD_LENGTH) {
        throw createError(
          `La contraseña debe tener al menos ${AUTH_CONFIG.MIN_PASSWORD_LENGTH} caracteres`,
          'WEAK_PASSWORD',
        );
      }

      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: { full_name: trimmedName },
          emailRedirectTo: buildRedirect('/(auth)/verify-email'),
        },
      });

      // Manejar error de duplicado
      if (error) {
        if (isDuplicateEmailError(error)) {
          // Intentar reenviar verificación silenciosamente
          this.resendVerification(normalizedEmail).catch(() => {});
          throw createError(
            'Ya existe una cuenta con este email. ¿Quieres iniciar sesión?',
            ERROR_CODES.DUPLICATE_EMAIL,
          );
        }
        throw error;
      }

      // Manejar respuesta de duplicado sin error
      if (isDuplicateEmailResponse(data)) {
        this.resendVerification(normalizedEmail).catch(() => {});
        throw createError(
          'Ya existe una cuenta con este email. ¿Quieres iniciar sesión?',
          ERROR_CODES.DUPLICATE_EMAIL,
        );
      }

      return data;
    } catch (error) {
      throw normalizeError(error);
    }
  },

  /**
   * Inicio de sesión con Apple
   */
  async signInWithApple(): Promise<OAuthResult> {
    return appleSignInStrategy();
  },

  /**
   * Inicio de sesión con Google
   */
  async signInWithGoogle(): Promise<OAuthResult> {
    return webOAuthStrategy('google');
  },

  /**
   * Inicio de sesión con Facebook
   */
  async signInWithFacebook(): Promise<OAuthResult> {
    return webOAuthStrategy('facebook');
  },

  /**
   * Recuperación de contraseña
   */
  async forgotPassword({ email }: ForgotPasswordCredentials) {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        normalizeEmail(email),
        {
          redirectTo: buildRedirect('/(auth)/reset-password'),
        },
      );

      if (error) throw error;
    } catch (error) {
      throw normalizeError(error);
    }
  },

  /**
   * Procesar callback de autenticación
   */
  async processAuthCallback(url: string): Promise<ProcessAuthResult> {
    try {
      const parsed = parseAuthCallback(url);
      const { access_token, refresh_token, code, token_hash, type, email } =
        parsed;

      // Hash tokens
      if (access_token && refresh_token) {
        const { data, error } = await supabase.auth.setSession({
          access_token,
          refresh_token,
        });
        if (error) throw error;
        return { mode: 'hash', data };
      }

      // PKCE flow
      if (code) {
        const { data, error } = await supabase.auth.exchangeCodeForSession(
          code,
        );
        if (error) throw error;
        return { mode: 'pkce', data };
      }

      // OTP verification
      if (token_hash) {
        const otpType = (type as any) || 'recovery';
        const { data, error } = await supabase.auth.verifyOtp({
          type: otpType,
          token_hash,
          ...(email && { email }),
        });
        if (error) throw error;
        return { mode: 'otp', otpType, data };
      }

      return { mode: 'none', data: null };
    } catch (error) {
      throw normalizeError(error);
    }
  },

  /**
   * Reenviar email de verificación
   */
  async resendVerification(email: string) {
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: normalizeEmail(email),
      });

      if (error) throw error;
    } catch (error) {
      throw normalizeError(error);
    }
  },

  /**
   * Cerrar sesión
   */
  async signOut() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      throw normalizeError(error);
    }
  },

  /**
   * Obtener sesión actual
   */
  async getCurrentSession() {
    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();
      if (error) throw error;
      return session;
    } catch (error) {
      throw normalizeError(error);
    }
  },

  /**
   * Establecer sesión desde tokens
   */
  async setSessionFromTokens({ access_token, refresh_token }: AuthTokens) {
    try {
      const { data, error } = await supabase.auth.setSession({
        access_token,
        refresh_token,
      });
      if (error) throw error;
      return data;
    } catch (error) {
      throw normalizeError(error);
    }
  },

  /**
   * Actualizar contraseña
   */
  async updatePassword({ password }: ResetPasswordCredentials) {
    try {
      if (password.length < AUTH_CONFIG.MIN_PASSWORD_LENGTH) {
        throw createError(
          `La contraseña debe tener al menos ${AUTH_CONFIG.MIN_PASSWORD_LENGTH} caracteres`,
          'WEAK_PASSWORD',
        );
      }

      const { data, error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      return data;
    } catch (error) {
      throw normalizeError(error);
    }
  },

  /**
   * Obtener usuario actual
   */
  async getCurrentUser() {
    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();
      if (error) throw error;
      return user;
    } catch (error) {
      throw normalizeError(error);
    }
  },

  /**
   * Verificar disponibilidad de proveedores OAuth
   */
  async checkOAuthAvailability(): Promise<{
    apple: boolean;
    google: boolean;
    facebook: boolean;
  }> {
    const appleAvailable = await AppleAuthentication.isAvailableAsync().catch(
      () => false,
    );

    // Google y Facebook siempre disponibles en web auth
    return {
      apple: appleAvailable,
      google: true,
      facebook: true,
    };
  },
};
