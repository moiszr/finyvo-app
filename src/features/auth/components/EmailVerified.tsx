// features/auth/components/EmailVerified.tsx
import React, { useRef, useCallback, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { Button } from '@/components/ui';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '@/themes/index';

const CIRCLE = 86;

export function EmailVerified() {
  const router = useRouter();
  const { session } = useAuthStore();

  // Animations
  const pop = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(0)).current;
  const ripple1 = useRef(new Animated.Value(0)).current;
  const ripple2 = useRef(new Animated.Value(0)).current;

  // Loops refs
  const loop1Ref = useRef<Animated.CompositeAnimation | null>(null);
  const loop2Ref = useRef<Animated.CompositeAnimation | null>(null);

  // Navegación (evita doble toque)
  const isNavigating = useRef(false);
  const [ctaDisabled, setCtaDisabled] = useState(false);

  const stopLoops = () => {
    loop1Ref.current?.stop();
    loop2Ref.current?.stop();
    loop1Ref.current = null;
    loop2Ref.current = null;
  };

  const handleGo = useCallback(() => {
    if (isNavigating.current) return;
    isNavigating.current = true;
    setCtaDisabled(true);

    // Detén animaciones antes de salir (evita destellos)
    stopLoops();

    const target = session ? '/(tabs)/dashboard' : '/(auth)/sign-in';
    router.replace(target);
  }, [router, session]);

  // Arrancar/parar animaciones por foco/blur de la pantalla
  useFocusEffect(
    useCallback(() => {
      // Reset al entrar
      isNavigating.current = false;
      setCtaDisabled(false);

      pop.setValue(0);
      fade.setValue(0);
      ripple1.setValue(0);
      ripple2.setValue(0);

      // 1) Check pop
      Animated.spring(pop, {
        toValue: 1,
        friction: 6,
        tension: 120,
        useNativeDriver: true,
      }).start(() => {
        // 2) Ondas en loop (no bloquean interacción)
        loop1Ref.current = Animated.loop(
          Animated.timing(ripple1, {
            toValue: 1,
            duration: 1600,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
            isInteraction: false,
          }),
        );
        loop2Ref.current = Animated.loop(
          Animated.timing(ripple2, {
            toValue: 1,
            duration: 2000,
            delay: 120,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
            isInteraction: false,
          }),
        );
        loop1Ref.current.start();
        loop2Ref.current.start();

        // 3) Fade del texto
        Animated.timing(fade, {
          toValue: 1,
          duration: 260,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
          isInteraction: false,
        }).start();
      });

      // Cleanup en blur/unmount
      return () => {
        stopLoops();
      };
    }, [pop, fade, ripple1, ripple2]),
  );

  // Interpolaciones
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
  const fadeTranslateY = fade.interpolate({
    inputRange: [0, 1],
    outputRange: [6, 0],
  });

  return (
    <View style={styles.root}>
      <View style={styles.centered}>
        {/* Animación – no intercepta toques */}
        <View style={styles.animBox} pointerEvents="none">
          <Animated.View
            style={[
              styles.ripple,
              { transform: [{ scale: rippleScale1 }], opacity: rippleOpacity1 },
            ]}
          />
          <Animated.View
            style={[
              styles.ripple,
              { transform: [{ scale: rippleScale2 }], opacity: rippleOpacity2 },
            ]}
          />
          <Animated.View
            style={[styles.checkCircle, { transform: [{ scale: pop }] }]}
          >
            <Ionicons name="checkmark" size={34} color={colors.raw.white} />
          </Animated.View>
        </View>

        {/* Texto */}
        <Animated.View
          style={{ opacity: fade, transform: [{ translateY: fadeTranslateY }] }}
          pointerEvents="none"
        >
          <Text style={styles.title}>¡Correo verificado!</Text>
          <Text style={styles.subtitle}>Tu cuenta ya está activa.</Text>
        </Animated.View>

        {/* CTA permanente */}
        <Button
          title={session ? 'Ir al inicio' : 'Iniciar sesión'}
          onPress={handleGo}
          disabled={ctaDisabled}
          style={styles.primaryCta}
          accessibilityHint={
            session ? 'Ir al dashboard' : 'Ir a iniciar sesión'
          }
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  centered: {
    flex: 1,
    paddingHorizontal: spacing.gutter,
    paddingVertical: spacing.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
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
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 18,
  },
  primaryCta: {
    backgroundColor: colors.brand.navy,
    borderColor: colors.brand.navy,
    alignSelf: 'stretch',
    marginTop: 6,
  },
});
