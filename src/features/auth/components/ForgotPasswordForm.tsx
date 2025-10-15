// src/features/auth/components/ForgotPasswordForm.tsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
  Easing,
  StyleSheet,
  Keyboard,
} from 'react-native';
import { Link } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Input } from '@/components/ui';
import { useForgotPassword } from '../hooks/useForgotPassword';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/design';

// Constantes
const CIRCLE_SIZE = 64;
const ANIMATION_CONFIG = {
  checkPop: {
    friction: 6,
    tension: 120,
  },
  ripple: {
    duration1: 1500,
    duration2: 2000,
    delay2: 120,
  },
} as const;

const EMAIL_VALIDATION = {
  pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  errorEmpty: 'Ingresa tu email',
  errorInvalid: 'Email inválido',
} as const;

export function ForgotPasswordForm() {
  const insets = useSafeAreaInsets();

  // State
  const [email, setEmail] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);

  // Hook
  const {
    sendResetEmail,
    loading,
    error: globalError,
    emailSent,
    clearError,
    reset,
  } = useForgotPassword();

  // Animaciones
  const animations = useRef({
    checkPop: new Animated.Value(0),
    ripple1: new Animated.Value(0),
    ripple2: new Animated.Value(0),
  }).current;

  // Efecto de animación cuando el email se envía exitosamente
  useEffect(() => {
    if (!emailSent) return;

    // Reset valores de animación
    Object.values(animations).forEach((anim) => anim.setValue(0));

    // Animación del check
    const popAnim = Animated.spring(animations.checkPop, {
      toValue: 1,
      ...ANIMATION_CONFIG.checkPop,
      useNativeDriver: true,
    });

    // Animaciones de ripple en loop
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

    const loop1 = createRippleLoop(
      animations.ripple1,
      ANIMATION_CONFIG.ripple.duration1,
    );
    const loop2 = createRippleLoop(
      animations.ripple2,
      ANIMATION_CONFIG.ripple.duration2,
      ANIMATION_CONFIG.ripple.delay2,
    );

    // Iniciar animaciones
    popAnim.start();
    loop1.start();
    loop2.start();

    // Cleanup
    return () => {
      loop1.stop();
      loop2.stop();
    };
  }, [emailSent, animations]);

  // Helpers
  const validateEmail = useCallback((value: string): boolean => {
    const trimmed = value.trim();

    if (!trimmed) {
      setFieldError(EMAIL_VALIDATION.errorEmpty);
      return false;
    }

    if (!EMAIL_VALIDATION.pattern.test(trimmed)) {
      setFieldError(EMAIL_VALIDATION.errorInvalid);
      return false;
    }

    setFieldError(null);
    return true;
  }, []);

  const handleEmailChange = useCallback(
    (text: string) => {
      setEmail(text);

      // Limpiar errores cuando el usuario empieza a escribir
      if (fieldError) setFieldError(null);
      if (globalError) clearError();
    },
    [fieldError, globalError, clearError],
  );

  const handleSubmit = useCallback(async () => {
    Keyboard.dismiss();

    if (!validateEmail(email)) return;

    await sendResetEmail({ email: email.trim() });
  }, [email, validateEmail, sendResetEmail]);

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

  const renderSuccessContent = () => (
    <View className="flex-1 items-center justify-center px-6 py-8">
      {renderSuccessAnimation()}

      <Text className="mb-1 text-center text-[28px] font-extrabold text-slate-900">
        ¡Enlace enviado!
      </Text>
      <Text className="text-center text-[15px] text-slate-600">
        Te enviamos un correo para restablecer tu contraseña a:
      </Text>
      <Text className="mt-1 text-center text-base font-bold text-slate-900">
        {email}
      </Text>
      <Text className="mt-3 text-center text-[13px] leading-[18px] text-slate-500">
        Revisa bandeja de entrada y spam. El enlace expira en 1 hora.
      </Text>

      <Link href="/(auth)/sign-in" asChild>
        <Button
          title="Volver al inicio de sesión"
          style={{ alignSelf: 'stretch', marginTop: 12 }}
          accessibilityHint="Ir a la pantalla de inicio de sesión"
        />
      </Link>
    </View>
  );

  const renderFormContent = () => (
    <View className="flex-1 justify-center px-6 py-8">
      {/* Header */}
      <View className="mb-5 items-center">
        <View
          className="mb-4 h-16 w-16 items-center justify-center rounded-2xl"
          style={{ backgroundColor: colors.brand.navyBg }}
        >
          <Ionicons
            name="mail-open-outline"
            size={28}
            color={colors.brand.navy}
          />
        </View>
        <Text className="mb-1 text-center text-[28px] font-extrabold text-slate-900">
          Recuperar contraseña
        </Text>
        <Text className="text-center text-[15px] leading-[20px] text-slate-600">
          Ingresa tu email y te enviaremos un enlace para restablecerla.
        </Text>
      </View>

      {/* Form */}
      <View className="mb-3">
        <Input
          placeholder="Ingresa tu email"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          value={email}
          onChangeText={handleEmailChange}
          error={fieldError || undefined}
          returnKeyType="send"
          onSubmitEditing={handleSubmit}
          editable={!loading}
        />
      </View>

      {/* Global Error */}
      {globalError && (
        <View
          accessibilityRole="alert"
          className="mb-3 rounded-xl border px-3 py-2.5"
          style={{
            backgroundColor: colors.error.bg,
            borderColor: '#FCA5A5',
          }}
        >
          <Text
            className="text-center text-[14px] font-medium"
            style={{ color: colors.error.fg }}
          >
            {globalError}
          </Text>
        </View>
      )}

      {/* CTA */}
      <Button
        title="Enviar enlace"
        onPress={handleSubmit}
        loading={loading}
        disabled={loading}
        style={{ alignSelf: 'stretch', marginTop: 4, marginBottom: 12 }}
      />

      {/* Footer link */}
      <View className="mt-2 items-center">
        <Text className="text-[15px] text-slate-600">
          ¿Recordaste tu contraseña?{' '}
          <Link
            href="/(auth)/sign-in"
            className={`font-bold ${loading ? 'opacity-50' : 'text-brand-navy'}`}
            aria-disabled={loading}
          >
            Inicia sesión
          </Link>
        </Text>
      </View>
    </View>
  );

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
        {emailSent ? renderSuccessContent() : renderFormContent()}
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
    // Sombra sutil
    shadowColor: '#000',
    shadowOpacity: Platform.select({ ios: 0.12, android: 0.18 }),
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
});
