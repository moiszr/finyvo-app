// src/components/ui/SocialButton.tsx
import React from 'react';
import {
  Pressable,
  ActivityIndicator,
  StyleSheet,
  StyleProp,
  ViewStyle,
  Platform,
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';
import { colors } from '@/design';

export type SocialProvider = 'apple' | 'google' | 'facebook';

export interface SocialButtonProps {
  provider: SocialProvider;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/** Logo oficial de Google (multicolor) */
function GoogleGlyph({ size = 22 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 18 18">
      <Path
        fill="#EA4335"
        d="M9 3.48c1.69 0 3.21.58 4.41 1.72l2.94-2.94C14.77.97 12.11 0 9 0 5.48 0 2.43 1.64.54 4.09l3.43 2.66C4.78 4.41 6.71 3.48 9 3.48z"
      />
      <Path
        fill="#4285F4"
        d="M17.64 9.2c0-.74-.07-1.48-.2-2.18H9v4.13h4.84c-.21 1.12-.85 2.06-1.81 2.7v2.23h2.92c1.71-1.58 2.69-3.91 2.69-7.08z"
      />
      <Path
        fill="#FBBC05"
        d="M3.97 10.75a5.52 5.52 0 0 1 0-3.5V5.02H1.05a9 9 0 0 0 0 7.96l2.92-2.23z"
      />
      <Path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.23c-.81.54-1.85.86-3.04.86-2.33 0-4.3-1.58-5.01-3.71H1.05v2.33A9 9 0 0 0 9 18z"
      />
    </Svg>
  );
}

export function SocialButton({
  provider,
  onPress,
  disabled = false,
  loading = false,
  style,
  testID,
}: SocialButtonProps) {
  const isDisabled = disabled || loading;

  // Iconos con tamaño fijo; el contenedor NO cambia.
  const ICON_SIZE = 22;
  const icons = {
    apple: <FontAwesome name="apple" size={ICON_SIZE} color="#000000" />,
    google: <GoogleGlyph size={ICON_SIZE} />,
    facebook: <FontAwesome name="facebook" size={ICON_SIZE} color="#1877F2" />,
  } as const;

  const labels = {
    apple: 'Continuar con Apple',
    google: 'Continuar con Google',
    facebook: 'Continuar con Facebook',
  } as const;

  const ripple =
    Platform.OS === 'android'
      ? { color: 'rgba(0,0,0,0.06)', radius: 27 } // 54/2
      : undefined;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      android_ripple={ripple}
      accessibilityRole="button"
      accessibilityLabel={labels[provider]}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      testID={testID}
      // Base visual con tokens
      className="h-[54px] w-[54px] items-center justify-center rounded-[16px] border border-border bg-surface"
      // Sombra/pressed/disabled + backups por si tokens fallan
      style={({ pressed }) => [
        styles.backupBase, // asegura borde+bg si falta el token
        styles.shadow, // sombra sutil, moderna
        pressed && styles.pressed,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={colors.textMuted} />
      ) : (
        icons[provider]
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // Backups idénticos a tu look: borde + blanco
  backupBase: {
    borderWidth: 1,
    borderColor: '#E5E7EB', // = tokens.colors.border
    backgroundColor: '#FFFFFF', // = tokens.colors.surface
    borderRadius: 16,
  },
  // Sombra muy sutil (iOS) + elevación (Android)
  shadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  // Feedback táctil
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  // Estado disabled
  disabled: {
    opacity: 0.5,
    backgroundColor: colors.surfaceMuted ?? '#F6F7FB',
  },
});

export default SocialButton;
