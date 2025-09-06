// components/ui/Button.tsx
import React, { useRef, useCallback } from 'react';
import {
  TouchableOpacity,
  TouchableOpacityProps,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
  StyleProp,
} from 'react-native';

interface Props extends Omit<TouchableOpacityProps, 'onPress' | 'style'> {
  title: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>; // 👈 StyleProp
  textStyle?: StyleProp<TextStyle>; // 👈 StyleProp
  /** Evita taps dobles dentro de una ventana de tiempo */
  once?: boolean;
  debounceMs?: number; // por defecto 700ms
}

const NAVY = '#0B2447';
const NAVY_40 = '#DDE3EE';

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  loading = false,
  disabled = false,
  style,
  textStyle,
  once = false,
  debounceMs = 700,
  ...touchableProps
}: Props) {
  const isDisabled = disabled || loading;
  const lastPressRef = useRef(0);

  const handlePress = useCallback(() => {
    if (!onPress || isDisabled) return;
    if (once) {
      const now = Date.now();
      if (now - lastPressRef.current < debounceMs) return;
      lastPressRef.current = now;
    }
    // Ejecuta en el próximo frame para una sensación más fluida
    requestAnimationFrame(onPress);
  }, [onPress, isDisabled, once, debounceMs]);

  return (
    <TouchableOpacity
      {...touchableProps}
      onPress={handlePress}
      activeOpacity={0.85}
      disabled={isDisabled}
      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
      style={[
        styles.base,
        styles[variant],
        styles[`${size}Size`],
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' ? '#FFFFFF' : NAVY}
          size="small"
        />
      ) : (
        <Text style={[styles.baseText, styles[`${variant}Text`], textStyle]}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  primary: { backgroundColor: NAVY, borderColor: NAVY },
  secondary: { backgroundColor: '#F3F4F6', borderColor: '#F3F4F6' },
  outline: { backgroundColor: 'transparent', borderColor: NAVY_40 },
  smallSize: { paddingHorizontal: 16, minHeight: 40 },
  mediumSize: { paddingHorizontal: 20, minHeight: 52 },
  largeSize: { paddingHorizontal: 24, minHeight: 56 },
  baseText: { fontWeight: '700', fontSize: 16 },
  primaryText: { color: '#FFFFFF' },
  secondaryText: { color: NAVY },
  outlineText: { color: NAVY },
  disabled: { opacity: 0.55 },
});
