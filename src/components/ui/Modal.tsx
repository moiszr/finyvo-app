// src/components/ui/AppModal.tsx
import React, { useEffect, useRef } from 'react';
import {
  Modal as RNModal,
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Platform,
} from 'react-native';
import { colors } from '@/design';
import { Button } from './Button';
import { Ionicons } from '@expo/vector-icons';

export interface AppModalProps {
  visible: boolean;
  onClose: () => void;

  title?: string;
  description?: string;
  children?: React.ReactNode;

  showClose?: boolean;
  dismissable?: boolean;

  primaryAction?: { label: string; onPress: () => void; loading?: boolean };
  secondaryAction?: { label: string; onPress: () => void };

  /** Máximo ancho del sheet (útil en iPad). Default: 640 */
  maxWidth?: number;

  testID?: string;
}

export function AppModal({
  visible,
  onClose,
  title,
  description,
  children,
  showClose = true,
  dismissable = true,
  primaryAction,
  secondaryAction,
  maxWidth = 640,
  testID,
}: AppModalProps) {
  const alpha = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.98)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(alpha, {
          toValue: 1,
          duration: 160,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          friction: 7,
          tension: 140,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // reset rápido para evitar parpadeos al reabrir
      alpha.setValue(0);
      scale.setValue(0.98);
    }
  }, [visible, alpha, scale]);

  const handleRequestClose = () => {
    if (dismissable) onClose();
  };

  return (
    <RNModal
      visible={visible}
      animationType="fade"
      transparent
      hardwareAccelerated
      onRequestClose={handleRequestClose}
      statusBarTranslucent
    >
      {/* Backdrop */}
      <Animated.View style={[styles.backdrop, { opacity: alpha }]}>
        {/* Cierra tocando afuera sólo si es dismissable */}
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={handleRequestClose}
          disabled={!dismissable}
          accessibilityRole="button"
          accessibilityLabel="Cerrar modal"
        />
      </Animated.View>

      {/* Contenedor centrado */}
      <View style={styles.center}>
        <Animated.View
          testID={testID}
          style={[
            styles.sheet,
            { transform: [{ scale }], maxWidth },
            Platform.OS === 'android' && styles.sheetAndroidShadow,
          ]}
        >
          {/* Close */}
          {showClose && (
            <Pressable
              onPress={onClose}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Cerrar modal"
              style={styles.closeBtn}
            >
              <Ionicons
                name="close"
                size={20}
                color={colors['text-secondary']}
              />
            </Pressable>
          )}

          {/* Header */}
          {!!title && (
            <Text className="pr-9 text-[18px] font-extrabold text-slate-900">
              {title}
            </Text>
          )}
          {!!description && (
            <Text className="mt-1.5 text-[14px] leading-5 text-slate-600">
              {description}
            </Text>
          )}

          {/* Body */}
          {children ? <View style={{ marginTop: 16 }}>{children}</View> : null}

          {/* Actions */}
          {(primaryAction || secondaryAction) && (
            <View style={styles.actions}>
              {secondaryAction && (
                <Button
                  title={secondaryAction.label}
                  variant="outline"
                  onPress={secondaryAction.onPress}
                  style={{ flex: 1 }}
                />
              )}
              {primaryAction && (
                <Button
                  title={primaryAction.label}
                  onPress={primaryAction.onPress}
                  loading={!!primaryAction.loading}
                  style={{ flex: 1 }}
                />
              )}
            </View>
          )}
        </Animated.View>
      </View>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15,23,42,0.45)', // slate-900 @ 45%
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24, // gutter
  },
  sheet: {
    alignSelf: 'center',
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,

    // sombra sutil y limpia (iOS)
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
  },
  sheetAndroidShadow: {
    elevation: 4,
  },
  closeBtn: {
    position: 'absolute',
    right: 16,
    top: 16,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor:
      Platform.OS === 'ios' ? 'rgba(60,60,67,0.1)' : 'transparent',
  },
  actions: {
    marginTop: 20,
    flexDirection: 'row',
    columnGap: 16,
  },
});
