// src/features/auth/components/ResetPasswordForm.tsx
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
  Easing,
  TextInput,
} from 'react-native';
import { Button, Input, LoadingScreen } from '@/components/ui';
import { useResetPassword } from '../hooks/useResetPassword';
import type { ResetPasswordCredentials } from '../types';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import { colors, spacing } from '@/themes/index';

const CIRCLE = 86;
const AUTO_REDIRECT_MS = 3000;
const INVALID_DEBOUNCE_MS = 250; // evita destello de "enlace inválido"

export function ResetPasswordForm() {
  const router = useRouter();
  const { setRecoverySession } = useAuthStore(); // libera la guarda global

  // -------------------------
  // State
  // -------------------------
  const [credentials, setCredentials] = useState<ResetPasswordCredentials>({
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<Partial<ResetPasswordCredentials>>({});
  const [success, setSuccess] = useState(false);

  // Inputs refs
  const passRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  // Lógica de reset (usa la versión del hook que NO navega automáticamente)
  const {
    resetPassword,
    loading,
    error,
    tokensProcessed,
    clearError,
    booting,
    signOutForReset, // <- importante para que RootGuard no te mande al dashboard
  } = useResetPassword();

  // Debounce para no mostrar "enlace inválido" por un parpadeo
  const [invalidDelay, setInvalidDelay] = useState(true);
  useEffect(() => {
    if (!booting) {
      const t = setTimeout(() => setInvalidDelay(false), INVALID_DEBOUNCE_MS);
      return () => clearTimeout(t);
    } else {
      setInvalidDelay(true);
    }
  }, [booting]);

  // Flags de UI
  const showLoading = booting;
  const showInvalid = useMemo(
    () => !invalidDelay && !!error && !tokensProcessed && !success,
    [invalidDelay, error, tokensProcessed, success],
  );

  // -------------------------
  // Animación de éxito
  // -------------------------
  const checkPop = useRef(new Animated.Value(0)).current;
  const ripple1 = useRef(new Animated.Value(0)).current;
  const ripple2 = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(0)).current;
  const redirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!success) return;

    // Limpia recovery y cierra sesión ANTES del redirect (y ANTES de que el guard intervenga)
    (async () => {
      try {
        setRecoverySession(false); // suelta la guarda de /reset-password
        await signOutForReset(); // evita que te envíe al dashboard
      } catch {}
    })();

    // Reset & start anims
    checkPop.setValue(0);
    ripple1.setValue(0);
    ripple2.setValue(0);
    fade.setValue(0);

    const popAnim = Animated.spring(checkPop, {
      toValue: 1,
      friction: 6,
      tension: 120,
      useNativeDriver: true,
    });
    const showText = Animated.timing(fade, {
      toValue: 1,
      duration: 260,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    });
    const loop1 = Animated.loop(
      Animated.timing(ripple1, {
        toValue: 1,
        duration: 1600,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
        isInteraction: false,
      }),
    );
    const loop2 = Animated.loop(
      Animated.timing(ripple2, {
        toValue: 1,
        duration: 2000,
        delay: 120,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
        isInteraction: false,
      }),
    );

    popAnim.start();
    loop1.start();
    loop2.start();
    showText.start();

    // Redirect a Sign In en 3s
    redirectTimerRef.current = setTimeout(() => {
      router.replace('/(auth)/sign-in');
    }, AUTO_REDIRECT_MS);

    return () => {
      loop1.stop();
      loop2.stop();
      if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current);
    };
  }, [
    success,
    router,
    setRecoverySession,
    signOutForReset,
    checkPop,
    ripple1,
    ripple2,
    fade,
  ]);

  // -------------------------
  // Validación y handlers (estilo Login)
  // -------------------------
  const setField = useCallback(
    (k: keyof ResetPasswordCredentials, v: string) => {
      setCredentials((prev) => ({ ...prev, [k]: v }));
      if (errors[k]) setErrors((prev) => ({ ...prev, [k]: undefined }));
      if (error) clearError();
    },
    [errors, error, clearError],
  );

  const validateForm = useCallback((): boolean => {
    const e: Partial<ResetPasswordCredentials> = {};
    const p = credentials.password.trim();
    const c = credentials.confirmPassword.trim();

    if (!p) e.password = 'Ingresa una contraseña';
    else if (p.length < 8) e.password = 'Mínimo 8 caracteres';

    if (!c) e.confirmPassword = 'Confirma tu contraseña';
    else if (p !== c) e.confirmPassword = 'Las contraseñas no coinciden';

    setErrors(e);
    return Object.keys(e).length === 0;
  }, [credentials]);

  const handleSubmit = useCallback(async () => {
    clearError();
    if (!validateForm()) return;

    try {
      const res = await resetPassword(credentials);
      if (res.ok) setSuccess(true); // mostramos animación; el redirect lo maneja el efecto
    } catch {
      // el hook ya setea `error`
    }
  }, [credentials, validateForm, resetPassword, clearError]);

  // Interpolaciones (solo si success)
  const rippleScale1 = ripple1.interpolate({
    inputRange: [0, 1],
    outputRange: [0.6, 2.0],
  });
  const rippleOpacity1 = ripple1.interpolate({
    inputRange: [0, 1],
    outputRange: [0.25, 0],
  });
  const rippleScale2 = ripple2.interpolate({
    inputRange: [0, 1],
    outputRange: [0.6, 2.4],
  });
  const rippleOpacity2 = ripple2.interpolate({
    inputRange: [0, 1],
    outputRange: [0.18, 0],
  });

  // -------------------------
  // Render (estructura igual a Login)
  // -------------------------
  if (showLoading) return <LoadingScreen message="Verificando enlace..." />;

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.main}>
          {/* ======= Header ======= */}
          <View style={styles.header}>
            {showInvalid ? (
              <View
                style={[
                  styles.logoCircle,
                  { backgroundColor: colors.error.bg },
                ]}
              >
                <Ionicons
                  name="alert-circle"
                  size={28}
                  color={colors.error.fg}
                />
              </View>
            ) : success ? (
              // Éxito: solo animación (sin icono de candado)
              <View style={styles.animBox} pointerEvents="none">
                <Animated.View
                  style={[
                    styles.ripple,
                    {
                      transform: [{ scale: rippleScale1 }],
                      opacity: rippleOpacity1,
                    },
                  ]}
                />
                <Animated.View
                  style={[
                    styles.ripple,
                    {
                      transform: [{ scale: rippleScale2 }],
                      opacity: rippleOpacity2,
                    },
                  ]}
                />
                <Animated.View
                  style={[
                    styles.checkCircle,
                    { transform: [{ scale: checkPop }] },
                  ]}
                >
                  <Ionicons
                    name="checkmark"
                    size={34}
                    color={colors.raw.white}
                  />
                </Animated.View>
              </View>
            ) : (
              // Form: icono de candado
              <View style={styles.logoCircle}>
                <Ionicons
                  name="lock-closed-outline"
                  size={28}
                  color={colors.brand.navy}
                />
              </View>
            )}

            <Text style={styles.title}>
              {showInvalid
                ? 'Enlace inválido'
                : success
                ? '¡Contraseña actualizada!'
                : 'Nueva contraseña'}
            </Text>

            <Text style={styles.subtitle}>
              {showInvalid
                ? error ||
                  'El enlace para restablecer tu contraseña no es válido o expiró.'
                : success
                ? 'Te llevaremos a iniciar sesión en unos segundos…'
                : 'Elige una contraseña segura para tu cuenta.'}
            </Text>
          </View>

          {/* ======= Body ======= */}
          {showInvalid ? null : success ? (
            <Button
              title="Ir a iniciar sesión ahora"
              onPress={() => router.replace('/(auth)/sign-in')}
              style={styles.primaryCta}
              accessibilityHint="Ir inmediatamente a la pantalla de inicio de sesión"
            />
          ) : (
            <View style={styles.form}>
              <Input
                ref={passRef}
                placeholder="Ingresa tu nueva contraseña (mín. 8)"
                value={credentials.password}
                onChangeText={(t) => setField('password', t)}
                secureTextEntry
                secureToggle
                textContentType={
                  Platform.OS === 'ios' ? 'newPassword' : 'password'
                }
                autoComplete={
                  Platform.OS === 'ios' ? 'password-new' : 'password-new'
                }
                {...(Platform.OS === 'ios'
                  ? {
                      // iOS: sugerencias y evita overlay agresivo
                      passwordRules:
                        'minlength: 8; required: lower; required: upper; required: digit; allowed: ascii;',
                    }
                  : {})}
                returnKeyType="next"
                onSubmitEditing={() => confirmRef.current?.focus()}
                error={errors.password}
                containerStyle={{ marginBottom: spacing.formGap }}
                editable={!loading}
              />

              <Input
                ref={confirmRef}
                placeholder="Confirma tu nueva contraseña"
                value={credentials.confirmPassword}
                onChangeText={(t) => setField('confirmPassword', t)}
                secureTextEntry
                secureToggle
                textContentType={
                  Platform.OS === 'ios' ? ('oneTimeCode' as any) : 'password'
                }
                autoComplete="off"
                returnKeyType="go"
                onSubmitEditing={handleSubmit}
                error={errors.confirmPassword}
                containerStyle={{ marginBottom: spacing.xs }}
                editable={!loading}
              />

              {/* Error global (match Login) */}
              {error ? (
                <View style={styles.errorContainer}>
                  <Ionicons
                    name="warning-outline"
                    size={16}
                    color={colors.error.fg}
                  />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              <Button
                title="Actualizar contraseña"
                onPress={handleSubmit}
                loading={loading}
                disabled={loading}
                style={styles.primaryCta}
                accessibilityHint="Guardar nueva contraseña"
              />

              <Text style={styles.hint}>
                Usa al menos 8 caracteres. Combina letras, números y símbolos.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },

  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.gutter,
    paddingVertical: spacing.xl,
  },
  main: {
    flexGrow: 1,
    justifyContent: 'center',
  },

  // Header (idéntico al Login)
  header: {
    alignItems: 'center',
    marginBottom: spacing.l,
  },
  logoCircle: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: colors.brand.navyBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.m,
  },

  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },

  form: {
    marginTop: spacing.xs,
  },

  // Error global (match Login)
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.error.bg,
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s,
    borderRadius: 8,
    marginBottom: spacing.m,
    gap: spacing.xs,
  },
  errorText: { flex: 1, color: colors.error.fg, fontSize: 14 },

  primaryCta: {
    marginTop: spacing.m,
    marginBottom: spacing.m,
    backgroundColor: colors.brand.navy,
    borderColor: colors.brand.navy,
  },
  hint: {
    textAlign: 'center',
    color: colors.textHint,
    fontSize: 12,
  },

  // Éxito – anim (match EmailVerified)
  animBox: {
    width: CIRCLE * 2.2,
    height: CIRCLE * 2.2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.m,
  },
  ripple: {
    position: 'absolute',
    width: CIRCLE,
    height: CIRCLE,
    borderRadius: CIRCLE / 2,
    backgroundColor: colors.brand.navy,
  },
  checkCircle: {
    width: CIRCLE,
    height: CIRCLE,
    borderRadius: CIRCLE / 2,
    backgroundColor: colors.brand.navy,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
  },
});
