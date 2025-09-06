// app/_layout.tsx
import React, { useEffect, useRef } from 'react';
import {
  Slot,
  SplashScreen,
  useRouter,
  useSegments,
  usePathname,
} from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

import { authService } from '@/features/auth/services/auth';
import { parseAuthCallback, isOAuthCallback } from '@/utils/deeplink';
import { useAuthStore } from '@/store/authStore';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { checkSupabaseConnection } from '@/api/supabase/supabaseClient';

// Cerrar sesiones web OAuth correctamente (Expo)
WebBrowser.maybeCompleteAuthSession();
SplashScreen.preventAutoHideAsync();

// React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: (count, e: any) =>
        e?.status === 401 || e?.status === 403 ? false : count < 3,
    },
    mutations: { retry: 1 },
  },
});

// Rutas usadas en navegación
const PATHS = {
  SIGN_IN: '/(auth)/sign-in',
  RESET_PASSWORD: '/(auth)/reset-password',
  FORGOT_PASSWORD: '/(auth)/forgot-password',
  EMAIL_VERIFIED: '/(auth)/email-verified',
  DASHBOARD: '/(tabs)/dashboard',
} as const;

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments(); // p.ej. ['(auth)', 'sign-in'] o ['(tabs)', 'dashboard']
  const pathname = usePathname(); // p.ej. '/(auth)/sign-in'

  const {
    isLoading,
    initialize,
    session,
    isRecoverySession,
    setRecoverySession,
  } = useAuthStore();

  // Flags/locks para control fino
  const isProcessingLink = useRef(false);
  const linkReadyRef = useRef(false);
  const navLock = useRef(false);
  const lastUrlRef = useRef<string | null>(null);
  const justVerifiedRef = useRef(false);

  // Navegación segura (evita spam y loops)
  const safeReplace = React.useCallback(
    (to: string, opts?: { force?: boolean }) => {
      if ((!opts?.force && navLock.current) || pathname === to) return;
      navLock.current = true;
      router.replace(to);
      setTimeout(() => (navLock.current = false), 150);
    },
    [pathname, router],
  );

  // Deep link actual
  const url = Linking.useLinkingURL();

  /**
   * 1) Deep links SOLO para OTP (recovery/verify).
   *    Los callbacks OAuth (code/hash) los maneja webOAuthStrategy.
   */
  useEffect(() => {
    if (!url) {
      linkReadyRef.current = true;
      return;
    }
    if (lastUrlRef.current === url) {
      linkReadyRef.current = true;
      return;
    }
    lastUrlRef.current = url;

    if (isOAuthCallback(url)) {
      linkReadyRef.current = true;
      return;
    }

    const parsed = parseAuthCallback(url);
    const isRecoveryLink = !!parsed.token_hash && parsed.type === 'recovery';
    const isSignupVerifyLink = !!parsed.token_hash && parsed.type === 'signup';

    if (!isRecoveryLink && !isSignupVerifyLink) {
      linkReadyRef.current = true;
      return;
    }

    (async () => {
      try {
        isProcessingLink.current = true;

        const result = await authService.processAuthCallback(url);

        if (isRecoveryLink && result.mode === 'otp') {
          setRecoverySession(true);
          safeReplace(PATHS.RESET_PASSWORD, { force: true });
          return;
        }

        if (isSignupVerifyLink && result.mode === 'otp') {
          // Manda a /email-verified y limpia el flag enseguida para evitar rebotes
          justVerifiedRef.current = true;
          safeReplace(PATHS.EMAIL_VERIFIED, { force: true });
          setTimeout(() => {
            justVerifiedRef.current = false;
          }, 0);
          return;
        }
      } catch {
        if (isSignupVerifyLink) {
          safeReplace(PATHS.SIGN_IN, { force: true });
        } else if (isRecoveryLink) {
          safeReplace(PATHS.FORGOT_PASSWORD, { force: true });
        }
      } finally {
        isProcessingLink.current = false;
        linkReadyRef.current = true;
      }
    })();
  }, [url, setRecoverySession, pathname, safeReplace]);

  /**
   * 2) Guardas de navegación centrales
   */
  useEffect(() => {
    // Esperar: (a) no cargar, (b) deep link evaluado, (c) no procesando link
    if (isLoading || !linkReadyRef.current || isProcessingLink.current) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inReset = segments.includes('reset-password');
    const inForgot = segments.includes('forgot-password');
    const inVerifyEmail = segments.includes('verify-email');
    const inEmailVerified = segments.includes('email-verified');

    // Recovery → forzar reset-password
    if (isRecoverySession && !inReset) {
      safeReplace(PATHS.RESET_PASSWORD, { force: true });
      return;
    }
    if (inReset || inForgot) return;

    // Con sesión: fuera de (auth) excepto verify/email-verified
    const authException = inVerifyEmail || inEmailVerified;
    if (session) {
      if (inAuthGroup && !authException) {
        safeReplace(PATHS.DASHBOARD);
      }
      return;
    }

    // Sin sesión y fuera de (auth) → ir a sign-in
    if (!inAuthGroup && segments.length > 0) {
      safeReplace(PATHS.SIGN_IN);
    }
  }, [session, isLoading, segments, isRecoverySession, pathname, safeReplace]);

  /**
   * 3) Boot: check conexión + init store + ocultar splash
   */
  useEffect(() => {
    (async () => {
      try {
        await checkSupabaseConnection();
        await initialize();
      } finally {
        await SplashScreen.hideAsync();
      }
    })();
  }, [initialize]);

  if (isLoading) return <LoadingScreen message="Iniciando FINYVO..." />;

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <StatusBar style="auto" />
        <Slot />
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
