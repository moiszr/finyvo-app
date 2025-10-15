// src/features/auth/components/VerifyEmailForm.tsx
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Pressable,
  Keyboard,
} from 'react-native';
import { Button, Input } from '@/components/ui';
import {
  useLocalSearchParams,
  useRouter,
  Stack,
  useNavigation,
} from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@/api/supabase/supabaseClient';
import { useVerifyEmail } from '../hooks/useVerifyEmail';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/design';

// Constantes
const EMAIL_VALIDATION = {
  pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  errorEmpty: 'Ingresa tu email',
  errorInvalid: 'Email inválido',
} as const;

export function VerifyEmailForm() {
  const params = useLocalSearchParams<{ email?: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  // Hook principal
  const {
    email,
    setEmail,
    sending,
    sent,
    error: globalError,
    cooldown,
    resend,
    maskEmail,
    clearError,
    validateEmail,
  } = useVerifyEmail(params.email);

  // Estado local
  const [isCheckingVerification, setIsCheckingVerification] = useState(false);
  const [verificationMessage, setVerificationMessage] = useState<string | null>(
    null,
  );
  const [isEditingEmail, setIsEditingEmail] = useState<boolean>(
    () => !params.email,
  );
  const [fieldError, setFieldError] = useState<string | null>(null);

  // Verificación inicial del estado de la cuenta
  useEffect(() => {
    let mounted = true;

    const checkUserStatus = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!mounted) return;

        // Auto-rellenar email si está disponible
        if (user?.email && !email) {
          setEmail(user.email);
        }

        // Si ya está verificado, redirigir
        if (user?.email_confirmed_at) {
          setTimeout(() => router.replace('/(auth)/email-verified'), 0);
        }
      } catch (err) {
        console.error('Error checking user status:', err);
      }
    };

    checkUserStatus();

    return () => {
      mounted = false;
    };
  }, [router, email, setEmail]);

  // Helpers
  const handleEmailChange = useCallback(
    (text: string) => {
      setEmail(text);

      // Limpiar errores cuando el usuario escribe
      if (fieldError) setFieldError(null);
      if (globalError) clearError();
      if (verificationMessage) setVerificationMessage(null);
    },
    [setEmail, fieldError, globalError, clearError, verificationMessage],
  );

  const handleResend = useCallback(async () => {
    Keyboard.dismiss();

    // Validar email antes de enviar
    if (!email) {
      setFieldError(EMAIL_VALIDATION.errorEmpty);
      return;
    }

    if (!validateEmail(email)) {
      setFieldError(EMAIL_VALIDATION.errorInvalid);
      return;
    }

    setFieldError(null);
    await resend();
  }, [email, validateEmail, resend]);

  const handleCheckVerification = useCallback(async () => {
    setIsCheckingVerification(true);
    setVerificationMessage(null);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        setVerificationMessage(
          'No pudimos comprobar tu estado. Intenta de nuevo.',
        );
        return;
      }

      if (user?.email_confirmed_at) {
        router.replace('/(auth)/email-verified');
        return;
      }

      setVerificationMessage(
        'Aún no detectamos la verificación. Revisa tu email o reenvía el enlace.',
      );
    } catch (err) {
      setVerificationMessage('Error al verificar. Intenta de nuevo.');
    } finally {
      setIsCheckingVerification(false);
    }
  }, [router]);

  const handleUsePreviousEmail = useCallback(() => {
    if (params.email) {
      setEmail(params.email);
      setIsEditingEmail(false);
      setFieldError(null);
    }
  }, [params.email, setEmail]);

  const handleEditEmail = useCallback(() => {
    setIsEditingEmail(true);
    setVerificationMessage(null);
  }, []);

  const handleHeaderBack = useCallback(() => {
    // @ts-ignore
    if (navigation?.canGoBack?.()) {
      // @ts-ignore
      navigation.goBack();
    } else {
      router.replace('/(auth)/sign-in');
    }
  }, [navigation, router]);

  // Render helpers
  const renderHeader = () => (
    <View className="mb-6 w-full items-center">
      <View
        className="mb-4 h-16 w-16 items-center justify-center rounded-2xl"
        style={{ backgroundColor: colors.brand.navyBg }}
      >
        <Ionicons
          name="mail-unread-outline"
          size={28}
          color={colors.brand.navy}
        />
      </View>

      <Text className="mb-2 text-center text-[28px] font-extrabold text-slate-900">
        Verifica tu correo
      </Text>

      {renderEmailSection()}
    </View>
  );

  const renderEmailSection = () => {
    if (isEditingEmail || !email) {
      return (
        <View className="w-full">
          <Text className="mb-3 text-center text-[15px] leading-5 text-slate-600">
            Ingresa tu email para enviar el enlace de verificación:
          </Text>
          <Input
            placeholder="tu@email.com"
            value={email}
            onChangeText={handleEmailChange}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            error={fieldError || undefined}
            editable={!sending}
          />
          {params.email && params.email !== email && (
            <Pressable
              className="mt-2 self-center"
              onPress={handleUsePreviousEmail}
              hitSlop={{ top: 8, bottom: 8, left: 16, right: 16 }}
            >
              <Text className="text-[14px] font-bold text-brand-navy">
                Usar {params.email}
              </Text>
            </Pressable>
          )}
        </View>
      );
    }

    return (
      <View className="max-w-full">
        <Text className="text-center text-[15px] leading-5 text-slate-600">
          Enviamos un enlace de verificación a:
        </Text>
        <View className="mt-1 flex-row items-center justify-center gap-2">
          <Text
            className="text-center text-[15px] font-bold text-slate-900"
            numberOfLines={1}
            ellipsizeMode="middle"
          >
            {maskEmail}
          </Text>
          <Pressable
            onPress={handleEditEmail}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text className="text-[14px] font-bold text-brand-navy">
              Cambiar
            </Text>
          </Pressable>
        </View>
      </View>
    );
  };

  const renderMessages = () => (
    <>
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

      {sent && !globalError && (
        <View
          className="mb-3 rounded-xl border px-3 py-2.5"
          style={{
            backgroundColor: '#DCFCE7',
            borderColor: '#86EFAC',
          }}
        >
          <Text
            className="text-center text-[14px] font-medium"
            style={{ color: '#166534' }}
          >
            ¡Enlace enviado! Revisa tu bandeja de entrada.
          </Text>
        </View>
      )}

      {verificationMessage && (
        <View className="mb-3 rounded-xl bg-gray-50 px-3 py-2.5">
          <Text className="text-center text-[14px] text-slate-600">
            {verificationMessage}
          </Text>
        </View>
      )}
    </>
  );

  const canResend = email && validateEmail(email) && !sending && cooldown <= 0;

  // Main render
  return (
    <KeyboardAvoidingView
      className="flex-1 bg-surface"
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
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
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
          {renderMessages()}

          {/* Botones de acción */}
          <View className="mt-2">
            <Button
              title={
                cooldown > 0 ? `Reenviar en ${cooldown}s` : 'Reenviar enlace'
              }
              onPress={handleResend}
              disabled={!canResend}
              loading={sending}
              accessibilityHint="Reenviar el email de verificación"
            />

            <Button
              title={
                isCheckingVerification
                  ? 'Verificando...'
                  : 'Ya verifiqué mi correo'
              }
              variant="outline"
              onPress={handleCheckVerification}
              disabled={isCheckingVerification || sending}
              loading={isCheckingVerification}
              accessibilityHint="Comprobar si tu cuenta ya está verificada"
              style={{ marginTop: 10 }}
            />
          </View>

          {/* Tips */}
          <Text className="mt-4 px-2 text-center text-[12px] text-slate-400">
            Revisa tu carpeta de spam o promociones.{'\n'}
            El enlace expira en 24 horas.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
