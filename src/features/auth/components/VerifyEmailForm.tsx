// features/auth/components/VerifyEmailForm.tsx
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import { Button, Input } from '@/components/ui';
import {
  useLocalSearchParams,
  useRouter,
  Stack,
  useNavigation,
} from 'expo-router';
import { supabase } from '@/api/supabase/supabaseClient';
import { useVerifyEmail } from '../hooks/useVerifyEmail';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing } from '@/themes/index';

export function VerifyEmailForm() {
  const params = useLocalSearchParams<{ email?: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const { email, setEmail, sending, sent, error, cooldown, resend, maskEmail } =
    useVerifyEmail(params.email);

  const [checking, setChecking] = useState(false);
  const [localMsg, setLocalMsg] = useState<string | null>(null);
  const [editingEmail, setEditingEmail] = useState<boolean>(
    () => !params.email,
  );

  // -----------------------
  // Helpers
  // -----------------------
  const normalizeEmail = useCallback(
    (val: string) => val.trim().toLowerCase(),
    [],
  );
  const emailIsValid = useMemo(
    () => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || ''),
    [email],
  );

  const canResend = !!email && emailIsValid && !sending && cooldown <= 0;

  const handleHeaderBack = useCallback(() => {
    if (navigation?.canGoBack?.()) {
      navigation.goBack();
    } else {
      router.replace('/(auth)/sign-in');
    }
  }, [navigation, router]);

  // -----------------------
  // Boot: si ya está verificado, pasa directo
  // -----------------------
  useEffect(() => {
    let mounted = true;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!mounted) return;

      if (user?.email && !email) {
        setEmail(user.email);
      }

      if (user?.email_confirmed_at) {
        setTimeout(() => router.replace('/(auth)/email-verified'), 0);
      }
    })();

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, setEmail]);

  // -----------------------
  // Handlers
  // -----------------------
  const handleResend = useCallback(() => {
    if (email) {
      const normalized = normalizeEmail(email);
      if (normalized !== email) setEmail(normalized);
    }
    if (canResend) resend();
  }, [email, canResend, resend, setEmail, normalizeEmail]);

  const handleIAmVerified = useCallback(async () => {
    setChecking(true);
    setLocalMsg(null);
    try {
      const {
        data: { user },
        error: uErr,
      } = await supabase.auth.getUser();

      if (uErr) {
        setLocalMsg('No pudimos comprobar tu estado. Intenta de nuevo.');
        return;
      }

      if (user?.email_confirmed_at) {
        router.replace('/(auth)/email-verified');
        return;
      }

      setLocalMsg(
        'Aún no detectamos la verificación. Espera unos segundos y vuelve a intentarlo o reenvía el enlace.',
      );
    } finally {
      setChecking(false);
    }
  }, [router]);

  const handleUsePreviousEmail = useCallback(() => {
    if (params.email) {
      setEmail(params.email);
      setEditingEmail(false);
    }
  }, [params.email, setEmail]);

  // -----------------------
  // Render
  // -----------------------
  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: '',
          headerShadowVisible: false,
          headerTintColor: colors.brand.navy,
          headerStyle: { backgroundColor: colors.surface },
          headerLeft: () => (
            <Pressable
              onPress={handleHeaderBack}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Volver"
            >
              <Ionicons
                name="chevron-back"
                size={26}
                color={colors.brand.navy}
              />
            </Pressable>
          ),
        }}
      />

      <View
        style={[
          styles.centered,
          { paddingTop: Math.max(0, 8 - insets.top / 2) },
        ]}
      >
        {/* Header visual */}
        <View style={styles.header}>
          <View style={styles.logoCircle}>
            <Ionicons
              name="mail-unread-outline"
              size={28}
              color={colors.brand.navy}
            />
          </View>
          <Text style={styles.title}>Verifica tu correo</Text>

          {/* Email – visual o edición */}
          {!editingEmail && !!email ? (
            <View style={styles.emailRow}>
              <Text style={styles.subtitle}>Enviamos un enlace a&nbsp;</Text>
              <Text
                style={[styles.subtitle, styles.emailStrong]}
                numberOfLines={1}
                ellipsizeMode="middle"
              >
                {maskEmail}
              </Text>
              <Text style={styles.subtitle}>.&nbsp;</Text>
              <Pressable onPress={() => setEditingEmail(true)} hitSlop={8}>
                <Text style={[styles.subtitle, styles.linkInline]}>
                  Cambiar
                </Text>
              </Pressable>
            </View>
          ) : (
            <View style={{ width: '100%' }}>
              <Text
                style={[
                  styles.subtitle,
                  { textAlign: 'left', marginBottom: 10 },
                ]}
              >
                Escribe tu correo para reenviar el enlace:
              </Text>
              <Input
                placeholder="tu@correo.com"
                value={email}
                onChangeText={(t) => setEmail(t)}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
              />
              {!!params.email && (
                <Pressable
                  style={{ alignSelf: 'flex-start', marginTop: 8 }}
                  onPress={handleUsePreviousEmail}
                  hitSlop={8}
                >
                  <Text style={styles.linkInline}>Usar el correo anterior</Text>
                </Pressable>
              )}
            </View>
          )}
        </View>

        {/* Mensajes */}
        {!!error && <Text style={styles.errorText}>{error}</Text>}
        {!!sent && <Text style={styles.okText}>¡Enlace reenviado!</Text>}
        {!!localMsg && <Text style={styles.infoText}>{localMsg}</Text>}

        {/* Acciones */}
        <Button
          title={cooldown > 0 ? `Reenviar (${cooldown}s)` : 'Reenviar enlace'}
          onPress={handleResend}
          disabled={!canResend}
          style={styles.primaryCta}
          accessibilityHint="Reenviar el email de verificación"
        />

        <Button
          title={checking ? 'Comprobando…' : 'Ya verifiqué mi correo'}
          variant="outline"
          onPress={handleIAmVerified}
          disabled={checking}
          style={styles.secondaryCta}
          accessibilityHint="Comprobar si tu cuenta ya quedó verificada"
        />

        {/* Tip sutil */}
        <View style={styles.tips}>
          <Text style={styles.tipText}>
            Revisa spam/promociones. Si cambiaste tu correo, usa el campo de
            arriba y vuelve a enviar.
          </Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  centered: {
    flex: 1,
    paddingHorizontal: spacing.gutter, // 24
    paddingVertical: spacing.xxl * 2, // 64 (sin cambiar el espacio actual)
    justifyContent: 'center',
  },

  header: { alignItems: 'center', marginBottom: 22, width: '100%' },
  logoCircle: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: colors.brand.navyBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },

  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 10,
    textAlign: 'center',
  },

  // —— Alineación perfecta entre correo y “Cambiar”
  emailRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    justifyContent: 'center',
    maxWidth: '100%',
    rowGap: 4,
  },

  subtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  emailStrong: { fontWeight: '700', color: colors.textPrimary },
  linkInline: { color: colors.brand.navy, fontWeight: '700' },

  errorText: { textAlign: 'center', color: colors.error.fg, marginBottom: 6 },
  okText: { textAlign: 'center', color: colors.success.fg, marginBottom: 6 },
  infoText: { textAlign: 'center', color: colors.textMuted, marginBottom: 6 },

  primaryCta: {
    marginTop: 10,
    backgroundColor: colors.brand.navy,
    borderColor: colors.brand.navy,
  },
  secondaryCta: { marginTop: 10 },

  tips: { marginTop: 10, paddingHorizontal: 6 },
  tipText: { textAlign: 'center', color: colors.textHint, fontSize: 12 },
});
