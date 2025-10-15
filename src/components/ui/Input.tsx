// components/ui/Input.tsx
import React, {
  useState,
  forwardRef,
  useCallback,
  useImperativeHandle,
} from 'react';
import {
  View,
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  Pressable,
  Platform,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { cn } from '@/utils/classnames';
import Animated, {
  useAnimatedStyle,
  withTiming,
  useSharedValue,
  withSequence,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';

const AnimatedView = Animated.createAnimatedComponent(View);

export interface InputProps extends Omit<TextInputProps, 'className'> {
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  className?: string;
  containerClassName?: string;
  labelClassName?: string;
  inputClassName?: string;
  errorClassName?: string;
  helperClassName?: string;
  /** Variante visual del input */
  variant?: 'outline' | 'filled' | 'ghost';
  /** Tamaño del input */
  size?: 'sm' | 'md' | 'lg';
  /** Si true y secureTextEntry, muestra icono de ojo para alternar */
  secureToggle?: boolean;
  /** Contenido a la izquierda del input */
  leftAdornment?: React.ReactNode;
  /** Contenido a la derecha del input */
  rightAdornment?: React.ReactNode;
  onRightAdornmentPress?: () => void;
  onLeftAdornmentPress?: () => void;
  /** Si true, muestra animación de focus */
  animated?: boolean;
  /** Si true, el input está deshabilitado */
  disabled?: boolean;
}

export const Input = forwardRef<TextInput, InputProps>(function Input(
  {
    label,
    error,
    helperText,
    required,
    className,
    containerClassName,
    labelClassName,
    inputClassName,
    errorClassName,
    helperClassName,
    variant = 'outline',
    size = 'md',
    secureTextEntry,
    secureToggle = false,
    leftAdornment,
    rightAdornment,
    onRightAdornmentPress,
    onLeftAdornmentPress,
    animated = true,
    disabled = false,
    editable = true,
    onFocus,
    onBlur,
    ...rest
  },
  ref,
) {
  const [isSecure, setIsSecure] = useState(!!secureTextEntry);
  const [isFocused, setIsFocused] = useState(false);
  const showToggle = secureToggle && secureTextEntry;
  const internalRef = React.useRef<TextInput>(null);

  // Exponer el ref
  useImperativeHandle(ref, () => internalRef.current!, []);

  // Animación para shake cuando hay error
  const shakeAnimation = useSharedValue(0);

  // Animación del borde - ahora con valores específicos para cada estado
  const borderColorAnimation = useSharedValue(error ? '#EF4444' : '#E5E7EB');

  // Combinar editable y disabled
  const isEditable = editable && !disabled;

  // Actualizar el color del borde cuando cambia el error o focus
  React.useEffect(() => {
    if (error) {
      // Si hay error, siempre rojo
      borderColorAnimation.value = withTiming('#EF4444', { duration: 200 });
    } else if (isFocused) {
      // Si no hay error y está enfocado, navy
      borderColorAnimation.value = withTiming('#1E3A8A', { duration: 200 });
    } else {
      // Si no hay error y no está enfocado, gris
      borderColorAnimation.value = withTiming('#E5E7EB', { duration: 200 });
    }
  }, [error, isFocused, borderColorAnimation]);

  // Manejar focus/blur
  const handleFocus = useCallback(
    (e: any) => {
      setIsFocused(true);
      onFocus?.(e);
    },
    [onFocus],
  );

  const handleBlur = useCallback(
    (e: any) => {
      setIsFocused(false);
      onBlur?.(e);
    },
    [onBlur],
  );

  // Shake animation cuando aparece un nuevo error
  React.useEffect(() => {
    if (error && animated) {
      shakeAnimation.value = withSequence(
        withTiming(-8, { duration: 60 }),
        withTiming(8, { duration: 60 }),
        withTiming(-8, { duration: 60 }),
        withTiming(8, { duration: 60 }),
        withTiming(0, { duration: 60 }),
      );
    }
  }, [error, animated, shakeAnimation]);

  // Estilos animados del contenedor
  const animatedContainerStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: shakeAnimation.value }],
    };
  });

  // Estilo animado del borde - ahora aplicado directamente
  const animatedFieldStyle = useAnimatedStyle(() => {
    return {
      borderColor: borderColorAnimation.value,
      borderWidth: 1,
    };
  });

  // Clases base según el tamaño
  const sizeClasses = {
    sm: {
      container: 'min-h-[48px]',
      input: 'text-[15px] py-3',
      label: 'text-[13px] mb-2',
      icon: 18,
      error: 'text-[12px]',
      helper: 'text-[12px]',
    },
    md: {
      container: 'min-h-[52px]',
      input: 'text-[16px] py-3.5',
      label: 'text-[14px] mb-2',
      icon: 20,
      error: 'text-[13px]',
      helper: 'text-[13px]',
    },
    lg: {
      container: 'min-h-[56px]',
      input: 'text-[17px] py-4',
      label: 'text-[15px] mb-2.5',
      icon: 22,
      error: 'text-[14px]',
      helper: 'text-[14px]',
    },
  };

  // Clases base del campo (sin bordes, esos van en el style animado)
  const getFieldBaseClasses = () => {
    const base = 'relative flex-row items-center overflow-hidden px-4';

    if (variant === 'filled') {
      if (error) {
        return cn(base, 'bg-red-50 dark:bg-red-900/20');
      }
      if (isFocused) {
        return cn(base, 'bg-gray-100 dark:bg-gray-700');
      }
      return cn(base, 'bg-gray-50 dark:bg-gray-800');
    }

    if (variant === 'ghost') {
      return cn(base, 'bg-transparent');
    }

    // outline
    return cn(base, 'bg-white dark:bg-gray-900');
  };

  const currentSize = sizeClasses[size];

  return (
    <AnimatedView
      style={animated ? animatedContainerStyle : undefined}
      className={cn('w-full', containerClassName)}
    >
      {/* Label */}
      {label && (
        <Text
          className={cn(
            'font-semibold text-gray-700 dark:text-gray-200',
            currentSize.label,
            labelClassName,
          )}
        >
          {label}
          {required && (
            <Text className="ml-1 text-red-500 dark:text-red-400">*</Text>
          )}
        </Text>
      )}

      {/* Campo de input con borde animado */}
      <Animated.View
        style={[
          animatedFieldStyle,
          {
            borderRadius: variant === 'ghost' ? 0 : 16,
            borderBottomWidth: variant === 'ghost' ? 1.5 : 1,
            borderTopWidth: variant === 'ghost' ? 0 : 1,
            borderLeftWidth: variant === 'ghost' ? 0 : 1,
            borderRightWidth: variant === 'ghost' ? 0 : 1,
          },
        ]}
        className={cn(
          getFieldBaseClasses(),
          currentSize.container,
          !isEditable && 'opacity-50',
          className,
        )}
      >
        {/* Left Adornment */}
        {leftAdornment && (
          <Pressable
            onPress={onLeftAdornmentPress}
            disabled={!onLeftAdornmentPress || !isEditable}
            className="pr-3"
          >
            {leftAdornment}
          </Pressable>
        )}

        {/* Input */}
        <TextInput
          ref={internalRef}
          className={cn(
            'flex-1 font-normal text-gray-900 dark:text-gray-100',
            currentSize.input,
            inputClassName,
          )}
          style={{
            includeFontPadding: false,
            textAlignVertical: 'center',
          }}
          placeholderTextColor={error ? '#F87171' : '#9CA3AF'}
          secureTextEntry={isSecure}
          editable={isEditable}
          onFocus={handleFocus}
          onBlur={handleBlur}
          {...rest}
        />

        {/* Right Adornment o Toggle */}
        {(showToggle || rightAdornment) && (
          <View className="pl-2">
            {showToggle ? (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={
                  isSecure ? 'Mostrar contraseña' : 'Ocultar contraseña'
                }
                onPress={() => setIsSecure((prev) => !prev)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                disabled={!isEditable}
                className="-mr-1 p-1.5"
              >
                <Ionicons
                  name={isSecure ? 'eye-off-outline' : 'eye-outline'}
                  size={currentSize.icon}
                  color={
                    !isEditable
                      ? '#9CA3AF'
                      : error
                        ? '#F87171'
                        : isFocused
                          ? '#1E3A8A'
                          : '#64748B'
                  }
                />
              </TouchableOpacity>
            ) : rightAdornment ? (
              <Pressable
                onPress={onRightAdornmentPress}
                disabled={!onRightAdornmentPress || !isEditable}
                className="-mr-1 p-1.5"
              >
                {rightAdornment}
              </Pressable>
            ) : null}
          </View>
        )}
      </Animated.View>

      {/* Error Message */}
      {error && (
        <Animated.Text
          entering={animated ? FadeIn.duration(200) : undefined}
          exiting={animated ? FadeOut.duration(150) : undefined}
          className={cn(
            'mt-2 font-medium text-red-600 dark:text-red-400',
            currentSize.error,
            errorClassName,
          )}
          style={{
            includeFontPadding: false,
          }}
        >
          {error}
        </Animated.Text>
      )}

      {/* Helper Text */}
      {helperText && !error && (
        <Text
          className={cn(
            'mt-2 text-gray-500 dark:text-gray-400',
            currentSize.helper,
            helperClassName,
          )}
          style={{
            includeFontPadding: false,
          }}
        >
          {helperText}
        </Text>
      )}
    </AnimatedView>
  );
});
