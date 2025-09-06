// components/ui/Input.tsx
import React, { useMemo, useState, forwardRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TextInputProps,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  required?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  /** Si true y secureTextEntry, muestra icono de ojo para alternar */
  secureToggle?: boolean;
  /** Contenido a la derecha si NO usas secureToggle */
  rightAdornment?: React.ReactNode;
  onRightAdornmentPress?: () => void;
}

export const Input = forwardRef<TextInput, InputProps>(function Input(
  {
    label,
    error,
    required,
    style,
    containerStyle,
    secureTextEntry,
    secureToggle = false,
    rightAdornment,
    onRightAdornmentPress,
    ...rest
  },
  ref,
) {
  const startSecure = !!secureTextEntry;
  const [isSecure, setIsSecure] = useState(startSecure);
  const showToggle = secureToggle && startSecure;

  const borderColor = useMemo(() => (error ? '#EF4444' : '#E5E7EB'), [error]);

  return (
    <View style={containerStyle}>
      {!!label && (
        <Text style={styles.label}>
          {label} {required ? <Text style={styles.reqSymbol}>*</Text> : null}
        </Text>
      )}

      <View style={[styles.field, { borderColor }]}>
        <TextInput
          ref={ref}
          style={[
            styles.input,
            style,
            { paddingRight: showToggle || rightAdornment ? 44 : 14 },
          ]}
          placeholderTextColor="#9CA3AF"
          secureTextEntry={isSecure}
          {...rest}
        />

        <View style={styles.rightBox} pointerEvents="box-none">
          {showToggle ? (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={
                isSecure ? 'Mostrar contraseña' : 'Ocultar contraseña'
              }
              onPress={() => setIsSecure((v) => !v)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.iconBtn}
            >
              <Ionicons
                name={isSecure ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color="#94A3B8"
              />
            </TouchableOpacity>
          ) : rightAdornment ? (
            <TouchableOpacity
              disabled={!onRightAdornmentPress}
              onPress={onRightAdornmentPress}
              style={styles.iconBtn}
            >
              {rightAdornment}
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {!!error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
});

const styles = StyleSheet.create({
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  reqSymbol: { color: '#EF4444' },
  field: {
    borderWidth: 1,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    minHeight: 52,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  input: {
    paddingVertical: 12,
    fontSize: 16,
    color: '#0F172A',
  },
  rightBox: {
    position: 'absolute',
    right: 6,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  iconBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  error: {
    marginTop: 8,
    color: '#B91C1C',
    fontSize: 13,
  },
});
