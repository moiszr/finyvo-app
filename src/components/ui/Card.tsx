// src/components/ui/Card.tsx
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ViewStyle,
  StyleProp,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { colors } from '@/design';

type CardVariant = 'elevated' | 'outline' | 'ghost';

export interface CardProps {
  variant?: CardVariant;
  onPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
  testID?: string;
  /** Máximo ancho para pantallas grandes (iPad / tablet). Default: 720 */
  maxWidth?: number;
}

/** Espaciado responsivo (iPad/tablet vs teléfono) */
function useResponsivePadding() {
  const { width } = useWindowDimensions();
  const isLarge = width >= 768; // iPad y tablets comunes
  // Mantiene look sobrio y aireado:
  return {
    horizontal: isLarge ? 20 : 16,
    vertical: isLarge ? 16 : 12,
    centerOnLarge: isLarge,
  };
}

export function Card({
  variant = 'outline',
  onPress,
  disabled,
  style,
  children,
  testID,
  maxWidth = 720,
}: CardProps) {
  const { horizontal, vertical, centerOnLarge } = useResponsivePadding();

  // Fondo sutil para que NO sea igual al background general
  const TINT_BG = colors['surface-muted'] ?? '#F6F7FB';

  // Bloques por variante
  const variantBlocks: StyleProp<ViewStyle>[] =
    variant === 'ghost'
      ? [styles.ghost]
      : [
          { backgroundColor: TINT_BG },
          variant === 'outline' ? styles.outline : null,
          variant === 'elevated' ? styles.elevated : null,
        ];

  const Container = (
    <View
      testID={testID}
      className="w-full"
      style={[
        styles.base,
        {
          paddingHorizontal: horizontal,
          paddingVertical: vertical,
          maxWidth,
          ...(centerOnLarge ? { alignSelf: 'center' } : null),
        },
        ...variantBlocks,
        disabled ? styles.disabled : null,
        style,
      ]}
    >
      {children}
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityState={{ disabled: !!disabled }}
        hitSlop={6}
        android_ripple={{ color: 'rgba(0,0,0,0.06)' }}
        style={({ pressed }) => [
          styles.pressable,
          pressed ? styles.pressed : undefined,
        ]}
      >
        {Container}
      </Pressable>
    );
  }

  return Container;
}

/* Subcomponentes (estructura profesional, tipografía cuidada) */
export function CardHeader({ children }: { children: React.ReactNode }) {
  return <View style={styles.header}>{children}</View>;
}

export function CardTitle({
  children,
  right,
}: {
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <View style={styles.titleRow}>
      <Text
        className="flex-1 text-[16px] font-extrabold text-slate-900"
        numberOfLines={1}
      >
        {children}
      </Text>
      {right ? <View style={styles.titleRight}>{right}</View> : null}
    </View>
  );
}

export function CardSubtitle({ children }: { children: React.ReactNode }) {
  return (
    <Text className="mt-0.5 text-[13px] text-slate-600" numberOfLines={2}>
      {children}
    </Text>
  );
}

export function CardContent({ children }: { children: React.ReactNode }) {
  return <View style={styles.content}>{children}</View>;
}

export function CardFooter({ children }: { children: React.ReactNode }) {
  return <View style={styles.footer}>{children}</View>;
}

export function CardDivider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  pressable: { width: '100%' },

  base: {
    width: '100%',
    borderRadius: 14,
    // sombra base MUY sutil para destacar siempre (incluso outline)
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },

  outline: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors['surface-muted'],
  },

  elevated: {
    backgroundColor: colors.surface,
    shadowColor: '#0F172A', // más limpia en displays claros
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
    borderWidth: 0,
  },

  ghost: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    shadowOpacity: 0, // ghost sin sombra
  },

  pressed: {
    opacity: Platform.OS === 'ios' ? 0.96 : 1,
    transform: [
      { scale: 0.998 },
      { translateY: Platform.OS === 'android' ? 0.5 : 0 },
    ],
  },

  disabled: { opacity: 0.6 },

  header: { marginBottom: 12 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 22,
    columnGap: 12,
  },
  titleRight: { marginLeft: 'auto' },

  content: { marginTop: 12 },

  footer: {
    marginTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: 12,
  },

  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginVertical: 12,
  },
});
