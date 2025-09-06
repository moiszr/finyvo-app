// src/features/auth/components/SignUpForm.tsx
import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { Button, Input, SocialButton } from '@/components/ui';
import { useSignUp } from '../hooks/useSignUp';
import { useSocialSignIn } from '../hooks/useSocialSignIn';
import type { SignUpCredentials } from '../types';
import type { SocialProvider } from '../hooks/useSocialSignIn';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '@/themes/index';

type LocalState = SignUpCredentials & { confirmPassword: string };

export function SignUpForm() {
  // ---------------- State ----------------
  const [credentials, setCredentials] = useState<LocalState>({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<
    Partial<Record<keyof LocalState, string>>
  >({});

  // refs
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  // hooks
  const {
    signUp,
    loading: signUpLoading,
    error: signUpError,
    isDuplicate,
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

  const router = useRouter();

  // derived
  const isAnyLoading = signUpLoading || !!socialLoading || isProcessing;
  const currentError = signUpError || socialError;

  // ---------------- Effects ----------------

  // limpiezas de error al editar campos
  useEffect(() => {
    if (currentError) {
      clearSignUpError();
      clearSocialError();
    }
  }, [
    credentials.fullName,
    credentials.email,
    credentials.password,
    credentials.confirmPassword,
    clearSignUpError,
    clearSocialError,
  ]);

  // alerta más amable para email duplicado
  useEffect(() => {
    const msg = currentError || '';
    if (msg.includes('Ya existe una cuenta')) {
      Alert.alert(
        'Cuenta existente',
        'Ya tienes una cuenta con este email. Inicia sesión o recupera tu contraseña.',
        [
          {
            text: 'OK',
            onPress: () => {
              clearSignUpError();
              clearSocialError();
            },
          },
        ],
      );
    }
  }, [currentError, clearSignUpError, clearSocialError]);

  // ---------------- Helpers ----------------

  const setField = useCallback(
    <K extends keyof LocalState>(key: K, val: string) => {
      setCredentials((p) => ({ ...p, [key]: val }));
      if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
    },
    [errors],
  );

  const validate = useCallback(() => {
    const e: Partial<Record<keyof LocalState, string>> = {};
    const name = credentials.fullName.trim();
    const mail = credentials.email.trim();
    const pass = credentials.password;
    const confirm = credentials.confirmPassword;

    if (!name) e.fullName = 'Ingresa tu nombre';
    else if (name.length < 2) e.fullName = 'Mínimo 2 caracteres';

    if (!mail) e.email = 'Ingresa tu email';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail))
      e.email = 'Email inválido';

    if (!pass) e.password = 'Crea una contraseña';
    else if (pass.length < 8) e.password = 'Mínimo 8 caracteres';

    if (!confirm) e.confirmPassword = 'Repite tu contraseña';
    else if (confirm !== pass)
      e.confirmPassword = 'Las contraseñas no coinciden';

    setErrors(e);
    return Object.keys(e).length === 0;
  }, [credentials]);

  const handleSubmit = useCallback(async () => {
    clearSignUpError();
    clearSocialError();
    if (!validate()) return;

    try {
      await signUp({
        fullName: credentials.fullName.trim(),
        email: credentials.email.trim(),
        password: credentials.password,
      });
    } catch (e: any) {
      const msg = String(e?.message || '');
      if (msg.toLowerCase().includes('ya existe una cuenta')) {
        setErrors((prev) => ({ ...prev, email: msg }));
      }
    }
  }, [credentials, validate, signUp, clearSignUpError, clearSocialError]);

  const handleSocialLogin = useCallback(
    async (provider: SocialProvider, method: () => Promise<void>) => {
      clearSignUpError();
      clearSocialError();
      try {
        await method();
      } catch (err) {
        console.error(`Error en social (${provider}):`, err);
      }
    },
    [clearSignUpError, clearSocialError],
  );

  // iOS password rules
  const passwordRulesIOS =
    'minlength: 8; required: lower; required: upper; required: digit; allowed: ascii;';

  // ---------------- Render ----------------

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
        {/* main */}
        <View style={styles.main}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoCircle}>
              <Ionicons
                name="person-add-outline"
                size={28}
                color={colors.brand.navy}
              />
            </View>
            <Text style={styles.title}>Crea tu cuenta</Text>
            <Text style={styles.subtitle}>Organiza, ahorra y avanza</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <Input
              placeholder="Tu nombre"
              autoCapitalize="words"
              autoCorrect={false}
              value={credentials.fullName}
              onChangeText={(t) => setField('fullName', t)}
              returnKeyType="next"
              onSubmitEditing={() => emailRef.current?.focus()}
              error={errors.fullName}
              containerStyle={{ marginBottom: spacing.formGap }} // 12
              editable={!isAnyLoading}
            />

            <Input
              ref={emailRef}
              placeholder="Ingresa tu email"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              value={credentials.email}
              onChangeText={(t) => setField('email', t)}
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
              error={errors.email}
              containerStyle={{ marginBottom: spacing.formGap }} // 12
              editable={!isAnyLoading}
            />

            <Input
              ref={passwordRef}
              placeholder="Crea una contraseña (mín. 8)"
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
              // @ts-ignore (prop iOS)
              passwordRules={
                Platform.OS === 'ios' ? passwordRulesIOS : undefined
              }
              returnKeyType="next"
              onSubmitEditing={() => confirmRef.current?.focus()}
              error={errors.password}
              containerStyle={{ marginBottom: 10 }} // se mantiene 10 exacto
              editable={!isAnyLoading}
            />

            <Input
              ref={confirmRef}
              placeholder="Repite tu contraseña"
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
              containerStyle={{ marginBottom: 6 }} // se mantiene 6 exacto
              editable={!isAnyLoading}
            />

            <Text style={styles.terms}>
              Al registrarte aceptas nuestros{' '}
              <Text
                style={styles.linkInline}
                onPress={() => router.push('/legal/terms')}
              >
                Términos
              </Text>{' '}
              y{' '}
              <Text
                style={styles.linkInline}
                onPress={() => router.push('/legal/privacy')}
              >
                Privacidad
              </Text>
              .
            </Text>

            {/* Error global */}
            {currentError && !currentError.includes('Ya existe una cuenta') ? (
              <View style={styles.errorContainer}>
                <Ionicons
                  name="warning-outline"
                  size={16}
                  color={colors.error.fg}
                />
                <Text style={styles.errorText}>{currentError}</Text>
              </View>
            ) : null}

            <Button
              title="Crear cuenta"
              onPress={handleSubmit}
              loading={signUpLoading}
              disabled={isAnyLoading}
              accessibilityHint="Crear una cuenta nueva"
              style={styles.primaryCta}
            />

            {/* Info extra si el hook marcó duplicado */}
            {isDuplicate && (
              <View style={styles.duplicateBox}>
                <Text style={styles.duplicateTitle}>
                  Ya tienes una cuenta con este email.
                </Text>
                <Text style={styles.duplicateText}>
                  Inicia sesión o recupera tu contraseña desde tu correo
                  electrónico.
                </Text>
              </View>
            )}
          </View>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.line} />
            <Text style={styles.dividerText}>o registrarte con</Text>
            <View style={styles.line} />
          </View>

          {/* Social */}
          <View style={styles.socialSection}>
            <View style={styles.socialRow}>
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
                onPress={() =>
                  handleSocialLogin('facebook', signInWithFacebook)
                }
                disabled={isAnyLoading}
                loading={isLoading('facebook')}
              />
            </View>

            {isProcessing && !socialLoading && (
              <Text style={styles.processingText}>Completando registro...</Text>
            )}
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            ¿Ya tienes cuenta?{' '}
            <Link
              href="/(auth)/sign-in"
              style={[styles.footerLink, isAnyLoading && styles.linkDisabled]}
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

// ---------------- Styles ----------------
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.gutter,
    paddingVertical: spacing.xl,
  }, // 24/24
  main: { flexGrow: 1, justifyContent: 'center' },

  // Header
  header: { alignItems: 'center', marginBottom: 32 }, // 32 exacto
  logoCircle: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: colors.brand.navyBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16, // exacto
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 8,
  }, // exacto
  subtitle: { fontSize: 15, color: colors.textSecondary, letterSpacing: 0.3 },

  // Form
  form: { marginTop: 4 },

  terms: {
    fontSize: 12.5,
    color: colors.textHint,
    marginTop: 4, // exacto
    marginBottom: 10, // exacto
    textAlign: 'left',
    lineHeight: 18,
  },
  linkInline: { color: colors.brand.navy, fontWeight: '700' },

  // Error global
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.error.bg,
    paddingHorizontal: 12, // exacto
    paddingVertical: 10, // exacto
    borderRadius: 8,
    marginBottom: 12, // exacto
    gap: 8, // exacto
  },
  errorText: { flex: 1, color: colors.error.fg, fontSize: 14 },

  primaryCta: { marginTop: 6, marginBottom: 20 }, // exacto

  // Duplicate info
  duplicateBox: {
    marginTop: 10, // exacto
    padding: 12, // exacto
    borderRadius: 12,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  duplicateTitle: {
    color: colors.textPrimary,
    fontWeight: '700',
    marginBottom: 6,
  }, // exacto
  duplicateText: { color: colors.textSecondary, marginBottom: 12 }, // exacto

  // Divider
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12, // exacto
    marginTop: 8, // exacto
    marginBottom: 20, // exacto
  },
  line: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  dividerText: {
    color: colors.textHint,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
  },

  // Social
  socialSection: { marginBottom: 8 }, // exacto
  socialRow: { flexDirection: 'row', justifyContent: 'center', gap: 16 }, // exacto
  processingText: {
    textAlign: 'center',
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 12,
    fontStyle: 'italic',
  }, // exacto

  // Footer
  footer: { alignItems: 'center', marginTop: 16, paddingTop: 8 }, // exacto
  footerText: { color: colors.textSecondary, fontSize: 15 },
  footerLink: { color: colors.brand.navy, fontWeight: '700' },
  linkDisabled: { opacity: 0.5 },
});
