// features/auth/components/ForgotPasswordForm.tsx
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
  Easing,
} from 'react-native';
import { Link } from 'expo-router';
import { Button, Input } from '@/components/ui';
import { useForgotPassword } from '../hooks/useForgotPassword';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '@/themes/index';

const CIRCLE = 64; // igual que tu logoCircle

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);

  const { sendResetEmail, loading, error, emailSent, clearError } =
    useForgotPassword();

  // Animaciones para el estado de éxito
  const checkPop = useRef(new Animated.Value(0)).current;
  const ripple1 = useRef(new Animated.Value(0)).current;
  const ripple2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!emailSent) return;

    // reset valores
    checkPop.setValue(0);
    ripple1.setValue(0);
    ripple2.setValue(0);

    // pop del check
    const popAnim = Animated.spring(checkPop, {
      toValue: 1,
      friction: 6,
      tension: 120,
      useNativeDriver: true,
    });

    // ondas en loop (no bloquean interacción)
    const loop1 = Animated.loop(
      Animated.timing(ripple1, {
        toValue: 1,
        duration: 1500,
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

    return () => {
      loop1.stop();
      loop2.stop();
    };
  }, [emailSent, checkPop, ripple1, ripple2]);

  const validateEmail = (value: string): boolean => {
    const v = value.trim();
    if (!v) {
      setEmailError('Ingresa tu email');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
      setEmailError('Email inválido');
      return false;
    }
    setEmailError(null);
    return true;
  };

  const handleSubmit = async () => {
    clearError();
    if (!validateEmail(email)) return;
    await sendResetEmail({ email });
  };

  const handleEmailChange = (text: string) => {
    setEmail(text);
    if (emailError) setEmailError(null);
  };

  // ——— Estado de éxito ———
  if (emailSent) {
    // Interpolaciones de las ondas
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

    return (
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.centered}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            {/* Zona animada consistente con EmailVerified */}
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
                <Ionicons name="checkmark" size={34} color={colors.raw.white} />
              </Animated.View>
            </View>

            <Text style={styles.title}>¡Enlace enviado!</Text>
            <Text style={styles.subtitle}>
              Te enviamos un correo para restablecer tu contraseña a:
            </Text>
            <Text style={styles.emailHighlight}>{email}</Text>
            <Text style={styles.helper}>
              Revisa bandeja de entrada y spam. El enlace expira en 1 hora.
            </Text>
          </View>

          <Link href="/(auth)/sign-in" asChild>
            <Button
              title="Volver al inicio de sesión"
              style={styles.primaryCta}
              accessibilityHint="Ir a la pantalla de inicio de sesión"
            />
          </Link>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ——— Formulario ———
  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.centered}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoCircle}>
            <Ionicons
              name="mail-open-outline"
              size={28}
              color={colors.brand.navy}
            />
          </View>
          <Text style={styles.title}>Recuperar contraseña</Text>
          <Text style={styles.subtitle}>
            Ingresa tu email y te enviaremos un enlace para restablecerla.
          </Text>
        </View>

        {/* Campo */}
        <Input
          placeholder="Ingresa tu email"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          value={email}
          onChangeText={handleEmailChange}
          error={emailError}
          returnKeyType="send"
          onSubmitEditing={handleSubmit}
          containerStyle={{ marginBottom: spacing.s }}
        />

        {/* Error global */}
        {error ? <Text style={styles.errorBox}>{error}</Text> : null}

        {/* CTA */}
        <Button
          title="Enviar enlace"
          onPress={handleSubmit}
          loading={loading}
          style={styles.primaryCta}
        />

        {/* Footer link */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            ¿Recordaste tu contraseña?{' '}
            <Link href="/(auth)/sign-in" style={styles.footerLink}>
              Inicia sesión
            </Link>
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },

  // Centrado vertical y padding consistente
  centered: {
    flexGrow: 1,
    paddingHorizontal: spacing.gutter,
    paddingVertical: spacing.xl,
    justifyContent: 'center',
  },

  header: { alignItems: 'center', marginBottom: spacing.l },
  logoCircle: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: colors.surfaceAlt, // fondo suave para icono
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
    marginBottom: spacing.xs,
  },

  emailHighlight: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  helper: {
    fontSize: 13,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: spacing.s,
  },

  errorBox: {
    textAlign: 'center',
    color: colors.error.text,
    marginBottom: spacing.s,
  },

  primaryCta: {
    marginTop: spacing.s,
    marginBottom: spacing.m,
    backgroundColor: colors.brand.navy,
    borderColor: colors.brand.navy,
  },

  // Ondas y círculo NAVY (match con EmailVerified)
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

  footer: { alignItems: 'center', marginTop: spacing.xs },
  footerText: { color: colors.textSecondary, fontSize: 15 },
  footerLink: { color: colors.brand.navy, fontWeight: '700' },
});
