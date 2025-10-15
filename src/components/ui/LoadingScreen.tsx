// src/components/ui/LoadingScreen.tsx
import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { colors } from '@/design';

type Variant = 'screen' | 'inline' | 'overlay';

interface LoadingScreenProps {
  message?: string;
  subMessage?: string;
  variant?: Variant;
  spinnerSize?: 'small' | 'large';
  spinnerColor?: string;
  testID?: string;
}

export function LoadingScreen({
  message = 'Cargando…',
  subMessage,
  variant = 'screen',
  spinnerSize = 'large',
  spinnerColor = colors.brand.navy,
  testID,
}: LoadingScreenProps) {
  if (variant === 'inline') {
    return (
      <View className="flex-row items-center" testID={testID}>
        <ActivityIndicator size={spinnerSize} color={spinnerColor} />
        {!!message && (
          <Text className="text-textSecondary ml-3 text-[15px]">{message}</Text>
        )}
      </View>
    );
  }

  if (variant === 'overlay') {
    return (
      <View
        className="absolute inset-0 items-center justify-center bg-black/10"
        pointerEvents="auto"
        testID={testID}
      >
        <View
          className="w-[200px] items-center rounded-2xl bg-surface px-5 py-6"
          style={styles.cardShadow}
        >
          <ActivityIndicator size={spinnerSize} color={spinnerColor} />
          {!!message && (
            <Text className="text-textPrimary mt-3 text-[15px] font-semibold">
              {message}
            </Text>
          )}
          {!!subMessage && (
            <Text className="text-textHint mt-1 text-center text-[13px]">
              {subMessage}
            </Text>
          )}
        </View>
      </View>
    );
  }

  // variant: 'screen'
  return (
    <View
      className="flex-1 items-center justify-center bg-surface px-6"
      testID={testID}
    >
      <ActivityIndicator size={spinnerSize} color={spinnerColor} />
      {!!message && (
        <Text className="text-textSecondary mt-4 text-center text-[16px]">
          {message}
        </Text>
      )}
      {!!subMessage && (
        <Text className="text-textHint mt-1 text-center text-[13px]">
          {subMessage}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  cardShadow: {
    // sombra sutil y limpia para el modal overlay
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
});
