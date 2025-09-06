// src/features/auth/hooks/useResetPassword.ts
import { useEffect, useState, useCallback } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/api/supabase/supabaseClient';
import { useAuthStore } from '@/store/authStore';
import type { ResetPasswordCredentials } from '../types';

type ResetOptions = {
  /** Navegar automáticamente a Sign In al terminar */
  autoNavigate?: boolean;
  /** Cerrar sesión inmediatamente tras actualizar la contraseña */
  signOutAfter?: boolean;
};

// Compat: exponemos tanto ok como success para no romper código previo
type ResetResult =
  | { ok: true; success: true }
  | { ok: false; success: false; message?: string };

export function useResetPassword() {
  const [loading, setLoading] = useState(false);
  const [booting, setBooting] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tokensProcessed, setTokensProcessed] = useState(false);

  const router = useRouter();
  const { token_hash, type } = useLocalSearchParams<{
    token_hash?: string;
    type?: string;
  }>();

  const {
    isRecoverySession,
    clearRecoveryAndSignOut, // limpia flags del store + signOut local
  } = useAuthStore();

  /**
   * Boot: validar si ya hay sesión de recuperación o si llega token_hash en URL.
   * Mantiene la semántica de tokensProcessed/booting/error.
   */
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { data, error: sErr } = await supabase.auth.getSession();
        if (sErr) throw sErr;

        // A) Ya hay sesión y estamos en modo recovery → OK, no re-verificar OTP
        if (data.session && isRecoverySession) {
          if (!cancelled) {
            setTokensProcessed(true);
            setError(null);
          }
          return;
        }

        // B) No hay sesión pero viene token de recovery → verificar OTP
        if (!data.session && token_hash && type === 'recovery') {
          const { data: vData, error: vErr } = await supabase.auth.verifyOtp({
            type: 'recovery',
            token_hash,
          });
          if (vErr) {
            if (!cancelled)
              setError('Enlace inválido o expirado. Solicita uno nuevo.');
            return;
          }
          if (vData.session && !cancelled) {
            setTokensProcessed(true);
            setError(null);
          }
          return;
        }

        // C) Ni sesión ni token válido → error
        if (!cancelled)
          setError('Enlace inválido o expirado. Solicita uno nuevo.');
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? 'Error verificando sesión');
      } finally {
        if (!cancelled) setBooting(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isRecoverySession, token_hash, type]);

  /**
   * Actualiza la contraseña. Por defecto NO navega ni cierra sesión, para que el formulario
   * pueda mostrar la animación y controlar el timing del redirect.
   * Puedes cambiarlo con `opts` (autoNavigate / signOutAfter).
   */
  const resetPassword = useCallback(
    async (
      { password, confirmPassword }: ResetPasswordCredentials,
      opts: ResetOptions = { autoNavigate: false, signOutAfter: false },
    ): Promise<ResetResult> => {
      setLoading(true);
      setError(null);

      try {
        // Validaciones mínimas
        if (!password || !confirmPassword)
          throw new Error('Completa ambos campos');
        if (password !== confirmPassword)
          throw new Error('Las contraseñas no coinciden');
        if (password.length < 8)
          throw new Error('La contraseña debe tener al menos 8 caracteres');

        // Actualizar en Supabase
        const { error: updErr } = await supabase.auth.updateUser({ password });
        if (updErr) throw updErr;

        // Opcional: cerrar sesión inmediatamente para evitar que el guard te lleve al dashboard
        if (opts.signOutAfter) {
          await clearRecoveryAndSignOut();
        }

        // Opcional: navegar ya mismo a Sign In (el form usualmente lo controla)
        if (opts.autoNavigate) {
          router.replace('/(auth)/sign-in');
        }

        return { ok: true, success: true };
      } catch (e: any) {
        const message = e?.message ?? 'Error actualizando contraseña';
        setError(message);
        return { ok: false, success: false, message };
      } finally {
        setLoading(false);
      }
    },
    [clearRecoveryAndSignOut, router],
  );

  const redirectToForgotPassword = useCallback(() => {
    router.replace('/(auth)/forgot-password');
  }, [router]);

  return {
    // acciones
    resetPassword,
    redirectToForgotPassword,
    clearError: () => setError(null),

    // estados
    loading,
    booting,
    error,
    tokensProcessed,
    isRecoverySession,

    // utilidad: para que el form cierre sesión justo antes de redirigir
    signOutForReset: clearRecoveryAndSignOut,
  };
}
