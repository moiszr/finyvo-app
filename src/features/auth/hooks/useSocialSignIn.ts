// src/features/auth/hooks/useSocialSignIn.ts
import { useRef, useState, useCallback, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { supabase } from '@/api/supabase/supabaseClient';
import { authService, type OAuthResult } from '../services/auth';
import type { AuthChangeEvent } from '@supabase/supabase-js';

// ============================================================================
// TYPES
// ============================================================================

export type SocialProvider = 'apple' | 'google' | 'facebook';

export interface SocialSignInState {
  loading: SocialProvider | null;
  error: string | null;
  isProcessing: boolean;
}

export interface SocialSignInActions {
  signInWithApple: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithFacebook: () => Promise<void>;
  signInWithProvider: (provider: SocialProvider) => Promise<void>;
  clearError: () => void;
  reset: () => void;
}

export interface UseSocialSignInReturn
  extends SocialSignInState,
    SocialSignInActions {
  isLoading: (provider: SocialProvider) => boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const ROUTES = {
  DASHBOARD: '/(tabs)/dashboard',
  LOGIN: '/(auth)/login',
} as const;

const AUTH_EVENTS = {
  SIGNED_IN: 'SIGNED_IN',
  SIGNED_OUT: 'SIGNED_OUT',
  TOKEN_REFRESHED: 'TOKEN_REFRESHED',
  USER_UPDATED: 'USER_UPDATED',
} as const;

const ERROR_MESSAGES: Record<SocialProvider, string> = {
  apple: 'No se pudo iniciar sesión con Apple',
  google: 'No se pudo iniciar sesión con Google',
  facebook: 'No se pudo iniciar sesión con Facebook',
};

// ============================================================================
// HOOK
// ============================================================================

export function useSocialSignIn(): UseSocialSignInReturn {
  const router = useRouter();

  // Estado
  const [state, setState] = useState<SocialSignInState>({
    loading: null,
    error: null,
    isProcessing: false,
  });

  // Referencias para cleanup
  const authListenerRef = useRef<(() => void) | null>(null);
  const isMountedRef = useRef(true);
  const navigationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Limpia el listener de autenticación
   */
  const cleanupAuthListener = useCallback(() => {
    if (authListenerRef.current) {
      authListenerRef.current();
      authListenerRef.current = null;
    }
  }, []);

  /**
   * Limpia el timeout de navegación
   */
  const cleanupNavigationTimeout = useCallback(() => {
    if (navigationTimeoutRef.current) {
      clearTimeout(navigationTimeoutRef.current);
      navigationTimeoutRef.current = null;
    }
  }, []);

  // ============================================================================
  // LIFECYCLE
  // ============================================================================

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      cleanupAuthListener();
      cleanupNavigationTimeout();
    };
  }, [cleanupNavigationTimeout, cleanupAuthListener]);

  // ============================================================================
  // HELPERS
  // ============================================================================

  /**
   * Actualiza el estado de manera segura (solo si el componente está montado)
   */
  const safeSetState = useCallback((updates: Partial<SocialSignInState>) => {
    if (isMountedRef.current) {
      setState((prev) => ({ ...prev, ...updates }));
    }
  }, []);

  /**
   * Navega al dashboard con debounce para evitar navegaciones múltiples
   */
  const navigateToDashboard = useCallback(() => {
    cleanupNavigationTimeout();

    // Pequeño delay para asegurar que el estado se ha actualizado
    navigationTimeoutRef.current = setTimeout(() => {
      if (isMountedRef.current) {
        router.replace(ROUTES.DASHBOARD);
      }
    }, 100);
  }, [router, cleanupNavigationTimeout]);

  /**
   * Configura un listener de autenticación de un solo uso
   */
  const setupOneShotAuthListener = useCallback(() => {
    // Limpia cualquier listener previo
    cleanupAuthListener();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, session) => {
      // Solo procesar si es un SIGNED_IN con sesión válida
      if (event === AUTH_EVENTS.SIGNED_IN && session) {
        // Desuscribirse inmediatamente
        subscription.unsubscribe();
        authListenerRef.current = null;

        // Navegar al dashboard
        navigateToDashboard();

        // Limpiar estado de carga
        safeSetState({ loading: null, isProcessing: false });
      }
    });

    authListenerRef.current = () => subscription.unsubscribe();
  }, [navigateToDashboard, safeSetState, cleanupAuthListener]);

  /**
   * Maneja errores de autenticación
   */
  const handleAuthError = useCallback(
    (error: any, provider: SocialProvider) => {
      // No mostrar error si fue cancelación del usuario
      if (error?.code === 'OAUTH_CANCELLED') {
        safeSetState({ loading: null, isProcessing: false });
        return;
      }

      const errorMessage = error?.message || ERROR_MESSAGES[provider];
      safeSetState({
        error: errorMessage,
        loading: null,
        isProcessing: false,
      });

      // Limpiar el listener si hubo error
      cleanupAuthListener();
    },
    [safeSetState, cleanupAuthListener],
  );

  /**
   * Maneja el resultado exitoso de autenticación
   */
  const handleAuthSuccess = useCallback(
    (result: OAuthResult, provider: SocialProvider) => {
      // Apple devuelve sesión directamente
      if (provider === 'apple' && result.session) {
        navigateToDashboard();
        safeSetState({ loading: null, isProcessing: false });
      }
      // Google/Facebook esperan el callback
      // El listener manejará la navegación
    },
    [navigateToDashboard, safeSetState],
  );

  // ============================================================================
  // SIGN IN METHODS
  // ============================================================================

  /**
   * Inicia sesión con Apple (nativo)
   */
  const signInWithApple = useCallback(async () => {
    if (state.loading || state.isProcessing) return;

    try {
      safeSetState({
        loading: 'apple',
        error: null,
        isProcessing: true,
      });

      const result = await authService.signInWithApple();
      handleAuthSuccess(result, 'apple');
    } catch (error: any) {
      handleAuthError(error, 'apple');
    }
  }, [
    state.loading,
    state.isProcessing,
    safeSetState,
    handleAuthSuccess,
    handleAuthError,
  ]);

  /**
   * Inicia sesión con Google (OAuth web)
   */
  const signInWithGoogle = useCallback(async () => {
    if (state.loading || state.isProcessing) return;

    try {
      safeSetState({
        loading: 'google',
        error: null,
        isProcessing: true,
      });

      // Configurar listener antes de iniciar OAuth
      setupOneShotAuthListener();

      console.log('[DEBUG] Starting Google sign in');
      const result = await authService.signInWithGoogle();

      // Si no fue exitoso, limpiar
      if (!result.success) {
        cleanupAuthListener();
        safeSetState({ loading: null, isProcessing: false });
      }
    } catch (error: any) {
      handleAuthError(error, 'google');
    } finally {
      // Si ya estás en otra pantalla (dashboard), esto no molesta;
      // si no se disparó el listener por alguna razón, desbloquea el botón.
      // (Opcional) podrías checar aquí si ya hay sesión:
      // const { data: { session } } = await supabase.auth.getSession();
      // if (session) safeSetState({ loading: null, isProcessing: false });
    }
  }, [
    state.loading,
    state.isProcessing,
    safeSetState,
    setupOneShotAuthListener,
    cleanupAuthListener,
    handleAuthError,
  ]);

  /**
   * Inicia sesión con Facebook (OAuth web)
   */
  const signInWithFacebook = useCallback(async () => {
    if (state.loading || state.isProcessing) return;

    try {
      safeSetState({
        loading: 'facebook',
        error: null,
        isProcessing: true,
      });

      // Configurar listener antes de iniciar OAuth
      setupOneShotAuthListener();

      const result = await authService.signInWithFacebook();

      // Si no fue exitoso, limpiar
      if (!result.success) {
        cleanupAuthListener();
        safeSetState({ loading: null, isProcessing: false });
      }
    } catch (error: any) {
      handleAuthError(error, 'facebook');
    } finally {
      // Si ya estás en otra pantalla (dashboard), esto no molesta;
      // si no se disparó el listener por alguna razón, desbloquea el botón.
      // (Opcional) podrías checar aquí si ya hay sesión:
      // const { data: { session } } = await supabase.auth.getSession();
      // if (session) safeSetState({ loading: null, isProcessing: false });
    }
  }, [
    state.loading,
    state.isProcessing,
    safeSetState,
    setupOneShotAuthListener,
    cleanupAuthListener,
    handleAuthError,
  ]);

  /**
   * Método genérico para iniciar sesión con cualquier proveedor
   */
  const signInWithProvider = useCallback(
    async (provider: SocialProvider) => {
      const methods = {
        apple: signInWithApple,
        google: signInWithGoogle,
        facebook: signInWithFacebook,
      };

      const method = methods[provider];
      if (method) {
        await method();
      } else {
        safeSetState({
          error: `Proveedor ${provider} no soportado`,
        });
      }
    },
    [signInWithApple, signInWithGoogle, signInWithFacebook, safeSetState],
  );

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Limpia el error actual
   */
  const clearError = useCallback(() => {
    safeSetState({ error: null });
  }, [safeSetState]);

  /**
   * Resetea todo el estado del hook
   */
  const reset = useCallback(() => {
    cleanupAuthListener();
    cleanupNavigationTimeout();
    safeSetState({
      loading: null,
      error: null,
      isProcessing: false,
    });
  }, [safeSetState, cleanupAuthListener, cleanupNavigationTimeout]);

  /**
   * Verifica si un proveedor específico está cargando
   */
  const isLoading = useCallback(
    (provider: SocialProvider): boolean => {
      return state.loading === provider;
    },
    [state.loading],
  );

  // ============================================================================
  // RETURN
  // ============================================================================

  return {
    // Estado
    loading: state.loading,
    error: state.error,
    isProcessing: state.isProcessing,

    // Métodos de autenticación
    signInWithApple,
    signInWithGoogle,
    signInWithFacebook,
    signInWithProvider,

    // Utilidades
    clearError,
    reset,
    isLoading,
  };
}
