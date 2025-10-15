// src/features/auth/components/Onboarding.tsx
import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui';
import { colors } from '@/design';

type Props = {
  onFinish: () => void;
  onSkip?: () => void;
};

export function Onboarding({ onFinish, onSkip }: Props) {
  return (
    <View className="flex-1 bg-surface">
      {/* Header con Skip opcional */}
      <View className="px-6 pt-12">
        {!!onSkip && (
          <Pressable
            onPress={onSkip}
            hitSlop={8}
            className="self-end rounded-xl border border-slate-200 bg-white px-3 py-1.5"
            android_ripple={{ color: 'rgba(0,0,0,0.06)', borderless: false }}
            accessibilityRole="button"
            accessibilityLabel="Saltar"
          >
            <Text className="text-[13px] font-semibold text-slate-600">
              Saltar
            </Text>
          </Pressable>
        )}
      </View>

      {/* Contenido central max-w para iPad */}
      <View className="flex-1 items-center justify-center px-6">
        <View className="w-full max-w-[520px] items-center">
          {/* Brand glyph */}
          <View
            className="mb-5 h-[72px] w-[72px] items-center justify-center rounded-[24px]"
            style={{ backgroundColor: colors.brand.navyBg }}
          >
            <Ionicons
              name="trending-up-outline"
              size={30}
              color={colors.brand.navy}
            />
          </View>

          {/* Título y subtítulo */}
          <Text className="text-center text-[28px] font-extrabold text-slate-900">
            Bienvenido a FINYVO
          </Text>
          <Text className="mt-2 text-center text-[15px] text-slate-600">
            Ordena tu dinero, crea hábitos y alcanza tus metas.
          </Text>

          {/* Tarjeta de highlights */}
          <View className="mt-6 w-full rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <FeatureRow
              icon="checkmark-circle"
              text="Registra transacciones al instante"
            />
            <FeatureRow
              icon="checkmark-circle"
              text="Categoriza y crea presupuestos"
            />
            <FeatureRow
              icon="checkmark-circle"
              text="Metas, suscripciones y recurrentes"
              last
            />
          </View>

          {/* CTAs */}
          <Button
            title="Comenzar"
            onPress={onFinish}
            style={{ marginTop: 16, alignSelf: 'stretch' }}
          />
          <Button
            title="Más tarde"
            variant="outline"
            onPress={onSkip || onFinish}
            style={{ marginTop: 10, alignSelf: 'stretch' }}
          />

          {/* Nota legal breve */}
          <Text className="mt-4 px-2 text-center text-[12px] text-slate-400">
            Al continuar aceptas nuestros Términos y Política de Privacidad.
          </Text>
        </View>
      </View>
    </View>
  );
}

function FeatureRow({
  icon,
  text,
  last,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
  last?: boolean;
}) {
  return (
    <View className={`flex-row items-start ${last ? '' : 'mb-3.5'}`}>
      <Ionicons
        name={icon}
        size={18}
        color={colors.brand.navy}
        style={{ marginTop: 2 }}
      />
      <Text className="ml-2 flex-1 text-[15px] text-slate-700">{text}</Text>
    </View>
  );
}

export default Onboarding;
