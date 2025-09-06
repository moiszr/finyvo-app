// features/auth/components/LoginForm.tsx
import React, { useRef, useState, useCallback, useEffect } from 'react';
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
import { Link } from 'expo-router';
import { Button, SocialButton, Input } from '@/components/ui';
import { useSignIn } from '../hooks/useSignIn';
import { useSocialSignIn } from '../hooks/useSocialSignIn';
import type { SignInCredentials } from '../types';
import { Ionicons } from '@expo/vector-icons';
import type { SocialProvider } from '../hooks/useSocialSignIn';
import { colors, spacing } from '@/themes/index';

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function LoginForm() {
  // Estado del formulario
  const [credentials, setCredentials] = useState<SignInCredentials>({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState<Partial<SignInCredentials>>({});

  // Referencias
  const passwordRef = useRef<TextInput>(null);

  // Hooks de autenticación
  const {
    signIn,
    loading: emailLoading,
    error: emailError,
    clearError,
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

  // Estado derivado
  const isAnyLoading = emailLoading || !!socialLoading || isProcessing;
  const currentError = emailError || socialError;

  // ============================================================================
  // EFFECTS
  // ============================================================================

  // Limpiar errores cuando cambien las credenciales
  useEffect(() => {
    if (currentError) {
      clearError();
      clearSocialError();
    }
  }, [credentials.email, credentials.password]);

  // Alert para “cuenta ya existe” en social login
  useEffect(() => {
    if (socialError?.includes('Ya existe una cuenta')) {
      Alert.alert(
        'Cuenta Existente',
        'Ya tienes una cuenta con este email. Intenta iniciar sesión con tu email y contraseña.',
        [{ text: 'OK', onPress: clearSocialError }],
      );
    }
  }, [socialError, clearSocialError]);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const setField = useCallback(
    (key: keyof SignInCredentials, value: string) => {
      setCredentials((prev) => ({ ...prev, [key]: value }));
      if (errors[key]) {
        setErrors((prev) => ({ ...prev, [key]: undefined }));
      }
    },
    [errors],
  );

  const validate = useCallback((): boolean => {
    const newErrors: Partial<SignInCredentials> = {};
    const email = credentials.email.trim();
    const password = credentials.password;

    if (!email) {
      newErrors.email = 'Ingresa tu email';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Email inválido';
    }

    if (!password) {
      newErrors.password = 'Ingresa tu contraseña';
    } else if (password.length < 6) {
      newErrors.password = 'Mínimo 6 caracteres';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [credentials]);

  const handleSubmit = useCallback(async () => {
    clearError();
    clearSocialError();

    if (!validate()) return;

    await signIn({
      email: credentials.email.trim(),
      password: credentials.password,
    });
  }, [credentials, validate, signIn, clearError, clearSocialError]);

  const handleSocialLogin = useCallback(
    async (provider: SocialProvider, loginMethod: () => Promise<void>) => {
      clearError();
      clearSocialError();
      try {
        await loginMethod();
      } catch (error) {
        console.error(`Error en login con ${provider}:`, error);
      }
    },
    [clearError, clearSocialError],
  );

  // ============================================================================
  // RENDER
  // ============================================================================

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
        {/* Bloque principal centrado verticalmente */}
        <View style={styles.main}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoCircle}>
              <Ionicons
                name="person-outline"
                size={28}
                color={colors.brand.navy}
              />
            </View>
            <Text style={styles.title}>Inicia sesión</Text>
            <Text style={styles.subtitle}>Organiza, ahorra y avanza</Text>
          </View>

          {/* Formulario */}
          <View style={styles.form}>
            <Input
              placeholder="Ingresa tu email"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              value={credentials.email}
              onChangeText={(text) => setField('email', text)}
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
              error={errors.email}
              containerStyle={{ marginBottom: spacing.formGap }}
              editable={!isAnyLoading}
            />

            <Input
              ref={passwordRef}
              placeholder="Ingresa tu contraseña"
              value={credentials.password}
              onChangeText={(text) => setField('password', text)}
              secureTextEntry
              secureToggle
              textContentType="password"
              autoComplete="password"
              returnKeyType="go"
              onSubmitEditing={handleSubmit}
              error={errors.password}
              containerStyle={{ marginBottom: spacing.xs }}
              editable={!isAnyLoading}
            />

            {/* Forgot password */}
            <View style={styles.rowRight}>
              <Link
                href="/(auth)/forgot-password"
                style={[styles.linkMuted, isAnyLoading && styles.linkDisabled]}
                disabled={isAnyLoading}
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </View>

            {/* Error global */}
            {currentError && !socialError?.includes('Ya existe una cuenta') ? (
              <View style={styles.errorContainer}>
                <Ionicons
                  name="warning-outline"
                  size={16}
                  color={colors.error.fg}
                />
                <Text style={styles.errorText}>{currentError}</Text>
              </View>
            ) : null}

            {/* CTA Principal */}
            <Button
              title="Entrar"
              onPress={handleSubmit}
              loading={emailLoading}
              disabled={isAnyLoading}
              accessibilityHint="Iniciar sesión en tu cuenta"
              style={styles.primaryCta}
            />
          </View>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.line} />
            <Text style={styles.dividerText}>o continuar con</Text>
            <View style={styles.line} />
          </View>

          {/* Social Login */}
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

            {/* Indicador de procesamiento */}
            {isProcessing && !socialLoading && (
              <Text style={styles.processingText}>
                Completando inicio de sesión...
              </Text>
            )}
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            ¿No tienes cuenta?{' '}
            <Link
              href="/(auth)/sign-up"
              style={[styles.footerLink, isAnyLoading && styles.linkDisabled]}
              disabled={isAnyLoading}
            >
              Regístrate
            </Link>
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.gutter, // 24
    paddingVertical: spacing.xl, // 16 (si quieres 24, usa xl también)
  },
  main: {
    flexGrow: 1,
    justifyContent: 'center',
  },

  // Header
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoCircle: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: colors.brand.navyBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    letterSpacing: 0.3,
  },

  // Form
  form: {
    marginTop: 4,
  },
  rowRight: {
    alignItems: 'flex-end',
    marginTop: 6,
    marginBottom: 14,
  },
  linkMuted: {
    color: colors.brand.navy,
    fontWeight: '600',
    fontSize: 14,
  },
  linkDisabled: {
    opacity: 0.5,
  },

  // Errors (match tokens)
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.error.bg,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 12,
    gap: 8,
  },
  errorText: {
    flex: 1,
    color: colors.error.fg,
    fontSize: 14,
  },

  primaryCta: {
    marginTop: 6,
    marginBottom: 20,
    backgroundColor: colors.brand.navy,
    borderColor: colors.brand.navy,
  },

  // Divider
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
    marginBottom: 20,
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
  socialSection: {
    marginBottom: 8,
  },
  socialRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  processingText: {
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 12,
    fontStyle: 'italic',
  },

  // Footer
  footer: {
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 8,
  },
  footerText: {
    color: colors.textSecondary,
    fontSize: 15,
  },
  footerLink: {
    color: colors.brand.navy,
    fontWeight: '700',
  },
});
