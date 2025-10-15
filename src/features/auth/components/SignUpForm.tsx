// src/features/auth/components/SignUpForm.tsx
import React, { useRef, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput,
  Keyboard,
  Pressable,
  StyleSheet,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Input, SocialButton } from '@/components/ui';
import { useSignUp } from '../hooks/useSignUp';
import { useSocialSignIn } from '../hooks/useSocialSignIn';
import type { SignUpCredentials } from '../types';
import type { SocialProvider } from '../hooks/useSocialSignIn';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/design';

// Constantes
const PASSWORD_RULES_IOS =
  'minlength: 8; required: lower; required: upper; required: digit; allowed: ascii;';

const VALIDATION_RULES = {
  fullName: {
    minLength: 2,
    errorEmpty: 'Ingresa tu nombre',
    errorShort: 'Mínimo 2 caracteres',
  },
  email: {
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    errorEmpty: 'Ingresa tu email',
    errorInvalid: 'Email inválido',
  },
  password: {
    minLength: 8,
    errorEmpty: 'Crea una contraseña',
    errorShort: 'Mínimo 8 caracteres',
  },
} as const;

export function SignUpForm() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // State
  const [credentials, setCredentials] = useState<SignUpCredentials>({
    fullName: '',
    email: '',
    password: '',
  });
  const [fieldErrors, setFieldErrors] = useState<Partial<SignUpCredentials>>(
    {},
  );

  // Refs
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  // Hooks
  const {
    signUp,
    loading: signUpLoading,
    error: signUpError,
    clearError: clearSignUpError,
  } = useSignUp();

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
  const isAnyLoading = signUpLoading || !!socialLoading || isProcessing;
  const globalError = signUpError || socialError;

  // Helpers
  const updateField = useCallback(
    <K extends keyof SignUpCredentials>(field: K, value: string) => {
      setCredentials((prev) => ({ ...prev, [field]: value }));
      // Limpiar error del campo cuando el usuario empieza a escribir
      if (fieldErrors[field]) {
        setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
      }
      // Limpiar errores globales cuando el usuario modifica cualquier campo
      if (globalError) {
        clearSignUpError();
        clearSocialError();
      }
    },
    [fieldErrors, globalError, clearSignUpError, clearSocialError],
  );

  const validateForm = useCallback((): boolean => {
    const errors: Partial<SignUpCredentials> = {};
    const { fullName, email, password } = credentials;
    const rules = VALIDATION_RULES;

    // Validar nombre
    const name = fullName.trim();
    if (!name) {
      errors.fullName = rules.fullName.errorEmpty;
    } else if (name.length < rules.fullName.minLength) {
      errors.fullName = rules.fullName.errorShort;
    }

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

    await signUp({
      fullName: credentials.fullName.trim(),
      email: credentials.email.trim(),
      password: credentials.password,
    });
  }, [credentials, validateForm, signUp]);

  const handleSocialLogin = useCallback(
    async (provider: SocialProvider, method: () => Promise<void>) => {
      clearSignUpError();
      clearSocialError();
      try {
        await method();
      } catch (err) {
        console.error(`Error en registro con ${provider}:`, err);
      }
    },
    [clearSignUpError, clearSocialError],
  );

  // Render helpers
  const renderHeader = () => (
    <View className="mb-8 items-center">
      <View
        className="mb-4 h-16 w-16 items-center justify-center rounded-[20px]"
        style={{ backgroundColor: colors.brand.navyBg }}
      >
        <Ionicons
          name="person-add-outline"
          size={28}
          color={colors.brand.navy}
        />
      </View>
      <Text className="mb-2 text-[28px] font-extrabold text-slate-900">
        Crea tu cuenta
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
          >
            {globalError}
          </Text>
          <Pressable
            onPress={() => {
              clearSignUpError();
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
          Completando registro...
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
                placeholder="Tu nombre"
                autoCapitalize="words"
                autoCorrect={false}
                value={credentials.fullName}
                onChangeText={(t) => updateField('fullName', t)}
                returnKeyType="next"
                onSubmitEditing={() => emailRef.current?.focus()}
                error={fieldErrors.fullName}
                editable={!isAnyLoading}
              />
            </View>

            <View className="mb-3">
              <Input
                ref={emailRef}
                placeholder="Ingresa tu email"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                value={credentials.email}
                onChangeText={(t) => updateField('email', t)}
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
                error={fieldErrors.email}
                editable={!isAnyLoading}
              />
            </View>

            <View className="mb-[10px]">
              <Input
                ref={passwordRef}
                placeholder="Crea una contraseña (mín. 8)"
                value={credentials.password}
                onChangeText={(t) => updateField('password', t)}
                secureTextEntry
                secureToggle
                textContentType={
                  Platform.OS === 'ios' ? 'newPassword' : 'password'
                }
                autoComplete={
                  Platform.OS === 'ios' ? 'password-new' : 'password-new'
                }
                // @ts-ignore
                passwordRules={
                  Platform.OS === 'ios' ? PASSWORD_RULES_IOS : undefined
                }
                returnKeyType="go"
                onSubmitEditing={handleSubmit}
                error={fieldErrors.password}
                editable={!isAnyLoading}
              />
            </View>

            <Text className="mb-[10px] mt-1 text-[12.5px] leading-[18px] text-slate-400">
              Al registrarte aceptas nuestros{' '}
              <Text
                className="font-bold text-brand-navy"
                onPress={() => router.push('/legal/terms')}
              >
                Términos
              </Text>{' '}
              y{' '}
              <Text
                className="font-bold text-brand-navy"
                onPress={() => router.push('/legal/privacy')}
              >
                Privacidad
              </Text>
              .
            </Text>

            {renderGlobalError()}

            <Button
              title="Crear cuenta"
              onPress={handleSubmit}
              loading={signUpLoading}
              disabled={isAnyLoading}
              accessibilityHint="Crear una cuenta nueva"
              style={{ marginTop: 6, marginBottom: 20 }}
            />
          </View>

          {/* Divider */}
          <View className="mb-5 mt-2 flex-row items-center gap-3">
            <View style={styles.hairline} />
            <Text className="text-[13px] font-semibold tracking-[0.5px] text-slate-400">
              o registrarte con
            </Text>
            <View style={styles.hairline} />
          </View>

          {renderSocialButtons()}
        </View>

        {/* Footer */}
        <View className="mt-4 items-center pb-2 pt-2">
          <Text className="text-[15px] text-slate-600">
            ¿Ya tienes cuenta?{' '}
            <Link
              href="/(auth)/sign-in"
              style={[
                { color: colors.brand.navy, fontWeight: '700' },
                isAnyLoading && { opacity: 0.5 },
              ]}
              disabled={isAnyLoading}
            >
              Inicia sesión
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
