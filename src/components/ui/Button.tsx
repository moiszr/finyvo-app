// src/components/ui/Button.tsx
import React, { useRef, useCallback, ReactNode, useMemo } from 'react';
import {
  TouchableOpacity,
  TouchableOpacityProps,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
  StyleProp,
  View,
  Platform,
} from 'react-native';
import { colors } from '@/design';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface Props extends Omit<TouchableOpacityProps, 'onPress' | 'style'> {
  title: string;
  onPress?: () => void;

  variant?: ButtonVariant;
  size?: ButtonSize;

  loading?: boolean;
  disabled?: boolean;

  /** estilo externo y del texto (admite arrays / StyleProp) */
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;

  /** íconos opcionales */
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;

  /** que ocupe todo el ancho */
  fullWidth?: boolean;

  /** evita taps dobles dentro de una ventana */
  once?: boolean;
  debounceMs?: number;

  testID?: string;
}

/** tokens por tamaño (alineado con el Input) */
function sizeTokens(size: ButtonSize) {
  switch (size) {
    case 'sm':
      return { minH: 40, px: 16, textSize: 15, radius: 999 };
    case 'lg':
      return { minH: 56, px: 24, textSize: 17, radius: 999 };
    case 'md':
    default:
      return { minH: 52, px: 20, textSize: 16, radius: 999 };
  }
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  style,
  textStyle,
  leftIcon,
  rightIcon,
  fullWidth = false,
  once = false,
  debounceMs = 700,
  testID,
  ...touchableProps
}: Props) {
  const isDisabled = disabled || loading;
  const lastPressRef = useRef(0);

  const { minH, px, textSize, radius } = useMemo(
    () => sizeTokens(size),
    [size],
  );

  const handlePress = useCallback(() => {
    if (!onPress || isDisabled) return;
    if (once) {
      const now = Date.now();
      if (now - lastPressRef.current < debounceMs) return;
      lastPressRef.current = now;
    }
    requestAnimationFrame(onPress);
  }, [onPress, isDisabled, once, debounceMs]);

  /** colores por variante (usamos clases para layout/color + sombras con StyleSheet) */
  const containerClasses = useMemo(() => {
    switch (variant) {
      case 'secondary':
        return 'bg-surfaceMuted border-surfaceMuted';
      case 'outline':
        return 'bg-transparent border-brand-navy/30';
      case 'ghost':
        return 'bg-transparent border-transparent';
      case 'primary':
      default:
        return 'bg-brand-navy border-brand-navy';
    }
  }, [variant]);

  const textClasses = useMemo(() => {
    switch (variant) {
      case 'secondary':
      case 'outline':
      case 'ghost':
        return 'text-brand-navy';
      case 'primary':
      default:
        return 'text-surface';
    }
  }, [variant]);

  const spinnerColor =
    variant === 'primary' ? colors.raw.white : colors.brand.navy;

  /** sombra/elevación sutil para botones sólidos, elegante pero discreta */
  const shadowStyle =
    variant === 'primary' || variant === 'secondary'
      ? styles.elevated
      : undefined;

  return (
    <TouchableOpacity
      {...touchableProps}
      activeOpacity={0.85}
      disabled={isDisabled}
      onPress={handlePress}
      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
      testID={testID}
      className={[
        'flex-row items-center justify-center border',
        containerClasses,
        fullWidth ? 'w-full' : '',
      ].join(' ')}
      style={[
        {
          minHeight: minH,
          paddingHorizontal: px,
          borderRadius: radius,
        },
        shadowStyle,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {/* left icon */}
      {leftIcon ? <View style={styles.iconLeft}>{leftIcon}</View> : null}

      {/* content */}
      {loading ? (
        <ActivityIndicator size="small" color={spinnerColor} />
      ) : (
        <Text
          className={['font-bold', textClasses].join(' ')}
          style={[{ fontSize: textSize }, textStyle]}
          numberOfLines={1}
        >
          {title}
        </Text>
      )}

      {/* right icon (se oculta si loading para mantener balance visual) */}
      {!loading && rightIcon ? (
        <View style={styles.iconRight}>{rightIcon}</View>
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  iconLeft: {
    marginRight: 10,
  },
  iconRight: {
    marginLeft: 10,
  },
  disabled: {
    opacity: 0.55,
  },
  elevated: {
    // sombra sutil y limpia
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    ...(Platform.OS === 'android' ? { elevation: 2 } : null),
  },
});
