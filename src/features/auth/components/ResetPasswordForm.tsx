// src/features/auth/components/ResetPasswordForm.tsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
  Easing,
  TextInput,
  StyleSheet,
  Keyboard,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Input, LoadingScreen } from '@/components/ui';
import { useResetPassword } from '../hooks/useResetPassword';
import { useAuthStore } from '@/store/authStore';
import type { ResetPasswordCredentials } from '../types';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/design';

// Constantes
const CIRCLE_SIZE = 86;
const AUTO_REDIRECT_DELAY = 3000;
const INVALID_LINK_DELAY = 250;

const PASSWORD_RULES_IOS =
  'minlength: 8; required: lower; required: upper; required: digit; allowed: ascii;';

const VALIDATION_RULES = {
  password: {
    minLength: 8,
    errorEmpty: 'Ingresa una contraseña',
    errorShort: 'Mínimo 8 caracteres',
  },
  confirmPassword: {
    errorEmpty: 'Confirma tu contraseña',
    errorMismatch: 'Las contraseñas no coinciden',
  },
} as const;

const ANIMATION_CONFIG = {
  checkPop: {
    friction: 6,
    tension: 120,
  },
  fade: {
    duration: 260,
  },
  ripple: {
    duration1: 1600,
    duration2: 2000,
    delay2: 120,
  },
} as const;

export function ResetPasswordForm() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { setRecoverySession } = useAuthStore();

  // State
  const [credentials, setCredentials] = useState<ResetPasswordCredentials>({
    password: '',
    confirmPassword: '',
  });
  const [fieldErrors, setFieldErrors] = useState<
    Partial<ResetPasswordCredentials>
  >({});
  const [isSuccess, setIsSuccess] = useState(false);

  // Refs
  const confirmRef = useRef<TextInput>(null);
  const redirectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Hook
  const {
    resetPassword,
    loading,
    error: globalError,
    tokensProcessed,
    clearError,
    booting,
    signOutForReset,
  } = useResetPassword();

  // Animaciones
  const animations = useRef({
    checkPop: new Animated.Value(0),
    ripple1: new Animated.Value(0),
    ripple2: new Animated.Value(0),
    fade: new Animated.Value(0),
  }).current;

  // Evitar destello de "enlace inválido"
  const [showInvalidLink, setShowInvalidLink] = useState(false);

  useEffect(() => {
    if (!booting && !tokensProcessed && globalError) {
      const timer = setTimeout(
        () => setShowInvalidLink(true),
        INVALID_LINK_DELAY,
      );
      return () => clearTimeout(timer);
    }
    setShowInvalidLink(false);
  }, [booting, tokensProcessed, globalError]);

  // Animación de éxito
  useEffect(() => {
    if (!isSuccess) return;

    // Limpiar sesión de recuperación
    (async () => {
      try {
        setRecoverySession(false);
        await signOutForReset();
      } catch (err) {
        console.error('Error clearing recovery session:', err);
      }
    })();

    // Reset animaciones
    Object.values(animations).forEach((anim) => anim.setValue(0));

    // Configurar animaciones
    const checkAnim = Animated.spring(animations.checkPop, {
      toValue: 1,
      ...ANIMATION_CONFIG.checkPop,
      useNativeDriver: true,
    });

    const fadeAnim = Animated.timing(animations.fade, {
      toValue: 1,
      duration: ANIMATION_CONFIG.fade.duration,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    });

    const createRippleLoop = (
      anim: Animated.Value,
      duration: number,
      delay = 0,
    ) =>
      Animated.loop(
        Animated.timing(anim, {
          toValue: 1,
          duration,
          delay,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
          isInteraction: false,
        }),
      );

    const ripple1Loop = createRippleLoop(
      animations.ripple1,
      ANIMATION_CONFIG.ripple.duration1,
    );

    const ripple2Loop = createRippleLoop(
      animations.ripple2,
      ANIMATION_CONFIG.ripple.duration2,
      ANIMATION_CONFIG.ripple.delay2,
    );

    // Iniciar animaciones
    checkAnim.start();
    fadeAnim.start();
    ripple1Loop.start();
    ripple2Loop.start();

    // Auto-redirect
    redirectTimer.current = setTimeout(() => {
      router.replace('/(auth)/sign-in');
    }, AUTO_REDIRECT_DELAY);

    // Cleanup
    return () => {
      ripple1Loop.stop();
      ripple2Loop.stop();
      if (redirectTimer.current) {
        clearTimeout(redirectTimer.current);
      }
    };
  }, [isSuccess, router, setRecoverySession, signOutForReset, animations]);

  // Helpers
  const updateField = useCallback(
    <K extends keyof ResetPasswordCredentials>(field: K, value: string) => {
      setCredentials((prev) => ({ ...prev, [field]: value }));

      // Limpiar errores cuando el usuario escribe
      if (fieldErrors[field]) {
        setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
      }
      if (globalError) {
        clearError();
      }
    },
    [fieldErrors, globalError, clearError],
  );

  const validateForm = useCallback((): boolean => {
    const errors: Partial<ResetPasswordCredentials> = {};
    const { password, confirmPassword } = credentials;
    const rules = VALIDATION_RULES;

    // Validar contraseña
    const pass = password.trim();
    if (!pass) {
      errors.password = rules.password.errorEmpty;
    } else if (pass.length < rules.password.minLength) {
      errors.password = rules.password.errorShort;
    }

    // Validar confirmación
    const confirm = confirmPassword.trim();
    if (!confirm) {
      errors.confirmPassword = rules.confirmPassword.errorEmpty;
    } else if (pass !== confirm) {
      errors.confirmPassword = rules.confirmPassword.errorMismatch;
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }, [credentials]);

  const handleSubmit = useCallback(async () => {
    Keyboard.dismiss();

    if (!validateForm()) return;

    const result = await resetPassword(credentials);
    if (result.ok) {
      setIsSuccess(true);
    }
  }, [credentials, validateForm, resetPassword]);

  const handleRedirectNow = useCallback(() => {
    if (redirectTimer.current) {
      clearTimeout(redirectTimer.current);
    }
    router.replace('/(auth)/sign-in');
  }, [router]);

  // Render helpers
  const renderSuccessAnimation = () => {
    const rippleInterpolations = [
      {
        scale: animations.ripple1.interpolate({
          inputRange: [0, 1],
          outputRange: [0.6, 2.0],
        }),
        opacity: animations.ripple1.interpolate({
          inputRange: [0, 1],
          outputRange: [0.25, 0],
        }),
      },
      {
        scale: animations.ripple2.interpolate({
          inputRange: [0, 1],
          outputRange: [0.6, 2.4],
        }),
        opacity: animations.ripple2.interpolate({
          inputRange: [0, 1],
          outputRange: [0.18, 0],
        }),
      },
    ];

    return (
      <View
        className="mb-4 items-center justify-center"
        style={{ width: CIRCLE_SIZE * 2.2, height: CIRCLE_SIZE * 2.2 }}
        pointerEvents="none"
      >
        {rippleInterpolations.map((interpolation, index) => (
          <Animated.View
            key={`ripple-${index}`}
            style={[
              styles.ripple,
              {
                transform: [{ scale: interpolation.scale }],
                opacity: interpolation.opacity,
                backgroundColor: colors.brand.navy,
              },
            ]}
          />
        ))}
        <Animated.View
          style={[
            styles.checkCircle,
            {
              transform: [{ scale: animations.checkPop }],
              backgroundColor: colors.brand.navy,
            },
          ]}
        >
          <Ionicons name="checkmark" size={34} color={colors.raw.white} />
        </Animated.View>
      </View>
    );
  };

  const renderHeader = () => {
    if (showInvalidLink) {
      return (
        <>
          <View
            className="mb-4 h-16 w-16 items-center justify-center rounded-2xl"
            style={{ backgroundColor: colors.error.bg }}
          >
            <Ionicons name="alert-circle" size={28} color={colors.error.fg} />
          </View>
          <Text className="mb-1 text-center text-[28px] font-extrabold text-slate-900">
            Enlace inválido
          </Text>
          <Text className="text-center text-[15px] leading-5 text-slate-600">
            {globalError ||
              'El enlace para restablecer tu contraseña no es válido o expiró.'}
          </Text>
        </>
      );
    }

    if (isSuccess) {
      return (
        <>
          {renderSuccessAnimation()}
          <Text className="mb-1 text-center text-[28px] font-extrabold text-slate-900">
            ¡Contraseña actualizada!
          </Text>
          <Animated.Text
            className="text-center text-[15px] leading-5 text-slate-600"
            style={{ opacity: animations.fade }}
          >
            Te llevaremos a iniciar sesión en unos segundos…
          </Animated.Text>
        </>
      );
    }

    return (
      <>
        <View
          className="mb-4 h-16 w-16 items-center justify-center rounded-2xl"
          style={{ backgroundColor: colors.brand.navyBg }}
        >
          <Ionicons
            name="lock-closed-outline"
            size={28}
            color={colors.brand.navy}
          />
        </View>
        <Text className="mb-1 text-center text-[28px] font-extrabold text-slate-900">
          Nueva contraseña
        </Text>
        <Text className="text-center text-[15px] leading-5 text-slate-600">
          Elige una contraseña segura para tu cuenta.
        </Text>
      </>
    );
  };

  const renderForm = () => {
    if (showInvalidLink || isSuccess) {
      if (isSuccess) {
        return (
          <Button
            title="Ir a iniciar sesión ahora"
            onPress={handleRedirectNow}
            style={{ marginTop: 12, marginBottom: 16, alignSelf: 'stretch' }}
            accessibilityHint="Ir inmediatamente a la pantalla de inicio de sesión"
          />
        );
      }
      return null;
    }

    return (
      <View className="mt-1">
        <View className="mb-3">
          <Input
            placeholder="Ingresa tu nueva contraseña (mín. 8)"
            value={credentials.password}
            onChangeText={(text) => updateField('password', text)}
            secureTextEntry
            secureToggle
            textContentType="newPassword"
            autoComplete="password-new"
            // @ts-ignore
            passwordRules={
              Platform.OS === 'ios' ? PASSWORD_RULES_IOS : undefined
            }
            returnKeyType="next"
            onSubmitEditing={() => confirmRef.current?.focus()}
            error={fieldErrors.password}
            editable={!loading}
          />
        </View>

        <View className="mb-2">
          <Input
            ref={confirmRef}
            placeholder="Confirma tu nueva contraseña"
            value={credentials.confirmPassword}
            onChangeText={(text) => updateField('confirmPassword', text)}
            secureTextEntry
            secureToggle
            textContentType="newPassword"
            autoComplete="off"
            returnKeyType="go"
            onSubmitEditing={handleSubmit}
            error={fieldErrors.confirmPassword}
            editable={!loading}
          />
        </View>

        {globalError && (
          <View
            className="mb-4 flex-row items-center gap-2 rounded-lg px-3 py-2.5"
            style={{ backgroundColor: colors.error.bg }}
            accessibilityRole="alert"
          >
            <Ionicons
              name="warning-outline"
              size={16}
              color={colors.error.fg}
            />
            <Text
              className="flex-1 text-[14px]"
              style={{ color: colors.error.fg }}
            >
              {globalError}
            </Text>
          </View>
        )}

        <Button
          title="Actualizar contraseña"
          onPress={handleSubmit}
          loading={loading}
          disabled={loading}
          style={{ marginTop: 12, marginBottom: 16 }}
          accessibilityHint="Guardar nueva contraseña"
        />

        <Text className="text-center text-[12px] text-slate-400">
          Usa al menos 8 caracteres. Combina letras, números y símbolos.
        </Text>
      </View>
    );
  };

  // Loading state
  if (booting) {
    return <LoadingScreen message="Verificando enlace..." />;
  }

  // Main render
  return (
    <KeyboardAvoidingView className="flex-1 bg-surface" behavior={undefined}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          flexGrow: 1,
          paddingBottom: Math.max(12, insets.bottom),
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-1 justify-center px-6 py-8">
          <View className="mb-6 items-center">{renderHeader()}</View>
          {renderForm()}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  ripple: {
    position: 'absolute',
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
  },
  checkCircle: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
  },
});
