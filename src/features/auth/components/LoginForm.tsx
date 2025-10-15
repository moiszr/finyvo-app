// src/features/auth/components/LoginForm.tsx
import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  KeyboardAvoidingView,
  ScrollView,
  TextInput,
  StyleSheet,
  Keyboard,
  Pressable,
} from 'react-native';
import { Link } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, SocialButton, Input } from '@/components/ui';
import { useSignIn } from '../hooks/useSignIn';
import { useSocialSignIn } from '../hooks/useSocialSignIn';
import type { SignInCredentials } from '../types';
import type { SocialProvider } from '../hooks/useSocialSignIn';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/design';

// Constantes
const VALIDATION_RULES = {
  email: {
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    errorEmpty: 'Ingresa tu email',
    errorInvalid: 'Email inválido',
  },
  password: {
    minLength: 8,
    errorEmpty: 'Ingresa tu contraseña',
    errorShort: 'Mínimo 8 caracteres',
  },
} as const;

export function LoginForm() {
  const insets = useSafeAreaInsets();

  // State
  const [credentials, setCredentials] = useState<SignInCredentials>({
    email: '',
    password: '',
  });
  const [fieldErrors, setFieldErrors] = useState<Partial<SignInCredentials>>(
    {},
  );

  // Refs
  const passwordRef = useRef<TextInput>(null);

  // Hooks
  const {
    signIn,
    loading: signInLoading,
    error: signInError,
    clearError: clearSignInError,
  } = useSignIn();

  const {
    loading: socialLoading,
    error: socialError,
    clearError: clearSocialError,
    signInWithApple,
    signInWithGoogle,
    signInWithFacebook,
    isLoading,
    isProcessing,
  } = useSocialSignIn();

  // Derived state
  const isAnyLoading = signInLoading || !!socialLoading || isProcessing;
  const globalError = signInError || socialError;

  // Helpers
  const updateField = useCallback(
    <K extends keyof SignInCredentials>(field: K, value: string) => {
      setCredentials((prev) => ({ ...prev, [field]: value }));

      // Limpiar error del campo cuando el usuario empieza a escribir
      if (fieldErrors[field]) {
        setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
      }

      // Limpiar errores globales cuando el usuario modifica cualquier campo
      if (globalError) {
        clearSignInError();
        clearSocialError();
      }
    },
    [fieldErrors, globalError, clearSignInError, clearSocialError],
  );

  const validateForm = useCallback((): boolean => {
    const errors: Partial<SignInCredentials> = {};
    const { email, password } = credentials;
    const rules = VALIDATION_RULES;

    // Validar email
    const mail = email.trim();
    if (!mail) {
      errors.email = rules.email.errorEmpty;
    } else if (!rules.email.pattern.test(mail)) {
      errors.email = rules.email.errorInvalid;
    }

    // Validar contraseña
    if (!password) {
      errors.password = rules.password.errorEmpty;
    } else if (password.length < rules.password.minLength) {
      errors.password = rules.password.errorShort;
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }, [credentials]);

  const handleSubmit = useCallback(async () => {
    Keyboard.dismiss();

    if (!validateForm()) return;

    await signIn({
      email: credentials.email.trim(),
      password: credentials.password,
    });
  }, [credentials, validateForm, signIn]);

  const handleSocialLogin = useCallback(
    async (provider: SocialProvider, method: () => Promise<void>) => {
      clearSignInError();
      clearSocialError();

      try {
        await method();
      } catch (err) {
        console.error(`Error en login con ${provider}:`, err);
      }
    },
    [clearSignInError, clearSocialError],
  );

  // Render helpers
  const renderHeader = () => (
    <View className="mb-8 items-center">
      <View
        className="mb-4 h-16 w-16 items-center justify-center rounded-2xl"
        style={{ backgroundColor: colors.brand.navyBg }}
      >
        <Ionicons name="person-outline" size={28} color={colors.brand.navy} />
      </View>
      <Text className="mb-2 text-[28px] font-extrabold text-slate-900">
        Inicia sesión
      </Text>
      <Text className="text-[15px] tracking-[0.3px] text-slate-600">
        Organiza, ahorra y avanza
      </Text>
    </View>
  );

  const renderGlobalError = () => {
    if (!globalError) return null;

    return (
      <View
        accessibilityRole="alert"
        className="mb-3 rounded-2xl border px-3.5 py-3"
        style={{
          backgroundColor: colors.error.bg,
          borderColor: '#FCA5A5',
        }}
      >
        <View className="flex-row items-center">
          <Ionicons name="alert-circle" size={18} color={colors.error.fg} />
          <Text
            className="ml-2 flex-1 self-center text-[14px] font-semibold"
            style={{
              color: colors.error.fg,
              includeFontPadding: false,
              lineHeight: 18,
            }}
            numberOfLines={3}
          >
            {globalError}
          </Text>
          <Pressable
            onPress={() => {
              clearSignInError();
              clearSocialError();
            }}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            className="-mr-1 ml-2 self-center p-1"
            accessibilityRole="button"
            accessibilityLabel="Cerrar alerta"
          >
            <Ionicons name="close" size={16} color={colors.error.fg} />
          </Pressable>
        </View>
      </View>
    );
  };

  const renderSocialButtons = () => (
    <View className="mb-2">
      <View className="flex-row justify-center gap-4">
        <SocialButton
          provider="apple"
          onPress={() => handleSocialLogin('apple', signInWithApple)}
          disabled={isAnyLoading}
          loading={isLoading('apple')}
        />
        <SocialButton
          provider="google"
          onPress={() => handleSocialLogin('google', signInWithGoogle)}
          disabled={isAnyLoading}
          loading={isLoading('google')}
        />
        <SocialButton
          provider="facebook"
          onPress={() => handleSocialLogin('facebook', signInWithFacebook)}
          disabled={isAnyLoading}
          loading={isLoading('facebook')}
        />
      </View>

      {isProcessing && !socialLoading && (
        <Text className="mt-3 text-center text-[13px] italic text-slate-500">
          Completando inicio de sesión...
        </Text>
      )}
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
        <View className="flex-1 justify-center px-6 py-8">
          {renderHeader()}

          {/* Form */}
          <View className="mt-1">
            <View className="mb-3">
              <Input
                placeholder="Ingresa tu email"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                value={credentials.email}
                onChangeText={(text) => updateField('email', text)}
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
                error={fieldErrors.email}
                editable={!isAnyLoading}
              />
            </View>

            <View className="mb-2">
              <Input
                ref={passwordRef}
                placeholder="Ingresa tu contraseña"
                value={credentials.password}
                onChangeText={(text) => updateField('password', text)}
                secureTextEntry
                secureToggle
                textContentType="password"
                autoComplete="password"
                returnKeyType="go"
                onSubmitEditing={handleSubmit}
                error={fieldErrors.password}
                editable={!isAnyLoading}
              />
            </View>

            {/* Forgot password link */}
            <View className="mb-3 mt-1 items-end">
              <Link
                href="/(auth)/forgot-password"
                className={`text-[14px] font-semibold ${
                  isAnyLoading ? 'opacity-50' : 'text-brand-navy'
                }`}
                aria-disabled={isAnyLoading}
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </View>

            {renderGlobalError()}

            <Button
              title="Entrar"
              onPress={handleSubmit}
              loading={signInLoading}
              disabled={isAnyLoading}
              accessibilityHint="Iniciar sesión en tu cuenta"
              style={{ marginTop: 6, marginBottom: 20 }}
            />
          </View>

          {/* Divider */}
          <View className="mb-5 mt-2 flex-row items-center gap-3">
            <View style={styles.hairline} />
            <Text className="text-[13px] font-semibold tracking-[0.5px] text-slate-400">
              o continuar con
            </Text>
            <View style={styles.hairline} />
          </View>

          {renderSocialButtons()}
        </View>

        {/* Footer */}
        <View className="mt-4 items-center pb-2 pt-2">
          <Text className="text-[15px] text-slate-600">
            ¿No tienes cuenta?{' '}
            <Link
              href="/(auth)/sign-up"
              className={`font-bold ${
                isAnyLoading ? 'opacity-50' : 'text-brand-navy'
              }`}
              aria-disabled={isAnyLoading}
            >
              Regístrate
            </Link>
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  hairline: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
});
