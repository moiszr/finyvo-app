// src/features/auth/components/EmailVerified.tsx
import React, { useRef, useCallback, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  Platform,
} from 'react-native';
import { Button } from '@/components/ui';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '@/store/authStore';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/design';

// Constantes
const CIRCLE_SIZE = 86;

const ANIMATION_CONFIG = {
  checkPop: {
    friction: 6,
    tension: 120,
  },
  ripple: {
    duration1: 1600,
    duration2: 2000,
    delay2: 120,
  },
  fade: {
    duration: 260,
    translateY: 6,
  },
} as const;

export function EmailVerified() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session } = useAuthStore();

  // Estado
  const [isNavigating, setIsNavigating] = useState(false);

  // Animaciones
  const animations = useRef({
    checkPop: new Animated.Value(0),
    fade: new Animated.Value(0),
    ripple1: new Animated.Value(0),
    ripple2: new Animated.Value(0),
  }).current;

  // Referencias para loops
  const animationLoops = useRef<{
    ripple1: Animated.CompositeAnimation | null;
    ripple2: Animated.CompositeAnimation | null;
  }>({
    ripple1: null,
    ripple2: null,
  });

  // Función para detener loops
  const stopAnimationLoops = useCallback(() => {
    Object.values(animationLoops.current).forEach((loop) => {
      loop?.stop();
    });
    animationLoops.current = {
      ripple1: null,
      ripple2: null,
    };
  }, []);

  // Función para crear loop de ripple
  const createRippleLoop = useCallback(
    (
      animValue: Animated.Value,
      duration: number,
      delay = 0,
    ): Animated.CompositeAnimation => {
      return Animated.loop(
        Animated.timing(animValue, {
          toValue: 1,
          duration,
          delay,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
          isInteraction: false,
        }),
      );
    },
    [],
  );

  // Función para iniciar todas las animaciones
  const startAnimations = useCallback(() => {
    // Reset valores
    Object.values(animations).forEach((anim) => anim.setValue(0));

    // 1. Animación del check
    Animated.spring(animations.checkPop, {
      toValue: 1,
      ...ANIMATION_CONFIG.checkPop,
      useNativeDriver: true,
    }).start(() => {
      // 2. Iniciar ripples después del check
      animationLoops.current.ripple1 = createRippleLoop(
        animations.ripple1,
        ANIMATION_CONFIG.ripple.duration1,
      );

      animationLoops.current.ripple2 = createRippleLoop(
        animations.ripple2,
        ANIMATION_CONFIG.ripple.duration2,
        ANIMATION_CONFIG.ripple.delay2,
      );

      animationLoops.current.ripple1?.start();
      animationLoops.current.ripple2?.start();

      // 3. Fade del texto
      Animated.timing(animations.fade, {
        toValue: 1,
        duration: ANIMATION_CONFIG.fade.duration,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
        isInteraction: false,
      }).start();
    });
  }, [animations, createRippleLoop]);

  // Manejar navegación
  const handleNavigation = useCallback(() => {
    if (isNavigating) return;

    setIsNavigating(true);
    stopAnimationLoops();

    const destination = session ? '/(tabs)/dashboard' : '/(auth)/sign-in';
    router.replace(destination);
  }, [isNavigating, session, router, stopAnimationLoops]);

  // Efecto de focus para iniciar/detener animaciones
  useFocusEffect(
    useCallback(() => {
      // Reset estado cuando la pantalla obtiene focus
      setIsNavigating(false);

      // Iniciar animaciones
      startAnimations();

      // Cleanup cuando pierde focus
      return () => {
        stopAnimationLoops();
      };
    }, [startAnimations, stopAnimationLoops]),
  );

  // Interpolaciones para las animaciones
  const animationInterpolations = {
    ripple1: {
      scale: animations.ripple1.interpolate({
        inputRange: [0, 1],
        outputRange: [0.6, 2.0],
      }),
      opacity: animations.ripple1.interpolate({
        inputRange: [0, 1],
        outputRange: [0.25, 0],
      }),
    },
    ripple2: {
      scale: animations.ripple2.interpolate({
        inputRange: [0, 1],
        outputRange: [0.6, 2.4],
      }),
      opacity: animations.ripple2.interpolate({
        inputRange: [0, 1],
        outputRange: [0.18, 0],
      }),
    },
    fade: {
      translateY: animations.fade.interpolate({
        inputRange: [0, 1],
        outputRange: [ANIMATION_CONFIG.fade.translateY, 0],
      }),
    },
  };

  // Render helpers
  const renderAnimatedCheck = () => (
    <View
      className="mb-4 items-center justify-center"
      style={{
        width: CIRCLE_SIZE * 2.2,
        height: CIRCLE_SIZE * 2.2,
      }}
      pointerEvents="none"
    >
      {/* Ripple 1 */}
      <Animated.View
        style={[
          styles.ripple,
          {
            transform: [{ scale: animationInterpolations.ripple1.scale }],
            opacity: animationInterpolations.ripple1.opacity,
            backgroundColor: colors.brand.navy,
          },
        ]}
      />

      {/* Ripple 2 */}
      <Animated.View
        style={[
          styles.ripple,
          {
            transform: [{ scale: animationInterpolations.ripple2.scale }],
            opacity: animationInterpolations.ripple2.opacity,
            backgroundColor: colors.brand.navy,
          },
        ]}
      />

      {/* Check Circle */}
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

  const renderContent = () => (
    <>
      {/* Animación del check */}
      {renderAnimatedCheck()}

      {/* Texto animado */}
      <Animated.View
        style={{
          opacity: animations.fade,
          transform: [{ translateY: animationInterpolations.fade.translateY }],
        }}
        pointerEvents="none"
      >
        <Text className="mb-1 text-center text-[28px] font-extrabold text-slate-900">
          ¡Correo verificado!
        </Text>
        <Text className="mb-4 text-center text-[15px] text-slate-600">
          Tu cuenta ya está activa y lista para usar.
        </Text>
      </Animated.View>

      {/* Botón CTA */}
      <Button
        title={session ? 'Ir al inicio' : 'Iniciar sesión'}
        onPress={handleNavigation}
        disabled={isNavigating}
        loading={isNavigating}
        style={{
          alignSelf: 'stretch',
          marginTop: 8,
        }}
        accessibilityHint={
          session
            ? 'Navegar al dashboard principal'
            : 'Ir a la pantalla de inicio de sesión'
        }
      />

      {/* Mensaje adicional */}
      {!session && (
        <Text className="mt-4 text-center text-[12px] text-slate-400">
          Ahora puedes iniciar sesión con tu email y contraseña
        </Text>
      )}
    </>
  );

  // Main render
  return (
    <View className="flex-1 bg-surface">
      <View
        className="flex-1 items-center justify-center px-6"
        style={{
          paddingTop: Math.max(40, insets.top),
          paddingBottom: Math.max(40, insets.bottom),
        }}
      >
        {renderContent()}
      </View>
    </View>
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
    // Sombra elegante
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.12,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 6 },
      },
      android: {
        elevation: 3,
      },
    }),
  },
});
